from backend.models import db
from sqlalchemy import text

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

    def __repr__(self):
        return f'<User {self.username}>'
