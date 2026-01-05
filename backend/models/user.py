from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

from models import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.BigInteger, primary_key=True
    )  # Using BigInteger for better scalability
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(
        db.Text, unique=True, nullable=False
    )  # Using Text for unlimited length emails
    password = db.Column(db.Text, nullable=False)  # Using Text for hashed passwords
    created_at = db.Column(
        db.TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    settings = db.Column(
        JSONB, nullable=True, default=dict
    )  # Using JSONB for user settings/preferences

    def __repr__(self):
        return f"<User {self.username}>"
