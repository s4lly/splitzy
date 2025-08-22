from flask import Blueprint, request, jsonify, current_app, send_from_directory, session
from werkzeug.utils import secure_filename
import os
import json
import uuid
from ..models import db
from ..models.user_receipt import UserReceipt
from ..image_analyzer import ImageAnalyzer, LineItem, RegularReceipt
from pydantic import ValidationError
from .auth import get_current_user

receipts_bp = Blueprint('receipts', __name__)

def resolve_image_path(image_path):
    """
    Resolve image path with backwards compatibility.
    Tries absolute path first, then falls back to relative path from backend/uploads/
    """
    # First try the path as-is (absolute path)
    if os.path.isfile(image_path):
        return image_path

    # If that fails, try as relative path from backend/uploads/
    # Handle both formats: "uploads/filename.png" and "filename.png"
    filename = os.path.basename(image_path)
    if image_path.startswith('uploads/'):
        filename = image_path[8:]  # Remove "uploads/" prefix

    # Try relative path from backend/uploads/
    relative_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    if os.path.isfile(relative_path):
        return relative_path

    # If still not found, return the original path (will cause 404)
    return image_path

@receipts_bp.route('/analyze/<filename>')
def analyze(filename):
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    # Resolve image path with backwards compatibility
    resolved_path = resolve_image_path(image_path)
    analyzer = ImageAnalyzer()
    analysis_result = analyzer.analyze_image(resolved_path)
    print("analysis_result done: ", analysis_result)
    return jsonify(analysis_result)

@receipts_bp.route('/api/analyze/<filename>')
def api_analyze(filename):
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    # Resolve image path with backwards compatibility
    resolved_path = resolve_image_path(image_path)
    analyzer = ImageAnalyzer()
    analysis_result = analyzer.analyze_image(resolved_path)
    print("analysis_result done: ", analysis_result)
    return jsonify(analysis_result)

@receipts_bp.route('/api/analyze-receipt', methods=['POST'])
def analyze_receipt():
    # Check if user is authenticated
    current_user = get_current_user()

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    # Get the provider from the request, default to environment variable
    provider = request.form.get('provider', os.getenv('DEFAULT_AI_PROVIDER', 'azure'))

    # Save the file temporarily
    temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
    file.save(temp_path)

    try:
        # Initialize the analyzer with the selected provider
        analyzer = ImageAnalyzer(provider=provider)
        result = analyzer.analyze_image(temp_path)

        if result.get('success') and result.get('is_receipt'):
            # Save the receipt to the database
            new_receipt = UserReceipt(
                user_id=current_user.id if current_user else None,
                receipt_data=json.dumps(result['receipt_data']),
                image_path=temp_path
            )
            db.session.add(new_receipt)
            db.session.commit()

            # Add the receipt ID to the response
            result['receipt_data']['id'] = new_receipt.id

        return jsonify(result)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error analyzing receipt: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        # Don't delete the file since we're storing it in the database
        pass

@receipts_bp.route('/api/user/receipts', methods=['GET'])
def get_user_receipts():
    """Get all receipts for the current user"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    try:
        user_receipts = UserReceipt.query.filter_by(user_id=current_user.id).order_by(UserReceipt.created_at.desc()).all()

        # Format receipts for the response
        receipts = []
        for receipt in user_receipts:
            receipt_data = json.loads(receipt.receipt_data)
            receipts.append({
                'id': receipt.id,
                'receipt_data': receipt_data,
                'image_path': receipt.image_path,
                'created_at': receipt.created_at.isoformat()
            })

        return jsonify({
            'success': True,
            'receipts': receipts
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching receipt history: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch receipt history'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>', methods=['GET'])
def get_user_receipt(receipt_id):
    """Get a specific receipt by ID"""
    try:
        receipt = UserReceipt.query.get(receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        # Format receipt for the response
        receipt_data = json.loads(receipt.receipt_data)
        response_receipt = {
            'id': receipt.id,
            'receipt_data': receipt_data,
            'image_path': receipt.image_path,
            'created_at': receipt.created_at.isoformat()
        }

        return jsonify({
            'success': True,
            'receipt': response_receipt
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching receipt: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch receipt'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>', methods=['DELETE'])
def delete_user_receipt(receipt_id):
    """Delete a specific receipt by ID"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    try:
        receipt = UserReceipt.query.filter_by(id=receipt_id, user_id=current_user.id).first()

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found or you do not have permission to delete it'}), 404

        db.session.delete(receipt)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Receipt deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting receipt: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to delete receipt'}), 500

