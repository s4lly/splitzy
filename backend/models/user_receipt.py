from . import db
from sqlalchemy.sql import func

class UserReceipt(db.Model):
    __tablename__ = 'user_receipts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    receipt_data = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    user = db.relationship('User', backref=db.backref('receipts', lazy=True))

    def __repr__(self):
        return f'<UserReceipt {self.id}>'
