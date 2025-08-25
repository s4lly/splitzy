from __future__ import annotations
from typing import List, Optional, Literal
from decimal import Decimal
from datetime import date as date_type, datetime
from pydantic import BaseModel, Field, ConfigDict, AliasChoices, model_validator

class LineItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    name: str
    quantity: int = Field(1, ge=1)
    price_per_item: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total_price: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    assignments: List[str] = Field(default_factory=list)
    
    @model_validator(mode="after")
    def _compute_total_price(self):
        # Only compute if not explicitly provided
        if self.total_price == 0 and self.price_per_item is not None:
            self.total_price = (self.price_per_item * self.quantity).quantize(Decimal("0.01"))
        else:
            # Normalize any provided total_price to 2 decimals
            self.total_price = Decimal(self.total_price).quantize(Decimal("0.01"))
        self.price_per_item = Decimal(self.price_per_item).quantize(Decimal("0.01"))
        return self

class LineItemResponse(LineItem):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    created_at: Optional[datetime] = None

class TransportationTicket(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    document_type: Literal["transportation_ticket"] = "transportation_ticket"
    is_receipt: bool = True
    carrier: Optional[str] = None
    ticket_number: Optional[str] = None
    date: Optional[date_type] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    passenger: Optional[str] = None
    class_: Optional[str] = Field(None, alias='class', validation_alias=AliasChoices('class_', 'class'))
    fare: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    currency: Optional[str] = None
    taxes: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    
    @model_validator(mode="after")
    def _reconcile_totals(self):
        # Prefer explicit total; else compute
        computed = (self.fare or Decimal("0")) + (self.taxes or Decimal("0"))
        if not self.total or self.total == 0:
            self.total = computed.quantize(Decimal("0.01"))
        return self

class RegularReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    is_receipt: bool = True
    merchant: Optional[str] = None
    date: Optional[str] = None
    line_items: List[LineItem] = Field(default_factory=list)
    subtotal: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    tax: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    tip: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    gratuity: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    payment_method: Optional[str] = None
    tax_included_in_items: bool = False
    display_subtotal: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    items_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    pretax_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    posttax_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    final_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))

    @model_validator(mode="after")
    def _recompute_aggregates(self):
        items_sum = sum((li.total_price for li in self.line_items), start=Decimal("0"))
        # Fill missing or zeroed derived fields
        self.items_total = (self.items_total or items_sum).quantize(Decimal("0.01"))
        if not self.subtotal or self.subtotal == 0:
            self.subtotal = (items_sum if not self.tax_included_in_items else (items_sum - self.tax)).quantize(Decimal("0.01"))
        self.pretax_total = (self.subtotal).quantize(Decimal("0.01"))
        self.posttax_total = (self.pretax_total + self.tax).quantize(Decimal("0.01"))
        # Prefer explicit total/final_total if provided, else compute
        computed_total = (self.posttax_total + self.tip + self.gratuity).quantize(Decimal("0.01"))
        if not self.total or self.total == 0:
            self.total = computed_total
        if not self.final_total or self.final_total == 0:
            self.final_total = self.total
        return self

class RegularReceiptResponse(RegularReceipt):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    line_items: List[LineItemResponse]

class NotAReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    is_receipt: bool = False

# New model for creating UserReceipt instances from Pydantic models
class UserReceiptCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    # Required fields
    user_id: Optional[int] = None
    image_path: Optional[str] = None
    
    # Receipt fields
    is_receipt: bool = True
    document_type: Optional[str] = None
    
    # Regular receipt fields
    merchant: Optional[str] = None
    date: Optional[str] = None
    subtotal: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    tax: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    tip: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    gratuity: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    payment_method: Optional[str] = None
    tax_included_in_items: bool = False
    display_subtotal: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    items_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    pretax_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    posttax_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    final_total: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    
    # Transportation ticket fields
    # consider adding fields for transportation ticket

# New model for creating ReceiptLineItem instances from Pydantic models
class ReceiptLineItemCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    # Required fields
    receipt_id: Optional[int] = None
    
    # Line item fields
    name: Optional[str] = None
    quantity: int = Field(1, ge=1)
    price_per_item: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    total_price: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    assignments: List[str] = Field(default_factory=list)
