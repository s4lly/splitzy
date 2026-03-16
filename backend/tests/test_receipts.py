import json
import os
from unittest.mock import patch

from models import db
from schemas.receipt import RegularReceipt


def test_health_check(test_client):
    """
    GIVEN a Flask application
    WHEN the '/api/health' page is requested
    THEN check that a '200' status code is returned
    """
    response = test_client.get("/api/health")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "healthy"


@patch("blueprints.receipts.upload_to_blob_storage")
@patch("blueprints.receipts.ImageAnalyzer")
def test_analyze_receipt(
    mock_image_analyzer, mock_blob_upload, test_client, new_user, mock_receipt_data
):
    """
    GIVEN a Flask application
    WHEN the '/api/analyze-receipt' page is sent a POST request with a file
    THEN check that a '200' status code is returned and the receipt data is in the response
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session["user_id"] = new_user.id

    # Mock the blob storage upload to return a fake URL
    mock_blob_upload.return_value = "https://fake-blob-storage.com/fake-image-url.jpg"

    # Mock the ImageAnalyzer result
    mock_analyzer_instance = mock_image_analyzer.return_value
    mock_analyzer_instance.analyze_image.return_value = RegularReceipt.model_validate(
        mock_receipt_data
    )

    # Create a dummy file to upload
    upload_folder = test_client.application.config.get("UPLOAD_FOLDER", "/tmp")
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    file_path = os.path.join(upload_folder, "receipt.jpg")
    with open(file_path, "w") as f:
        f.write("dummy receipt image")

    with open(file_path, "rb") as f:
        response = test_client.post(
            "/api/analyze-receipt",
            data={"file": (f, "receipt.jpg")},
            content_type="multipart/form-data",
        )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["is_receipt"] is True
    assert data["receipt_data"]["merchant"] == mock_receipt_data["merchant"]

    os.remove(file_path)
