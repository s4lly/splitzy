import json
from backend.models import db
from backend.models.receipt_line_item import ReceiptLineItem

def test_update_receipt_assignments(test_client, new_user, new_receipt, new_line_item):
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    # Data for the request
    data = {
        "line_item_id": new_line_item.id,
        "assignments": ["testuser"]
    }

    # Make the request
    response = test_client.put(
        f'/api/user/receipts/{new_receipt.id}/assignments',
        data=json.dumps(data),
        content_type='application/json'
    )

    # Check the response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert response_data['success'] is True

    # Check the database
    updated_line_item = db.session.get(ReceiptLineItem, new_line_item.id)
    assert updated_line_item.assignments == ["testuser"]
