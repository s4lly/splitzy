from models import db
from sqlalchemy.sql import func
from models.receipt_line_item import ReceiptLineItem


class UserReceipt(db.Model):
    __tablename__ = 'user_receipts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    receipt_data = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Denormalized fields extracted from receipt_data (RegularReceipt / TransportationTicket)
    is_receipt = db.Column(db.Boolean, nullable=True, default=True)
    document_type = db.Column(db.String(50), nullable=True)

    # Regular receipt fields
    merchant = db.Column(db.String(255), nullable=True)
    date = db.Column(db.String(50), nullable=True)
    subtotal = db.Column(db.Float, nullable=True, default=0.0)
    tax = db.Column(db.Float, nullable=True, default=0.0)
    tip = db.Column(db.Float, nullable=True, default=0.0)
    gratuity = db.Column(db.Float, nullable=True, default=0.0)
    total = db.Column(db.Float, nullable=True, default=0.0)
    payment_method = db.Column(db.String(120), nullable=True)
    tax_included_in_items = db.Column(db.Boolean, nullable=True, default=False)
    display_subtotal = db.Column(db.Float, nullable=True, default=0.0)
    items_total = db.Column(db.Float, nullable=True, default=0.0)
    pretax_total = db.Column(db.Float, nullable=True, default=0.0)
    posttax_total = db.Column(db.Float, nullable=True, default=0.0)
    final_total = db.Column(db.Float, nullable=True, default=0.0)

    # Transportation ticket-specific fields
    carrier = db.Column(db.String(255), nullable=True)
    ticket_number = db.Column(db.String(255), nullable=True)
    origin = db.Column(db.String(255), nullable=True)
    destination = db.Column(db.String(255), nullable=True)
    passenger = db.Column(db.String(255), nullable=True)
    class_ = db.Column('class', db.String(50), nullable=True)
    fare = db.Column(db.Float, nullable=True, default=0.0)
    currency = db.Column(db.String(10), nullable=True)
    taxes = db.Column(db.Float, nullable=True, default=0.0)

    user = db.relationship('User', backref=db.backref('receipts', lazy=True))

    # Relationship to normalized line items
    line_items = db.relationship(
        'ReceiptLineItem',
        backref='receipt',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<UserReceipt {self.id}>'
