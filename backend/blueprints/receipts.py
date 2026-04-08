import os
import time

import requests
from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from blueprints.auth import get_current_user
from image_analyzer import ImageAnalysisError, ImageAnalyzer, ImageAnalyzerConfigError
from models import db
from models.receipt_line_item import ReceiptLineItem
from models.user_receipt import UserReceipt
from schemas.receipt import (
    ReceiptLineItemCreate,
    RegularReceiptResponse,
    UserReceiptCreate,
)


receipts_bp = Blueprint("receipts", __name__)


def upload_to_blob_storage(image_data, filename, content_type):
    """
    Upload binary image data to Vercel blob storage via the Vercel function
    Args:
        image_data (bytes): Binary image data
        filename (str): Original filename
        content_type (str): MIME type (e.g., 'image/jpeg')
    Returns the blob URL on success, None on failure
    """
    safe_filename = "unknown_file"  # Default for error logging

    try:
        # Get the Vercel function URL from environment
        # This is validated at app startup
        vercel_function_url = os.environ.get("VERCEL_FUNCTION_URL")
        if not vercel_function_url:
            current_app.logger.error(
                "VERCEL_FUNCTION_URL environment variable is not set"
            )
            return None

        # Sanitize inputs
        # Ensure filename is safe - use secure_filename or fallback to generated name
        safe_filename = secure_filename(filename) if filename else "uploaded_file"
        if (
            not safe_filename
        ):  # secure_filename might return empty string for invalid filenames
            safe_filename = "uploaded_file"

        # Ensure content_type has a sensible default
        safe_content_type = content_type if content_type else "application/octet-stream"

        # Prepare the file for upload using binary data
        files = {"file": (safe_filename, image_data, safe_content_type)}

        # Make the request to the Vercel function
        response = requests.post(vercel_function_url, files=files, timeout=30)

        # Raise HTTPError for bad HTTP status codes (4xx, 5xx)
        response.raise_for_status()

        # Safe JSON parsing with error handling
        try:
            result = response.json()
        except ValueError:
            current_app.logger.exception(
                "Failed to parse JSON response from blob storage: %s",
                response.text,
                exc_info=True,
            )
            return None

        # Safe access to result data
        if not isinstance(result, dict):
            current_app.logger.error(
                f"Unexpected response format from blob storage: {type(result)}"
            )
            return None

        if result.get("success"):
            blob_url = result.get("url")
            if blob_url:
                return blob_url
            else:
                current_app.logger.error("Blob upload succeeded but no URL returned")
                return None
        else:
            error_msg = result.get("error", "Unknown error")
            current_app.logger.error(f"Blob upload failed: {error_msg}")
            return None

    except requests.RequestException:
        current_app.logger.exception(
            "Network/HTTP error uploading to blob storage for file %s",
            safe_filename,
            exc_info=True,
        )
        return None


