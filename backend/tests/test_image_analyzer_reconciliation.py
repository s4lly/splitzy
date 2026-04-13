"""
Tests for the receipt totals reconciliation logic in image_analyzer.py.

These tests mock `genai.GenerativeModel.generate_content` directly so that
the full stack — _analyze_image_with_gemini → _process_response →
_with_structured_output → _validate_totals — is exercised.
"""

import json
import logging
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from image_analyzer import (
    RECONCILIATION_TOLERANCE,
    ImageAnalyzer,
    _ReconciliationResult,
    _SuspectItem,
)
from schemas.receipt import RegularReceipt


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gemini_response(payload: dict) -> SimpleNamespace:
    """Wrap a dict in a fake Gemini response object."""
    return SimpleNamespace(text=json.dumps(payload))


def _good_receipt() -> dict:
    """A receipt where sum(total_price) == subtotal."""
    return {
        "is_receipt": True,
        "merchant": "Good Cafe",
        "date": "2025-01-01",
        "line_items": [
            {"name": "Sandwich", "quantity": 1, "price_per_item": 10.00, "total_price": 10.00},
            {"name": "Soda", "quantity": 2, "price_per_item": 6.00, "total_price": 12.00},
        ],
        "subtotal": 22.00,
        "tax": 2.00,
        "tip": 0.00,
        "total": 24.00,
        "tax_included_in_items": False,
        "display_subtotal": 22.00,
        "items_total": 22.00,
        "pretax_total": 22.00,
        "posttax_total": 24.00,
        "final_total": 24.00,
    }


def _bad_receipt() -> dict:
    """
    A receipt with the classic unit-vs-extended misread:
    'Soda' qty 2 at unit $12 (should be $6), giving total_price=24 instead of 12.
    sum(total_price) = 34 but printed subtotal = 22.
    """
    return {
        "is_receipt": True,
        "merchant": "Bad Cafe",
        "date": "2025-01-01",
        "line_items": [
            {"name": "Sandwich", "quantity": 1, "price_per_item": 10.00, "total_price": 10.00},
            {"name": "Soda", "quantity": 2, "price_per_item": 12.00, "total_price": 24.00},
        ],
        "subtotal": 22.00,
        "tax": 2.00,
        "tip": 0.00,
        "total": 24.00,
        "tax_included_in_items": False,
        "display_subtotal": 22.00,
        "items_total": 22.00,
        "pretax_total": 22.00,
        "posttax_total": 24.00,
        "final_total": 24.00,
    }


