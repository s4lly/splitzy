import json
import os
from unittest.mock import patch

from models import db
from models.receipt_line_item import ReceiptLineItem
from schemas.receipt import RegularReceipt


def test_health_check(test_client):
    """
    GIVEN a Flask application
    WHEN the '/api/health' page is requested
    THEN check that a '200' status code is returned
    """
    response = test_client.get('/api/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'


def test_get_user_receipts(test_client, new_user, new_receipt):
    """
    GIVEN a Flask application and a user with a receipt
    WHEN the '/api/user/receipts' page is requested
    THEN check that a '200' status code is returned and the receipt is in the response
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    response = test_client.get('/api/user/receipts')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert len(data['receipts']) == 1
    assert data['receipts'][0]['id'] == new_receipt.id


def test_get_user_receipt(test_client, new_user, new_receipt):
    """
    GIVEN a Flask application and a user with a receipt
    WHEN the '/api/user/receipts/<receipt_id>' page is requested
    THEN check that a '200' status code is returned and the correct receipt is in the response
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    response = test_client.get(f'/api/user/receipts/{new_receipt.id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['receipt']['id'] == new_receipt.id


def test_delete_user_receipt(test_client, new_user, new_receipt):
    """
    GIVEN a Flask application and a user with a receipt
    WHEN the '/api/user/receipts/<receipt_id>' page is sent a DELETE request
    THEN check that a '200' status code is returned and the receipt is deleted
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    response = test_client.delete(f'/api/user/receipts/{new_receipt.id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['message'] == 'Receipt deleted successfully'

    # Verify the receipt is deleted
    response = test_client.get(f'/api/user/receipts/{new_receipt.id}')
    assert response.status_code == 404


def test_update_line_item_assignments(test_client, new_user, new_receipt, new_line_item):
    """
    GIVEN a Flask application and a user with a receipt and line item
    WHEN the '/api/user/receipts/<receipt_id>/assignments' page is sent a PUT request
    THEN check that a '200' status code is returned and the assignments are updated
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    # Data for the request
    data = {
        "line_item_id": str(new_line_item.id),
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


def test_update_line_item(test_client, new_user, new_receipt, new_line_item):
    """
    GIVEN a Flask application and a user with a receipt and line item
    WHEN the '/api/user/receipts/<receipt_id>/line-items/<item_id>' page is sent a PUT request
    THEN check that a '200' status code is returned and the line item is updated
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    data = {'name': 'Updated Test Item'}
    response = test_client.put(
        f'/api/user/receipts/{new_receipt.id}/line-items/{new_line_item.id}',
        data=json.dumps(data),
        content_type='application/json'
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True

    updated_line_item = db.session.get(ReceiptLineItem, new_line_item.id)
    assert updated_line_item.name == 'Updated Test Item'


def test_delete_line_item(test_client, new_user, new_receipt, new_line_item):
    """
    GIVEN a Flask application and a user with a receipt and line item
    WHEN the '/api/user/receipts/<receipt_id>/line-items/<item_id>' page is sent a DELETE request
    THEN check that a '200' status code is returned and the line item is deleted
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    response = test_client.delete(
        f'/api/user/receipts/{new_receipt.id}/line-items/{new_line_item.id}'
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True

    deleted_line_item = db.session.get(ReceiptLineItem, new_line_item.id)
    assert deleted_line_item is None


def test_get_line_items(test_client, new_user, new_receipt, new_line_item):
    """
    GIVEN a Flask application and a user with a receipt and line item
    WHEN the '/api/user/receipts/<receipt_id>/line-items' page is requested
    THEN check that a '200' status code is returned and the line items are in the response
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    response = test_client.get(f'/api/user/receipts/{new_receipt.id}/line-items')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert len(data['line_items']) == 1
    assert data['line_items'][0]['id'] == str(new_line_item.id)


def test_add_line_item(test_client, new_user, new_receipt):
    """
    GIVEN a Flask application and a user with a receipt
    WHEN the '/api/user/receipts/<receipt_id>/line-items' page is sent a POST request
    THEN check that a '200' status code is returned and the line item is added
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    data = {
        'name': 'New Test Item',
        'quantity': 2,
        'price_per_item': 5.0,
        'total_price': 10.0
    }
    response = test_client.post(
        f'/api/user/receipts/{new_receipt.id}/line-items',
        data=json.dumps(data),
        content_type='application/json'
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['line_item']['name'] == 'New Test Item'

    line_item = db.session.get(ReceiptLineItem, data['line_item']['id'])
    assert line_item is not None


def test_update_receipt_data(test_client, new_user, new_receipt):
    """
    GIVEN a Flask application and a user with a receipt
    WHEN the '/api/user/receipts/<receipt_id>/receipt-data' page is sent a PUT request
    THEN check that a '200' status code is returned and the receipt data is updated
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    data = {'merchant': 'Updated Test Store'}
    response = test_client.put(
        f'/api/user/receipts/{new_receipt.id}/receipt-data',
        data=json.dumps(data),
        content_type='application/json'
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True

    response = test_client.get(f'/api/user/receipts/{new_receipt.id}')
    data = json.loads(response.data)
    assert data['receipt']['receipt_data']['merchant'] == 'Updated Test Store'


def test_get_receipt_image(test_client, new_user, new_receipt):
    """
    GIVEN a Flask application and a user with a receipt
    WHEN the '/api/user/receipts/<receipt_id>/image' page is requested
    THEN check that a '200' status code is returned and the image is returned
    """
    # Create a dummy image file
    upload_folder = test_client.application.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    image_path = os.path.join(upload_folder, 'test.jpg')
    with open(image_path, 'w') as f:
        f.write('dummy image data')

    new_receipt.image_path = image_path
    db.session.commit()

    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    response = test_client.get(f'/api/user/receipts/{new_receipt.id}/image')
    assert response.status_code == 200
    assert response.data == b'dummy image data'

    os.remove(image_path)


@patch('blueprints.receipts.upload_to_blob_storage')
@patch('blueprints.receipts.ImageAnalyzer')
def test_analyze_receipt(mock_image_analyzer, mock_blob_upload, test_client, new_user, mock_receipt_data):
    """
    GIVEN a Flask application
    WHEN the '/api/analyze-receipt' page is sent a POST request with a file
    THEN check that a '200' status code is returned and the receipt data is in the response
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session['user_id'] = new_user.id

    # Mock the blob storage upload to return a fake URL
    mock_blob_upload.return_value = "https://fake-blob-storage.com/fake-image-url.jpg"

    # Mock the ImageAnalyzer result
    mock_analyzer_instance = mock_image_analyzer.return_value
    mock_analyzer_instance.analyze_image.return_value = RegularReceipt.model_validate(mock_receipt_data)

    # Create a dummy file to upload
    upload_folder = test_client.application.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    file_path = os.path.join(upload_folder, 'receipt.jpg')
    with open(file_path, 'w') as f:
        f.write('dummy receipt image')

    with open(file_path, 'rb') as f:
        response = test_client.post(
            '/api/analyze-receipt',
            data={'file': (f, 'receipt.jpg')},
            content_type='multipart/form-data'
        )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['is_receipt'] is True
    assert data['receipt_data']['merchant'] == mock_receipt_data['merchant']

    os.remove(file_path)


