from sqlalchemy import text

from models import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.BigInteger, primary_key=True
    )  # Using BigInteger for better scalability
    auth_user_id = db.Column(db.Text, unique=True, nullable=False, index=True)
    username = db.Column(db.Text, unique=False, nullable=True)
    email = db.Column(
        db.Text, unique=False, nullable=True
    )  # Using Text for unlimited length emails
    created_at = db.Column(
        db.TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    deleted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True, index=True)

    def __repr__(self):
        return f"<User {self.username or self.auth_user_id}>"
