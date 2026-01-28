from sqlalchemy import text
from sqlalchemy.dialects.postgresql import UUID

from models import db


class Assignment(db.Model):
    __tablename__ = "assignments"

    # ID is client-generated ULID via Zero mutators, not auto-incremented
    id = db.Column(db.Text, primary_key=True)
    receipt_line_item_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("receipt_line_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receipt_user_id = db.Column(
        db.Text,
        db.ForeignKey("receipt_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(
        db.TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    deleted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True, index=True)

    receipt_user = db.relationship(
        "ReceiptUser", backref=db.backref("assignments", lazy=True)
    )
    user = db.relationship(
        "ReceiptUser",
        foreign_keys=[receipt_user_id],
        lazy="joined",
    )

    def __repr__(self):
        return f"<Assignment {self.receipt_user_id} {self.receipt_line_item_id}>"
