from sqlalchemy import text

from models import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.BigInteger, primary_key=True)
    auth_user_id = db.Column(db.Text, unique=True, nullable=False, index=True)
    display_name = db.Column(db.Text, unique=False, nullable=True)
    created_at = db.Column(
        db.TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    deleted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True, index=True)

    def __repr__(self):
        return f"<User {self.username or self.auth_user_id}>"
