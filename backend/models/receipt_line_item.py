from models import db
from sqlalchemy import JSON
import uuid


class ReceiptLineItem(db.Model):
    __tablename__ = 'receipt_line_items'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_id = db.Column(db.Integer, db.ForeignKey('user_receipts.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=True)
    quantity = db.Column(db.Integer, nullable=True, default=1)
    price_per_item = db.Column(db.Float, nullable=True, default=0.0)
    total_price = db.Column(db.Float, nullable=True, default=0.0)
    assignments = db.Column(JSON, nullable=True, default=db.text('[]'))  # JSON array of strings
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
