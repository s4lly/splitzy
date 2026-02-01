import uuid

from sqlalchemy import Numeric, text
from sqlalchemy.dialects.postgresql import UUID

from models import db


class ReceiptLineItem(db.Model):
    __tablename__ = "receipt_line_items"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id = db.Column(
        db.BigInteger,
        db.ForeignKey("user_receipts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.Text, nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    price_per_item = db.Column(Numeric(12, 2), nullable=False, default=0)
    total_price = db.Column(Numeric(12, 2), nullable=False, default=0)
    created_at = db.Column(
        db.DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    deleted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True, index=True)

    assignments = db.relationship(
        "Assignment", backref=db.backref("line_item", lazy=True)
    )

    def __repr__(self):
        return f"<ReceiptLineItem {self.id} {self.receipt_id} {self.name}>"
