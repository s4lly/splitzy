import os
import sys

import pytest


# Add the parent directory to the Python path to find the backend module
# This works whether we're running from root or backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))  # tests directory
backend_dir = os.path.dirname(current_dir)  # backend directory
parent_dir = os.path.dirname(backend_dir)  # root directory

# Add both the backend directory and parent directory to the path
sys.path.insert(0, parent_dir)
sys.path.insert(0, backend_dir)

from werkzeug.security import generate_password_hash

from __init__ import create_app
from models import db
from models.receipt_line_item import ReceiptLineItem
from models.user import User
from models.user_receipt import UserReceipt


@pytest.fixture(scope="function")
def test_app():
    app = create_app()
    app.config.update(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "WTF_CSRF_ENABLED": False,
            "SQLALCHEMY_ENGINE_OPTIONS": {"connect_args": {"check_same_thread": False}},
        }
    )

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope="function")
def test_client(test_app):
    return test_app.test_client()


@pytest.fixture(scope="function")
def new_user(test_app):
    with test_app.app_context():
        hashed_password = generate_password_hash("password", method="pbkdf2:sha256")
        user = User(
            username="testuser", email="test@example.com", password=hashed_password
        )
        db.session.add(user)
        db.session.commit()
        yield user
        # Clean up - check if user still exists before deleting
        if user in db.session:
            db.session.delete(user)
            db.session.commit()


@pytest.fixture(scope="function")
def new_receipt(test_app, new_user):
    with test_app.app_context():
        receipt = UserReceipt(user_id=new_user.id, merchant="Test Store")
        db.session.add(receipt)
        db.session.commit()
        yield receipt
        # Clean up - check if receipt still exists before deleting
        if receipt in db.session:
            db.session.delete(receipt)
            db.session.commit()


@pytest.fixture(scope="function")
def new_line_item(test_app, new_receipt):
    with test_app.app_context():
        line_item = ReceiptLineItem(
            receipt_id=new_receipt.id,
            name="Test Item",
            quantity=1,
            price_per_item=10.0,
            total_price=10.0,
        )
        db.session.add(line_item)
        db.session.commit()
        yield line_item
        # Clean up - check if line item still exists before deleting
        if line_item in db.session:
            db.session.delete(line_item)
            db.session.commit()


@pytest.fixture(scope="function")
def mock_receipt_data():
    return {
        "is_receipt": True,
        "merchant": "Giwa",
        "date": "2025-06-08",
        "line_items": [
            {
                "name": "Sausage Omurice",
                "quantity": 2,
                "price_per_item": 23.00,
                "total_price": 46.00,
            },
            {
                "name": "Curry Chicken Sandwich",
                "quantity": 1,
                "price_per_item": 18.00,
                "total_price": 18.00,
            },
        ],
        "subtotal": 64.00,
        "tax": 5.80,
        "tip": 12.80,
        "gratuity": 0.00,
        "total": 82.60,
        "payment_method": "VISA CREDIT",
        "tax_included_in_items": False,
        "display_subtotal": 64.00,
        "items_total": 64.00,
        "pretax_total": 64.00,
        "posttax_total": 69.80,
        "final_total": 82.60,
    }
