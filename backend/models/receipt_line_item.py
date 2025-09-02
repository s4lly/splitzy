from backend.models import db
from sqlalchemy import JSON, Numeric, text
import uuid


class ReceiptLineItem(db.Model):
    __tablename__ = 'receipt_line_items'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_id = db.Column(db.Integer, db.ForeignKey('user_receipts.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    price_per_item = db.Column(Numeric(12, 2), nullable=False, default=0)
    total_price = db.Column(Numeric(12, 2), nullable=False, default=0)
    assignments = db.Column(JSON, nullable=True, default=list)
    created_at = db.Column(db.DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
