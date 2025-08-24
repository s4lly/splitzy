from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class LineItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    name: str
    quantity: int = 1
    price_per_item: float = 0.0
    total_price: float = 0.0
    assignments: List[str] = Field(default_factory=list)

class LineItemResponse(LineItem):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    created_at: Optional[datetime] = None

class TransportationTicket(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    document_type: str = "transportation_ticket"
    is_receipt: bool = True
    carrier: Optional[str] = None
    ticket_number: Optional[str] = None
    date: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    passenger: Optional[str] = None
    class_: Optional[str] = Field(None, alias='class')
    fare: float = 0.0
    currency: Optional[str] = None
    taxes: float = 0.0
    total: float = 0.0

class RegularReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    is_receipt: bool = True
    merchant: Optional[str] = None
    date: Optional[str] = None
    line_items: List[LineItem] = Field(default_factory=list)
    subtotal: float = 0.0
    tax: float = 0.0
    tip: float = 0.0
    gratuity: float = 0.0
    total: float = 0.0
    payment_method: Optional[str] = None
    tax_included_in_items: bool = False
    display_subtotal: float = 0.0
    items_total: float = 0.0
    pretax_total: float = 0.0
    posttax_total: float = 0.0
    final_total: float = 0.0

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
    subtotal: float = 0.0
    tax: float = 0.0
    tip: float = 0.0
    gratuity: float = 0.0
    total: float = 0.0
    payment_method: Optional[str] = None
    tax_included_in_items: bool = False
    display_subtotal: float = 0.0
    items_total: float = 0.0
    pretax_total: float = 0.0
    posttax_total: float = 0.0
    final_total: float = 0.0
    
    # Transportation ticket fields
    carrier: Optional[str] = None
    ticket_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    passenger: Optional[str] = None
    class_: Optional[str] = None
    fare: float = 0.0
    currency: Optional[str] = None
    taxes: float = 0.0

# New model for creating ReceiptLineItem instances from Pydantic models
class ReceiptLineItemCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    # Required fields
    receipt_id: Optional[int] = None
    
    # Line item fields
    name: Optional[str] = None
    quantity: int = 1
    price_per_item: float = 0.0
    total_price: float = 0.0
    assignments: List[str] = Field(default_factory=list)
