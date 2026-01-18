from __future__ import annotations

from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    model_validator,
)


# Base class for common decimal validation logic
class DecimalValidatorMixin:
    """Mixin for models that need safe decimal validation"""

    def safe_decimal(self, value) -> Decimal:
        """Convert None values to Decimal("0.00") for calculations"""
        if value is None:
            return Decimal("0.00")
        return Decimal(value)


# Mixin for line item decimal serialization
class LineItemDecimalSerializerMixin:
    """Mixin for models that need to serialize line item Decimal fields to float for frontend"""

    @field_serializer("price_per_item", "total_price")
    def _serialize_line_item_decimals(self, v: Decimal) -> float:
        return float(v)


# Mixin for receipt decimal serialization
class ReceiptDecimalSerializerMixin:
    """Mixin for models that need to serialize receipt Decimal fields to float for frontend"""

    @field_serializer(
        "subtotal",
        "tax",
        "tip",
        "gratuity",
        "total",
        "display_subtotal",
        "items_total",
        "pretax_total",
        "posttax_total",
        "final_total",
    )
    def _serialize_receipt_decimals(self, v: Optional[Decimal]) -> float:
        if v is None:
            return 0.0
        return float(v)


# Mixin for transportation decimal serialization
class TransportationDecimalSerializerMixin:
    """Mixin for models that need to serialize transportation Decimal fields to float for frontend"""

    @field_serializer("fare", "taxes", "total")
    def _serialize_transportation_decimals(self, v: Optional[Decimal]) -> float:
        if v is None:
            return 0.0
        return float(v)


# ----


class LineItem(BaseModel, LineItemDecimalSerializerMixin):
    model_config = ConfigDict(from_attributes=True)

    name: str
    quantity: float = Field(1.0, ge=0.0)
    price_per_item: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total_price: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    assignments: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _compute_total_price(self):
        # Only compute if not explicitly provided
        if self.total_price == Decimal("0"):
            # Convert quantity to Decimal for calculation
            quantity_decimal = Decimal(str(self.quantity))
            self.total_price = (self.price_per_item * quantity_decimal).quantize(
                Decimal("0.01")
            )
        else:
            # Normalize any provided total_price to 2 decimals
            self.total_price = Decimal(self.total_price).quantize(Decimal("0.01"))
        self.price_per_item = Decimal(self.price_per_item).quantize(Decimal("0.01"))
        return self


class LineItemResponse(LineItem):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: Optional[datetime] = None


# ----


# Base class for transportation ticket fields
class TransportationTicketBase(
    BaseModel, TransportationDecimalSerializerMixin, DecimalValidatorMixin
):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    document_type: Literal["transportation_ticket"] = "transportation_ticket"
    is_receipt: bool = True
    carrier: Optional[str] = None
    ticket_number: Optional[str] = None
    date: Optional[date_type] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    passenger: Optional[str] = None
    class_: Optional[str] = Field(
        None, alias="class", validation_alias=AliasChoices("class_", "class")
    )
    fare: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    currency: Optional[str] = None
    taxes: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))

    @model_validator(mode="after")
    def _reconcile_totals(self):
        # Normalize components to cents
        self.fare = self.safe_decimal(self.fare).quantize(Decimal("0.01"))
        self.taxes = self.safe_decimal(self.taxes).quantize(Decimal("0.01"))
        # Prefer explicit total; else compute
        if not self.total or self.total == 0:
            self.total = (self.fare + self.taxes).quantize(Decimal("0.01"))
        else:
            self.total = self.safe_decimal(self.total).quantize(Decimal("0.01"))
        return self


class TransportationTicket(TransportationTicketBase):
    pass


# ----


# Base class for regular receipt fields
class RegularReceiptBase(
    BaseModel, ReceiptDecimalSerializerMixin, DecimalValidatorMixin
):
    model_config = ConfigDict(from_attributes=True)

    is_receipt: bool = True
    merchant: Optional[str] = None
    date: Optional[date_type] = None
    line_items: List[LineItem] = Field(
        default_factory=list, exclude=True
    )  # Exclude from database creation
    subtotal: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    tax: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    tip: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    gratuity: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    payment_method: Optional[str] = None
    tax_included_in_items: Optional[bool] = False
    display_subtotal: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    items_total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    pretax_total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    posttax_total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))
    final_total: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"))

    @model_validator(mode="after")
    def _recompute_aggregates(self):
        items_sum = sum((li.total_price for li in self.line_items), start=Decimal("0"))

        # Fill missing or zeroed derived fields
        self.items_total = self.safe_decimal(self.items_total or items_sum).quantize(
            Decimal("0.01")
        )

        if not self.subtotal or self.subtotal == 0:
            tax_value = self.safe_decimal(self.tax)
            self.subtotal = (
                items_sum if not self.tax_included_in_items else (items_sum - tax_value)
            ).quantize(Decimal("0.01"))

        self.subtotal = self.safe_decimal(self.subtotal)
        if self.subtotal < Decimal("0.00"):
            self.subtotal = Decimal("0.00")

        self.pretax_total = self.subtotal.quantize(Decimal("0.01"))
        tax_value = self.safe_decimal(self.tax)
        self.posttax_total = (self.pretax_total + tax_value).quantize(Decimal("0.01"))

        if self.posttax_total < Decimal("0.00"):
            self.posttax_total = Decimal("0.00")

        # Prefer explicit total/final_total if provided, else compute
        tip_value = self.safe_decimal(self.tip)
        gratuity_value = self.safe_decimal(self.gratuity)
        computed_total = (self.posttax_total + tip_value + gratuity_value).quantize(
            Decimal("0.01")
        )

        if not self.total or self.total == 0:
            self.total = computed_total
        if not self.final_total or self.final_total == 0:
            self.final_total = self.total

        # Normalize inputs to 2 decimals
        for attr in (
            "subtotal",
            "tax",
            "tip",
            "gratuity",
            "total",
            "display_subtotal",
            "items_total",
            "pretax_total",
            "posttax_total",
            "final_total",
        ):
            value = getattr(self, attr)
            if value is not None:
                setattr(self, attr, self.safe_decimal(value).quantize(Decimal("0.01")))
        return self


class RegularReceipt(RegularReceiptBase):
    # Override line_items to include them in API responses
    line_items: List[LineItem] = Field(default_factory=list)


class RegularReceiptResponse(RegularReceipt):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_visibility: Literal["public", "owner_only"] = "public"
    line_items: List[LineItemResponse]


# ----


class NotAReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_receipt: bool = False


# ----


# Base class for database creation models
class DatabaseCreateBase(BaseModel, DecimalValidatorMixin):
    model_config = ConfigDict(from_attributes=True)

    # Common fields for database creation
    # Note: user_id and image_path are set programmatically, not from Pydantic models
    is_receipt: bool = True
    document_type: Optional[str] = None


# Model for creating UserReceipt instances from Pydantic models
class UserReceiptCreate(DatabaseCreateBase, RegularReceiptBase):
    # Add fields that are set programmatically but needed for database creation
    user_id: Optional[int] = None
    image_path: Optional[str] = None

    # Transportation ticket fields can be added here if needed
    # consider adding fields for transportation ticket


# Model for creating ReceiptLineItem instances from Pydantic models
class ReceiptLineItemCreate(BaseModel, LineItemDecimalSerializerMixin):
    model_config = ConfigDict(from_attributes=True)

    # Line item fields (receipt_id is set by SQLAlchemy relationship)
    name: Optional[str] = None
    quantity: float = Field(1.0, ge=0.0)
    price_per_item: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total_price: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    assignments: List[str] = Field(default_factory=list)
