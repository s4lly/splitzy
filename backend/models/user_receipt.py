from sqlalchemy import Numeric, text
from sqlalchemy.dialects.postgresql import JSONB

from models import db


class UserReceipt(db.Model):
    __tablename__ = "user_receipts"

    id = db.Column(
        db.BigInteger, primary_key=True
    )  # Using BigInteger for better scalability
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    image_path = db.Column(
        db.Text, nullable=True
    )  # Using Text for unlimited length URLs
    created_at = db.Column(
        db.TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )

    # Denormalized fields extracted from receipt_data (RegularReceipt / TransportationTicket)
    is_receipt = db.Column(db.Boolean, nullable=True, default=True)
    document_type = db.Column(db.Text, nullable=True)

    # Regular receipt fields
    merchant = db.Column(db.Text, nullable=True)  # Using Text for unlimited length
    date = db.Column(db.Date, nullable=True)  # Using proper Date type
    subtotal = db.Column(Numeric(12, 2), nullable=True, default=0)
    tax = db.Column(Numeric(12, 2), nullable=True, default=0)
    tip = db.Column(Numeric(12, 2), nullable=True, default=0)
    gratuity = db.Column(Numeric(12, 2), nullable=True, default=0)
    total = db.Column(Numeric(12, 2), nullable=True, default=0)
    payment_method = db.Column(db.Text, nullable=True)
    tax_included_in_items = db.Column(db.Boolean, nullable=True, default=False)
    display_subtotal = db.Column(Numeric(12, 2), nullable=True, default=0)
    items_total = db.Column(Numeric(12, 2), nullable=True, default=0)
    pretax_total = db.Column(Numeric(12, 2), nullable=True, default=0)
    posttax_total = db.Column(Numeric(12, 2), nullable=True, default=0)
    final_total = db.Column(Numeric(12, 2), nullable=True, default=0)

    # Transportation ticket-specific fields
    carrier = db.Column(db.Text, nullable=True)  # Using Text for unlimited length
    ticket_number = db.Column(db.Text, nullable=True)  # Using Text for unlimited length
    origin = db.Column(db.Text, nullable=True)  # Using Text for unlimited length
    destination = db.Column(db.Text, nullable=True)  # Using Text for unlimited length
    passenger = db.Column(db.Text, nullable=True)  # Using Text for unlimited length
    class_ = db.Column("class", db.Text, nullable=True)
    fare = db.Column(Numeric(12, 2), nullable=True, default=0)
    currency = db.Column(db.Text, nullable=True)
    taxes = db.Column(Numeric(12, 2), nullable=True, default=0)

    # Additional metadata field for flexible data storage
    receipt_metadata = db.Column(
        JSONB, nullable=True, default=dict
    )  # Using JSONB for better performance and querying

    user = db.relationship("User", backref=db.backref("receipts", lazy=True))

    # Relationship to normalized line items
    line_items = db.relationship(
        "ReceiptLineItem",
        backref="receipt",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ReceiptLineItem.id",
    )

    def __repr__(self):
        return f"<UserReceipt {self.id}>"
