from sqlalchemy import text

from models import db


class ReceiptUser(db.Model):
    __tablename__ = "receipt_users"

    # ID is client-generated ULID via Zero mutators, not auto-incremented
    id = db.Column(db.Text, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    display_name = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    deleted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True, index=True)

    user = db.relationship("User", backref=db.backref("receipt_users", lazy=True))

    def __repr__(self):
        return f"<ReceiptUser {self.id}>"