@receipts_bp.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy'})

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/image', methods=['GET'])
def get_receipt_image(receipt_id):
    """Get the image for a specific receipt"""
    try:
        receipt = UserReceipt.query.get(receipt_id)

        # Check if receipt exists and has an image path
        if not receipt or not receipt.image_path:
            return jsonify({'success': False, 'error': 'Receipt image not found'}), 404

        image_path = receipt.image_path

        # Resolve image path with backwards compatibility
        resolved_path = resolve_image_path(image_path)

        # Check if the file exists on disk
        if not os.path.isfile(resolved_path):
            return jsonify({'success': False, 'error': 'Receipt image file not found on server'}), 404

        # Determine the content type based on the file extension
        file_extension = os.path.splitext(image_path)[1].lower()

        if file_extension in ['.jpg', '.jpeg']:
            content_type = 'image/jpeg'
        elif file_extension == '.png':
            content_type = 'image/png'
        elif file_extension == '.gif':
            content_type = 'image/gif'
        else:
            content_type = 'application/octet-stream'

        # Return the image file
        return send_from_directory(
            os.path.dirname(resolved_path),
            os.path.basename(resolved_path),
            mimetype=content_type
        )

    except Exception as e:
        current_app.logger.error(f"Error retrieving receipt image: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to retrieve receipt image'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/assignments', methods=['PUT'])
def update_receipt_assignments(receipt_id):
    """Update the assignments for line items in a specific receipt"""
    data = request.get_json()
    if not data or 'line_items' not in data:
        current_app.logger.error(f"[update_receipt_assignments] Missing line_items data for receipt_id={receipt_id}")
        return jsonify({'success': False, 'error': 'Missing line_items data'}), 400

    try:
        receipt = UserReceipt.query.get(receipt_id)

        if not receipt:
            current_app.logger.error(f"[update_receipt_assignments] Receipt not found: receipt_id={receipt_id}")
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        try:
            receipt_data = json.loads(receipt.receipt_data)
        except Exception as e:
            current_app.logger.error(f"[update_receipt_assignments] Error decoding receipt_data: receipt_id={receipt_id}, error={str(e)}")
            return jsonify({'success': False, 'error': 'Corrupt receipt data'}), 500

        # Update assignments for each line item by id
        try:
            line_items_by_id = {item['id']: item for item in receipt_data.get('line_items', [])}
            for updated_item in data['line_items']:
                if updated_item['id'] in line_items_by_id:
                    line_items_by_id[updated_item['id']]['assignments'] = updated_item.get('assignments', [])
            receipt_data['line_items'] = list(line_items_by_id.values())
        except Exception as e:
            current_app.logger.error(f"[update_receipt_assignments] Error updating line items: receipt_id={receipt_id}, error={str(e)}")
            return jsonify({'success': False, 'error': 'Failed to update line items'}), 500

        # Save updated receipt_data
        try:
            receipt.receipt_data = json.dumps(receipt_data)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"[update_receipt_assignments] Error saving updated receipt_data: receipt_id={receipt_id}, error={str(e)}")
            return jsonify({'success': False, 'error': 'Failed to save updated assignments'}), 500

        return jsonify({'success': True})
    except Exception as e:
        current_app.logger.error(f"[update_receipt_assignments] Unexpected error: receipt_id={receipt_id}, error={str(e)}")
        return jsonify({'success': False, 'error': 'Failed to update assignments'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items/<item_id>', methods=['PUT'])
def update_line_item(receipt_id, item_id):
    """Update any property of a specific line item in a receipt"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No update data provided'}), 400

    try:
        receipt = UserReceipt.query.get(receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        receipt_data = json.loads(receipt.receipt_data)
        updated = False

        # Find the line item by id and update its properties
        for item in receipt_data.get('line_items', []):
            if str(item.get('id')) == str(item_id):
                for key, value in data.items():
                    item[key] = value
                updated = True
                break

        if not updated:
            return jsonify({'success': False, 'error': 'Line item not found'}), 404

        # Save updated receipt_data
        receipt.receipt_data = json.dumps(receipt_data)
        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[update_line_item] Error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to update line item'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/receipt-data', methods=['PUT'])
def update_receipt_data(receipt_id):
    """Update any property of the receipt data (RegularReceipt)"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No update data provided'}), 400

    try:
        receipt = UserReceipt.query.get(receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        receipt_data = json.loads(receipt.receipt_data)

        # Merge existing data with update data for validation
        validation_data = {**receipt_data, **data}

        # Validate using RegularReceipt model (this will catch invalid field names and types)
        try:
            validated_receipt = RegularReceipt(**validation_data)
        except ValidationError as e:
            return jsonify({'success': False, 'error': f'Invalid receipt data update: {e}'}), 400

        # Extract only the fields that were provided in the update
        update_dict = {k: v for k, v in data.items() if k in validation_data}

        # Update the receipt data properties
        for key, value in update_dict.items():
            # Only allow updating valid RegularReceipt properties
            # Exclude line_items as they have their own endpoint
            if key != 'line_items' and key != 'id':
                receipt_data[key] = value

        # Save updated receipt_data
        receipt.receipt_data = json.dumps(receipt_data)
        db.session.commit()

        return jsonify({'success': True})
    except ValidationError as e:
        return jsonify({'success': False, 'error': f'Invalid receipt data update: {e}'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[update_receipt_data] Error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to update receipt data'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items/<item_id>', methods=['DELETE'])
def delete_line_item(receipt_id, item_id):
    """Delete a specific line item from a receipt"""
    try:
        receipt = UserReceipt.query.get(receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        receipt_data = json.loads(receipt.receipt_data)

        # Find and remove the line item by id
        original_length = len(receipt_data.get('line_items', []))
        receipt_data['line_items'] = [
            item for item in receipt_data.get('line_items', [])
            if str(item.get('id')) != str(item_id)
        ]

        # Check if the item was actually found and removed
        if len(receipt_data['line_items']) == original_length:
            return jsonify({'success': False, 'error': 'Line item not found'}), 404

        # Save updated receipt_data
        receipt.receipt_data = json.dumps(receipt_data)
        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[delete_line_item] Error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to delete line item'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items', methods=['POST'])
def add_line_item(receipt_id):
    """Add a new line item to a receipt"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No line item data provided'}), 400

    try:
        # Validate the incoming data using the LineItem model
        # Remove id and assignments from data since we'll generate/override them
        validation_data = {k: v for k, v in data.items() if k not in ['id', 'assignments']}
        line_item = LineItem(**validation_data)
    except ValidationError as e:
        return jsonify({'success': False, 'error': f'Invalid line item data: {e}'}), 400

    try:
        receipt = UserReceipt.query.get(receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        receipt_data = json.loads(receipt.receipt_data)

        # Create new line item with generated UUID and default assignments
        new_line_item = {
            'id': str(uuid.uuid4()),
            'assignments': [],
            **line_item.dict(exclude={'id', 'assignments'})  # Include validated data but exclude id and assignments
        }

        # Add the new item to the top of the line_items array (index 0)
        if 'line_items' not in receipt_data:
            receipt_data['line_items'] = []

        receipt_data['line_items'].insert(0, new_line_item)

        # Save updated receipt_data
        receipt.receipt_data = json.dumps(receipt_data)
        db.session.commit()

        return jsonify({
            'success': True,
            'line_item': new_line_item
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding line item: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to add line item'}), 500
