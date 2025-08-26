import pytest
from backend import create_app
from backend.models import db
from backend.models.user import User
from backend.models.user_receipt import UserReceipt
from backend.models.receipt_line_item import ReceiptLineItem

@pytest.fixture(scope='module')
def test_app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False,
        "SESSION_COOKIE_SAMESITE": "None",
        "SESSION_COOKIE_SECURE": True,
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='module')
def test_client(test_app):
    return test_app.test_client()

@pytest.fixture(scope='function')
def new_user(test_app):
    with test_app.app_context():
        user = User(username='testuser', email='test@example.com', password='password')
        db.session.add(user)
        db.session.commit()
        yield user
        db.session.delete(user)
        db.session.commit()

@pytest.fixture(scope='function')
def new_receipt(test_app, new_user):
    with test_app.app_context():
        receipt = UserReceipt(user_id=new_user.id, merchant="Test Store")
        db.session.add(receipt)
        db.session.commit()
        yield receipt
        db.session.delete(receipt)
        db.session.commit()

@pytest.fixture(scope='function')
def new_line_item(test_app, new_receipt):
    with test_app.app_context():
        line_item = ReceiptLineItem(
            receipt_id=new_receipt.id,
            name="Test Item",
            quantity=1,
            price_per_item=10.0,
            total_price=10.0
        )
        db.session.add(line_item)
        db.session.commit()
        yield line_item
        db.session.delete(line_item)
        db.session.commit()