@receipts_bp.route("/api/analyze-receipt", methods=["POST"])
def analyze_receipt():
    # ============================================================================
    # Authentication & Authorization Setup
    # ============================================================================
    current_user = get_current_user()

    # ============================================================================
    # File Processing & Validation
    # ============================================================================
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    # Read the file data for analysis and upload
    file.seek(0)  # Reset file pointer to beginning
    image_data = file.read()

    if current_app.debug:
        current_app.logger.debug(
            "[receipt] Incoming image: filename=%s, content_type=%s, size=%d bytes",
            file.filename,
            file.content_type,
            len(image_data),
        )

    # Upload to blob storage using binary data
    blob_url = upload_to_blob_storage(image_data, file.filename, file.content_type)
    if not blob_url:
        return jsonify(
            {"success": False, "error": "Failed to upload image to blob storage"}
        ), 500

    # ============================================================================
    # Image Analysis
    # ============================================================================
    try:
        analyzer = ImageAnalyzer()

        try:
            _t0 = time.monotonic()
            receipt_model = analyzer.analyze_image(
                image_data, mime_type=file.content_type or "image/jpeg"
            )
            if current_app.debug:
                current_app.logger.debug(
                    "[receipt] Gemini analysis took %.2fs, result type: %s",
                    time.monotonic() - _t0,
                    type(receipt_model).__name__,
                )
                if hasattr(receipt_model, "is_receipt") and not receipt_model.is_receipt:
                    reason = getattr(receipt_model, "reason", None)
                    current_app.logger.debug(
                        "[receipt] NotAReceipt returned. Reason: %s",
                        reason or "none provided",
                    )
        except ImageAnalyzerConfigError as config_error:
            current_app.logger.error(
                f"Image analyzer configuration error: {str(config_error)}"
            )
            return jsonify(
                {
                    "success": False,
                    "error": f"Service configuration error: {str(config_error)}",
                }
            ), 500
        except ImageAnalysisError as analyzer_error:
            current_app.logger.error(
                f"Error from image analyzer: {str(analyzer_error)}"
            )
            return jsonify(
                {
                    "success": False,
                    "error": f"Image analysis failed: {str(analyzer_error)}",
                }
            ), 500

        # ========================================================================
        # Receipt Model Validation
        # ========================================================================
        # receipt_model should always be a Pydantic model
        # (RegularReceipt, TransportationTicket, or NotAReceipt)
        # If there was an error in processing,
        # ImageAnalysisError would have been raised above
        if not hasattr(receipt_model, "model_dump"):
            # This shouldn't happen, but handle it gracefully
            current_app.logger.error(
                f"Unexpected receipt_model type: {type(receipt_model)}"
            )
            return jsonify(
                {
                    "success": False,
                    "error": "Invalid response format from image analyzer",
                }
            ), 500

        # ========================================================================
        # Receipt Processing
        # ========================================================================
        if hasattr(receipt_model, "is_receipt") and receipt_model.is_receipt:
            receipt_create_data = UserReceiptCreate.model_validate(receipt_model)

            # Add the additional fields that aren't in the Pydantic model
            receipt_create_data.user_id = (
                current_user.id if current_user is not None else None
            )
            receipt_create_data.image_path = blob_url
            receipt_create_data.original_tip = receipt_create_data.tip

            # Create the SQLAlchemy model instance
            new_receipt = UserReceipt(**receipt_create_data.model_dump())
            db.session.add(new_receipt)

            if hasattr(receipt_model, "line_items") and receipt_model.line_items:
                for item in receipt_model.line_items:
                    # Use Pydantic model_validate to automatically map fields
                    line_item_data = ReceiptLineItemCreate.model_validate(item)

                    # Create the SQLAlchemy model instance
                    line_item = ReceiptLineItem(**line_item_data.model_dump())

                    # Use the relationship to automatically set the foreign key
                    new_receipt.line_items.append(line_item)

            db.session.commit()

            current_app.logger.info(
                "[receipt] Receipt saved successfully: id=%s",
                new_receipt.id,
            )
            current_app.logger.debug(
                "[receipt] Receipt details: store=%s, total=%s, user_id=%s",
                getattr(new_receipt, "store_name", None),
                getattr(new_receipt, "total", None),
                getattr(new_receipt, "user_id", None),
            )

            return jsonify(
                {
                    "success": True,
                    "is_receipt": True,
                    "receipt_data": RegularReceiptResponse.model_validate(
                        new_receipt
                    ).model_dump(),
                }
            )
        else:
            # ====================================================================
            # Non-Receipt Handling
            # ====================================================================
            # Not a receipt
            # Check if receipt_model has model_dump method (Pydantic model) or is a dict
            if hasattr(receipt_model, "model_dump"):
                receipt_data = receipt_model.model_dump()
            else:
                # It's already a dict, use it directly
                receipt_data = receipt_model

            return jsonify(
                {"success": True, "is_receipt": False, "receipt_data": receipt_data}
            )
    except Exception as e:
        # ============================================================================
        # Exception Handling
        # ============================================================================
        db.session.rollback()
        current_app.logger.error(f"Error analyzing receipt: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@receipts_bp.route("/api/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy"})