def _corrected_receipt() -> dict:
    """What Gemini returns on a successful retry."""
    return _good_receipt() | {"merchant": "Bad Cafe"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_configure():
    """Skip the real Google API key check."""
    with patch("image_analyzer._configured", True):
        yield


@pytest.fixture()
def analyzer():
    return ImageAnalyzer()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestValidateTotals:
    """Unit tests for _validate_totals directly."""

    def test_ok_when_sum_matches(self, analyzer):
        model = RegularReceipt.model_validate(_good_receipt())
        result = analyzer._validate_totals(model)
        assert result.ok is True
        assert result.delta == Decimal("0")

    def test_not_ok_when_sum_differs_by_more_than_tolerance(self, analyzer):
        model = RegularReceipt.model_validate(_bad_receipt())
        result = analyzer._validate_totals(model)
        assert result.ok is False
        # items_sum = 10 + 24 = 34; subtotal = 22 → delta = 12
        assert result.delta == Decimal("12.00")

    def test_ok_within_tolerance(self, analyzer):
        """A penny rounding difference should pass."""
        receipt = _good_receipt()
        receipt["subtotal"] = 22.03
        receipt["display_subtotal"] = 22.03
        model = RegularReceipt.model_validate(receipt)
        result = analyzer._validate_totals(model)
        assert result.ok is True

    def test_suspect_identified(self, analyzer):
        model = RegularReceipt.model_validate(_bad_receipt())
        result = analyzer._validate_totals(model)
        assert result.suspect is not None
        assert result.suspect.name == "Soda"

    def test_delta_is_non_negative_when_items_sum_below_subtotal(self, analyzer):
        """
        delta must be absolute (non-negative) even when items_sum < printed_subtotal.

        Regression guard: returning `items_sum - printed_subtotal` without .copy_abs()
        would yield -12.00 here, breaking any caller that expects a non-negative delta.
        """
        receipt = _good_receipt()
        # Remove one item so items_sum (10) falls below the printed subtotal (22).
        receipt["line_items"] = [
            {"name": "Sandwich", "quantity": 1, "price_per_item": 10.00, "total_price": 10.00},
        ]
        model = RegularReceipt.model_validate(receipt)
        result = analyzer._validate_totals(model)

        assert result.ok is False
        assert result.delta >= Decimal("0"), (
            f"delta should be non-negative (absolute), got {result.delta}"
        )
        assert result.delta == Decimal("12.00")


class TestBuildRetryHint:
    """Unit tests for the retry hint builder."""

    def test_hint_mentions_delta(self, analyzer):
        result = _ReconciliationResult(
            ok=False,
            items_sum=Decimal("34.00"),
            printed_subtotal=Decimal("22.00"),
            delta=Decimal("12.00"),
        )
        hint = analyzer._build_retry_hint(result)
        assert "34" in hint
        assert "22" in hint
        assert "12" in hint

    def test_hint_mentions_suspect(self, analyzer):
        # Classic misread: printed "$12" was extracted as unit_price=12, total_price=24.
        # Corrected: printed $12 is the extended total, so unit_price=6 (12/2).
        result = _ReconciliationResult(
            ok=False,
            items_sum=Decimal("34.00"),
            printed_subtotal=Decimal("22.00"),
            delta=Decimal("12.00"),
            suspect=_SuspectItem(
                name="Soda",
                qty=2.0,
                unit_price=Decimal("12.00"),  # the value printed on the receipt
                total_price=Decimal("24.00"),  # what the model computed (wrong)
            ),
        )
        hint = analyzer._build_retry_hint(result)
        assert "Soda" in hint
        # Corrected unit = 12 / 2 = 6.00
        assert "6.00" in hint


class TestAnalyzeImageWithGemini:
    """
    Integration-level tests for the two-pass retry flow.
    Mocks genai.GenerativeModel so no real API calls are made.
    """

    IMAGE_BYTES = b"fake-image-data"

    def _make_model_mock(self, responses: list):
        """Return a mock that delivers *responses* in order on successive calls."""
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = responses
        return mock_model

    @patch("image_analyzer.genai.GenerativeModel")
    def test_happy_path_no_retry(self, mock_gm_cls, analyzer):
        """When totals reconcile on the first pass, generate_content is called once."""
        mock_gm_cls.return_value = self._make_model_mock(
            [_gemini_response(_good_receipt())]
        )
        result = analyzer._analyze_image_with_gemini(self.IMAGE_BYTES)

        mock_gm_cls.return_value.generate_content.assert_called_once()
        assert isinstance(result, RegularReceipt)
        assert result.merchant == "Good Cafe"

    @patch("image_analyzer.genai.GenerativeModel")
    def test_retry_on_mismatch_and_succeeds(self, mock_gm_cls, analyzer):
        """Mismatch on first pass triggers retry; corrected response is used."""
        mock_gm_cls.return_value = self._make_model_mock(
            [
                _gemini_response(_bad_receipt()),
                _gemini_response(_corrected_receipt()),
            ]
        )
        result = analyzer._analyze_image_with_gemini(self.IMAGE_BYTES)

        assert mock_gm_cls.return_value.generate_content.call_count == 2
        assert isinstance(result, RegularReceipt)
        # After retry the soda item should have the corrected unit price
        soda = next(i for i in result.line_items if i.name == "Soda")
        assert soda.total_price == Decimal("12.00")
        assert soda.price_per_item == Decimal("6.00")

    @patch("image_analyzer.genai.GenerativeModel")
    def test_unreconciled_after_retry_falls_back_to_first(self, mock_gm_cls, analyzer, caplog):
        """When both passes fail to reconcile, the first response is returned (not raised)."""
        mock_gm_cls.return_value = self._make_model_mock(
            [
                _gemini_response(_bad_receipt()),
                _gemini_response(_bad_receipt()),
            ]
        )
        with caplog.at_level(logging.ERROR, logger="image_analyzer"):
            result = analyzer._analyze_image_with_gemini(self.IMAGE_BYTES)

        assert mock_gm_cls.return_value.generate_content.call_count == 2
        assert isinstance(result, RegularReceipt)
        assert "Unreconciled after retry" in caplog.text

    @patch("image_analyzer.RECEIPT_RETRY_ON_MISMATCH", False)
    @patch("image_analyzer.genai.GenerativeModel")
    def test_retry_disabled_no_second_call(self, mock_gm_cls, analyzer, caplog):
        """When RECEIPT_RETRY_ON_MISMATCH is False, mismatches are not retried."""
        mock_gm_cls.return_value = self._make_model_mock(
            [_gemini_response(_bad_receipt())]
        )
        with caplog.at_level(logging.WARNING, logger="image_analyzer"):
            result = analyzer._analyze_image_with_gemini(self.IMAGE_BYTES)

        mock_gm_cls.return_value.generate_content.assert_called_once()
        # No retry warning; mismatch was silently accepted
        assert "retrying" not in caplog.text
        assert isinstance(result, RegularReceipt)
