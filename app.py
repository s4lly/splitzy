import os
from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, jsonify, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from image_analyzer import analyze_image
from dotenv import load_dotenv
from flask_cors import CORS
import sqlite3
import uuid
import datetime
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS with credentials support
app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey")  # Required for sessions
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=7)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize SQLite database
def get_db_connection():
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS user_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        receipt_data TEXT NOT NULL,
        image_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Authentication Middleware
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    
    return dict(user) if user else None

# User Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # Hash the password
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    
    try:
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            (username, email, hashed_password)
        )
        conn.commit()
        
        # Get the user for session
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        # Set session
        session['user_id'] = user['id']
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Username or email already exists'}), 409
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing username or password'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    # Set session
    session['user_id'] = user['id']
    
    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/user', methods=['GET'])
def get_user():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    })

@app.route('/')
def index():
    # Get list of uploaded files to display
    files = os.listdir(app.config['UPLOAD_FOLDER']) if os.path.exists(app.config['UPLOAD_FOLDER']) else []
    return render_template('index.html', files=files)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/analyze/<filename>')
def analyze(filename):
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    analysis_result = analyze_image(image_path)
    return render_template('analysis.html', filename=filename, result=analysis_result)

@app.route('/api/analyze/<filename>')
def api_analyze(filename):
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    analysis_result = analyze_image(image_path)
    return jsonify(analysis_result)

@app.route('/upload', methods=['POST'])
def upload_file():
    # Check if the post request has the file part
    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)
    
    file = request.files['file']
    
    # If user does not select file, browser also
    # submits an empty part without filename
    if file.filename == '':
        flash('No selected file')
        return redirect(url_for('index'))
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        flash('File successfully uploaded')
        
        # Redirect to analysis page
        return redirect(url_for('analyze', filename=filename))
    else:
        flash('Allowed file types are png, jpg, jpeg, gif')
        return redirect(url_for('index'))

@app.route('/api/analyze-receipt', methods=['POST'])
def analyze_receipt():
    """API endpoint for receipt analysis"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also
    # submits an empty part without filename
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Analyze the receipt
        result = analyze_image(filepath)
        
        # Store the receipt data in the database
        if result.get('success') and 'receipt_data' in result:
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                
                # Insert receipt data into the database
                cursor.execute(
                    'INSERT INTO user_receipts (user_id, receipt_data, image_path) VALUES (?, ?, ?)',
                    (current_user['id'], json.dumps(result['receipt_data']), filepath)
                )
                
                # Get the ID of the inserted receipt
                receipt_id = cursor.lastrowid
                
                conn.commit()
                conn.close()
                
                # Add the ID to the response data
                result['receipt_data']['id'] = receipt_id
                result['receipt_data']['created_at'] = datetime.datetime.now().isoformat()
                print("Receipt inserted")
                
            except Exception as e:
                app.logger.error(f"Error saving receipt: {str(e)}")
                # Continue even if saving fails - the analysis will still be returned
        
        # Return the analysis result as JSON
        return jsonify(result)
    
    return jsonify({'success': False, 'error': 'Invalid file type'}), 400

@app.route('/api/user/receipts', methods=['GET'])
def get_user_receipts():
    """Get all receipts for the current user"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    try:
        conn = get_db_connection()
        # Get all receipts for the user, ordered by most recent first
        rows = conn.execute(
            'SELECT id, receipt_data, image_path, created_at FROM user_receipts WHERE user_id = ? ORDER BY created_at DESC',
            (current_user['id'],)
        ).fetchall()
        conn.close()
        
        # Format receipts for the response
        receipts = []
        for row in rows:
            # The receipt_data is already the receipt data object
            receipt_data = json.loads(row['receipt_data'])
            receipts.append({
                'id': row['id'],
                'receipt_data': receipt_data,
                'image_path': row['image_path'],
                'created_at': row['created_at']
            })
        
        return jsonify({
            'success': True,
            'receipts': receipts
        })
    
    except Exception as e:
        app.logger.error(f"Error fetching receipt history: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch receipt history'}), 500

@app.route('/api/user/receipts/<int:receipt_id>', methods=['GET'])
def get_user_receipt(receipt_id):
    """Get a specific receipt by ID"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    try:
        conn = get_db_connection()
        # Get the specific receipt, ensuring it belongs to the current user
        row = conn.execute(
            'SELECT id, receipt_data, image_path, created_at FROM user_receipts WHERE id = ? AND user_id = ?',
            (receipt_id, current_user['id'])
        ).fetchone()
        conn.close()
        
        if not row:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404
        
        # Format receipt for the response
        receipt_data = json.loads(row['receipt_data'])
        receipt = {
            'id': row['id'],
            'receipt_data': receipt_data,
            'image_path': row['image_path'],
            'created_at': row['created_at']
        }
        
        return jsonify({
            'success': True,
            'receipt': receipt
        })
    
    except Exception as e:
        app.logger.error(f"Error fetching receipt: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch receipt'}), 500

@app.route('/api/user/receipts/<int:receipt_id>', methods=['DELETE'])
def delete_user_receipt(receipt_id):
    """Delete a specific receipt by ID"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    try:
        conn = get_db_connection()
        
        # First check if the receipt exists and belongs to the user
        row = conn.execute(
            'SELECT id FROM user_receipts WHERE id = ? AND user_id = ?',
            (receipt_id, current_user['id'])
        ).fetchone()
        
        if not row:
            conn.close()
            return jsonify({'success': False, 'error': 'Receipt not found or you do not have permission to delete it'}), 404
        
        # Delete the receipt
        conn.execute(
            'DELETE FROM user_receipts WHERE id = ?',
            (receipt_id,)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Receipt deleted successfully'
        })
    
    except Exception as e:
        app.logger.error(f"Error deleting receipt: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to delete receipt'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy'})

@app.route('/api/user/receipts/<int:receipt_id>/image', methods=['GET'])
def get_receipt_image(receipt_id):
    """Get the image for a specific receipt"""
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    try:
        conn = get_db_connection()
        # Get the receipt image path from the database
        row = conn.execute(
            'SELECT image_path FROM user_receipts WHERE id = ? AND user_id = ?',
            (receipt_id, current_user['id'])
        ).fetchone()
        conn.close()
        
        # Check if receipt exists and has an image path
        if not row or not row['image_path']:
            return jsonify({'success': False, 'error': 'Receipt image not found'}), 404
        
        image_path = row['image_path']
        
        # Check if the file exists on disk
        if not os.path.isfile(image_path):
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
            os.path.dirname(image_path),
            os.path.basename(image_path),
            mimetype=content_type
        )
        
    except Exception as e:
        app.logger.error(f"Error retrieving receipt image: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to retrieve receipt image'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 