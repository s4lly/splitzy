import json
import os
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from models import db
from models.user_receipt import UserReceipt
from schemas.receipt import BoundingBox, FieldMetadata, RegularReceipt


class TestBoundingBoxCoercion:
    """BoundingBox should accept both dict and [x1,y1,x2,y2] list forms."""

    def test_dict_form_accepted(self):
        bb = BoundingBox(x=10, y=20, width=100, height=50)
        assert bb.x == 10 and bb.y == 20 and bb.width == 100 and bb.height == 50

    def test_list_form_converted(self):
        """Gemini sometimes returns [x1, y1, x2, y2] corner coordinates."""
        bb = BoundingBox.model_validate([67, 70, 397, 135])
        assert bb.x == 67
        assert bb.y == 70
        assert bb.width == 330   # 397 - 67
        assert bb.height == 65   # 135 - 70

    def test_tuple_form_converted(self):
        bb = BoundingBox.model_validate((10, 5, 15, 30))
        assert bb.x == 10 and bb.y == 5
        assert bb.width == 5 and bb.height == 25  # corner coercion: 15-10, 30-5

    def test_ambiguous_list_treated_as_origin_size(self):
        """When values don't unambiguously represent corners, treat as [x, y, w, h]."""
        bb = BoundingBox.model_validate([100, 100, 100, 100])
        assert bb.x == 100 and bb.y == 100
        assert bb.width == 100 and bb.height == 100

    def test_origin_size_list_not_corrupted(self):
        """A list already in [x, y, width, height] where w < x should pass through."""
        bb = BoundingBox.model_validate([200, 300, 80, 20])
        assert bb.x == 200 and bb.y == 300
        assert bb.width == 80 and bb.height == 20

    def test_list_wrong_length_raises(self):
        with pytest.raises(ValidationError):
            BoundingBox.model_validate([10, 20, 30])

    def test_field_metadata_with_list_bbox(self):
        """End-to-end: FieldMetadata should validate when bbox is a list."""
        entry = {
            "field_name": "merchant",
            "bbox": [67, 70, 397, 135],
            "is_pii": False,
            "pii_category": None,
        }
        fm = FieldMetadata.model_validate(entry)
        assert fm.bbox.x == 67
        assert fm.bbox.y == 70
        assert fm.bbox.width == 330   # 397 - 67
        assert fm.bbox.height == 65   # 135 - 70


def test_health_check(test_client):
    """
    GIVEN a Flask application
    WHEN the '/api/health' page is requested
    THEN check that a '200' status code is returned
    """
    response = test_client.get("/api/health")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "healthy"


@patch("blueprints.receipts.upload_to_blob_storage")
@patch("blueprints.receipts.ImageAnalyzer")
def test_analyze_receipt(
    mock_image_analyzer, mock_blob_upload, test_client, new_user, mock_receipt_data
):
    """
    GIVEN a Flask application
    WHEN the '/api/analyze-receipt' page is sent a POST request with a file
    THEN check that a '200' status code is returned and the receipt data is in the response
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session["user_id"] = new_user.id

    # Mock the blob storage upload to return a fake URL
    mock_blob_upload.return_value = "https://fake-blob-storage.com/fake-image-url.jpg"

    # Mock the ImageAnalyzer result
    mock_analyzer_instance = mock_image_analyzer.return_value
    mock_analyzer_instance.analyze_image.return_value = RegularReceipt.model_validate(
        mock_receipt_data
    )

    # Create a dummy file to upload
    upload_folder = test_client.application.config.get("UPLOAD_FOLDER", "/tmp")
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    file_path = os.path.join(upload_folder, "receipt.jpg")
    with open(file_path, "w") as f:
        f.write("dummy receipt image")

    with open(file_path, "rb") as f:
        response = test_client.post(
            "/api/analyze-receipt",
            data={"file": (f, "receipt.jpg")},
            content_type="multipart/form-data",
        )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["is_receipt"] is True
    assert data["receipt_data"]["merchant"] == mock_receipt_data["merchant"]

    os.remove(file_path)


class TestReceiptPreview:
    """GET /api/receipts/<id>/preview — public endpoint for OG link previews."""

    def _make_receipt(self, **overrides):
        defaults = dict(
            merchant="Trader Joe's",
            date=date(2026, 4, 12),
            total=Decimal("48.21"),
        )
        defaults.update(overrides)
        receipt = UserReceipt(**defaults)
        db.session.add(receipt)
        db.session.commit()
        return receipt

    def test_returns_merchant_date_total(self, test_app, test_client):
        with test_app.app_context():
            receipt = self._make_receipt()
            response = test_client.get(f"/api/receipts/{receipt.id}/preview")

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == {
            "merchant": "Trader Joe's",
            "date": "2026-04-12",
            "total": 48.21,
        }
        assert "public" in response.headers.get("Cache-Control", "")

    def test_no_auth_required(self, test_app, test_client):
        with test_app.app_context():
            receipt = self._make_receipt()
            response = test_client.get(f"/api/receipts/{receipt.id}/preview")

        assert response.status_code == 200

    def test_unknown_id_returns_404(self, test_client):
        response = test_client.get("/api/receipts/999999/preview")
        assert response.status_code == 404

    def test_soft_deleted_returns_404(self, test_app, test_client):
        with test_app.app_context():
            receipt = self._make_receipt(
                deleted_at=datetime.now(timezone.utc)
            )
            response = test_client.get(f"/api/receipts/{receipt.id}/preview")

        assert response.status_code == 404

    def test_null_merchant_and_date_serialized_as_null(self, test_app, test_client):
        with test_app.app_context():
            receipt = self._make_receipt(merchant=None, date=None)
            response = test_client.get(f"/api/receipts/{receipt.id}/preview")

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["merchant"] is None
        assert data["date"] is None
