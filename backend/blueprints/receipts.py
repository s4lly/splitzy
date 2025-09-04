import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from models import db
from models.user_receipt import UserReceipt
from models.receipt_line_item import ReceiptLineItem
from image_analyzer import ImageAnalyzer
from schemas.receipt import LineItem, LineItemResponse, RegularReceiptResponse, UserReceiptCreate, ReceiptLineItemCreate
from werkzeug.utils import secure_filename
from blueprints.auth import get_current_user
from pydantic import ValidationError

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
    provider = 'gemini'

    # Save the file temporarily
    temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
    file.save(temp_path)

    try:
        analyzer = ImageAnalyzer(provider=provider)
        try:
            receipt_model = analyzer.analyze_image(temp_path)
        except Exception as analyzer_error:
            current_app.logger.error(f"Error from image analyzer: {str(analyzer_error)}")
            return jsonify({
                'success': False,
                'error': f"Image analysis failed: {str(analyzer_error)}"
            }), 500

        # Check if receipt_model is an error dict from _process_response
        if isinstance(receipt_model, dict):
            if receipt_model.get("error") or (receipt_model.get("success") is False):
                # Return error response directly
                return jsonify({
                    'success': False,
                    'error': receipt_model.get("error", "Unknown error occurred")
                }), 400
            else:
                # It's a dict but not an error - this shouldn't happen with proper Pydantic validation
                # but handle it gracefully
                return jsonify({
                    'success': True,
                    'is_receipt': False,
                    'receipt_data': receipt_model
                })

        # receipt_model should be a Pydantic model at this point
        if not hasattr(receipt_model, 'model_dump'):
            # This shouldn't happen, but handle it gracefully
            current_app.logger.error(f"Unexpected receipt_model type: {type(receipt_model)}")
            return jsonify({
                'success': False,
                'error': 'Invalid response format from image analyzer'
            }), 500

        if hasattr(receipt_model, 'is_receipt') and receipt_model.is_receipt:
            receipt_create_data = UserReceiptCreate.model_validate(receipt_model)
            
            # Add the additional fields that aren't in the Pydantic model
            receipt_create_data.user_id = current_user.id if current_user else None
            receipt_create_data.image_path = temp_path
            
            # Create the SQLAlchemy model instance
            new_receipt = UserReceipt(**receipt_create_data.model_dump())
            db.session.add(new_receipt)
            
            if hasattr(receipt_model, 'line_items') and receipt_model.line_items:
                for item in receipt_model.line_items:
                    # Use Pydantic model_validate to automatically map fields
                    line_item_data = ReceiptLineItemCreate.model_validate(item)
                    
                    # Create the SQLAlchemy model instance
                    line_item = ReceiptLineItem(**line_item_data.model_dump())
                    
                    # Use the relationship to automatically set the foreign key
                    new_receipt.line_items.append(line_item)
            
            db.session.commit()

            return jsonify({
                'success': True,
                'is_receipt': True,
                'receipt_data': RegularReceiptResponse.model_validate(new_receipt).model_dump()
            })
        else:
            # Not a receipt
            # Check if receipt_model has model_dump method (Pydantic model) or is a dict
            if hasattr(receipt_model, 'model_dump'):
                receipt_data = receipt_model.model_dump()
            else:
                # It's already a dict, use it directly
                receipt_data = receipt_model
                
            return jsonify({
                'success': True,
                'is_receipt': False,
                'receipt_data': receipt_data
            })
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

        # Format receipts for the response using denormalized fields
        receipts = []
        for receipt in user_receipts:
            try:
                receipt_data = RegularReceiptResponse.model_validate(receipt).model_dump(exclude={'id'})
                receipts.append({
                    'id': receipt.id,
                    'receipt_data': receipt_data,
                    'image_path': receipt.image_path,
                    'created_at': receipt.created_at.isoformat()
                })
            except Exception as receipt_error:
                current_app.logger.error(f"Error processing receipt ID {receipt.id}: {str(receipt_error)}")
                # Continue processing other receipts instead of failing completely
                continue

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
        receipt = db.session.get(UserReceipt, receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        # Format receipt for the response
        response_receipt = {
            'id': receipt.id,
            'receipt_data': RegularReceiptResponse.model_validate(receipt).model_dump(exclude={'id'}),
            'image_path': receipt.image_path,
            'created_at': receipt.created_at.isoformat()
        }

        return jsonify({
            'success': True,
            'receipt': response_receipt
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching receipt ID {receipt_id}: {str(e)}")
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
        current_app.logger.error(f"Error deleting receipt ID {receipt_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to delete receipt'}), 500

@receipts_bp.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy'})

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/image', methods=['GET'])
def get_receipt_image(receipt_id):
    """Get the image for a specific receipt"""
    try:
        receipt = db.session.get(UserReceipt, receipt_id)

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
        current_app.logger.error(f"Error retrieving receipt image for receipt ID {receipt_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to retrieve receipt image'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/assignments', methods=['PUT'])
def update_receipt_assignments(receipt_id):
    """Update the assignments for a single line item in a specific receipt"""
    data = request.get_json()
    if not data or 'line_item_id' not in data or 'assignments' not in data:
        return jsonify({'success': False, 'error': 'Missing line_item_id or assignments data'}), 400

    try:
        line_item_id = data['line_item_id']
        assignments = data['assignments']

        line_item = ReceiptLineItem.query.filter_by(id=line_item_id, receipt_id=receipt_id).first()

        if not line_item:
            return jsonify({'success': False, 'error': 'Line item not found'}), 404

        line_item.assignments = assignments
        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating assignments for line item {line_item_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to update assignments'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items/<item_id>', methods=['PUT'])
def update_line_item(receipt_id, item_id):
    """Update any property of a specific line item in a receipt"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No update data provided'}), 400

    try:
        # Find the line item by id in the line items table
        line_item = ReceiptLineItem.query.filter_by(
            id=item_id, 
            receipt_id=receipt_id
        ).first()

        if not line_item:
            return jsonify({'success': False, 'error': 'Line item not found'}), 404

        # Define explicit allowlist of mutable fields for line items
        MUTABLE_LINE_ITEM_FIELDS = {
            'name', 'quantity', 'price_per_item', 'total_price', 'assignments'
        }
        
        # Update only allowed line item properties
        for key, value in data.items():
            if key in MUTABLE_LINE_ITEM_FIELDS:
                setattr(line_item, key, value)
            else:
                current_app.logger.warning(f"[update_line_item] Attempted to update disallowed field '{key}' for line item (ignored)")

        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[update_line_item] Error for receipt ID {receipt_id}, item ID {item_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to update line item'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/receipt-data', methods=['PUT'])
def update_receipt_data(receipt_id):
    """Update any property of the receipt data (RegularReceipt)"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No update data provided'}), 400

    try:
        receipt = db.session.get(UserReceipt, receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        # Update the receipt properties directly on the model
        for key, value in data.items():
            # Only allow updating valid UserReceipt properties
            # Exclude line_items as they have their own endpoint, and id/user_id for security
            if key not in ['line_items', 'id', 'user_id', 'created_at'] and hasattr(receipt, key):
                setattr(receipt, key, value)
            else:
                if key in ['line_items', 'id', 'user_id', 'created_at']:
                    current_app.logger.warning(f"[update_receipt_data] Attempted to update restricted field: {key}")
                else:
                    current_app.logger.warning(f"[update_receipt_data] Invalid field '{key}' for receipt")

        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[update_receipt_data] Error for receipt ID {receipt_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to update receipt data'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items/<item_id>', methods=['DELETE'])
def delete_line_item(receipt_id, item_id):
    """Delete a specific line item from a receipt"""
    try:
        # Find the line item by id in the line items table
        line_item = ReceiptLineItem.query.filter_by(
            id=item_id, 
            receipt_id=receipt_id
        ).first()

        if not line_item:
            return jsonify({'success': False, 'error': 'Line item not found'}), 404

        # Delete the line item
        db.session.delete(line_item)
        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"[delete_line_item] Error for receipt ID {receipt_id}, item ID {item_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to delete line item'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items', methods=['GET'])
def get_line_items(receipt_id):
    """Get all line items for a specific receipt"""
    try:
        receipt = db.session.get(UserReceipt, receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        # Get line items from the database
        line_items = ReceiptLineItem.query.filter_by(receipt_id=receipt_id).all()

        # Format line items for response using Pydantic serialization
        items = []
        for item in line_items:
            line_item_response = LineItemResponse.model_validate(item)
            items.append(line_item_response.model_dump())

        return jsonify({
            'success': True,
            'line_items': items
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching line items for receipt ID {receipt_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch line items'}), 500

@receipts_bp.route('/api/user/receipts/<int:receipt_id>/line-items', methods=['POST'])
def add_line_item(receipt_id):
    """Add a new line item to a receipt"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No line item data provided'}), 400

    try:
        # Validate the incoming data using the LineItem model
        validation_data = {k: v for k, v in data.items() if k not in ['id']}
        line_item_validated = LineItem(**validation_data)
    except ValidationError as e:
        return jsonify({'success': False, 'error': f'Invalid line item data: {e}'}), 400

    try:
        receipt = db.session.get(UserReceipt, receipt_id)

        if not receipt:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404

        # Create new line item using the relationship
        new_line_item = ReceiptLineItem(**line_item_validated.model_dump())
        receipt.line_items.append(new_line_item)
        db.session.commit()

        # Return the created line item using Pydantic serialization
        line_item_response = LineItemResponse.model_validate(new_line_item)
        return jsonify({
            'success': True,
            'line_item': line_item_response.model_dump()
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding line item to receipt ID {receipt_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to add line item'}), 500
