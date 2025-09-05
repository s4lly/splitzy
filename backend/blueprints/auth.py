from flask import Blueprint, request, jsonify, session, make_response, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from models import db
from models.user import User
from sqlalchemy.exc import IntegrityError
import os
import jwt
import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

def get_current_user():
    # Check if we're in development mode and should use JWT tokens
    vercel_env = os.environ.get('VERCEL_ENV', 'production')
    
    if vercel_env == 'development':
        # Try to get user from JWT token first (for cross-origin requests)
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, current_app.secret_key, algorithms=['HS256'])
                user_id = payload.get('user_id')
                if user_id:
                    user = db.session.get(User, user_id)
                    return user
            except jwt.ExpiredSignatureError:
                pass
            except jwt.InvalidTokenError:
                pass
    
    # Fall back to session-based authentication
    user_id = session.get('user_id')
    if not user_id:
        return None

    user = db.session.get(User, user_id)
    return user

def create_jwt_token(user_id):
    """Create a JWT token for the user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, current_app.secret_key, algorithm='HS256')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    new_user = User(username=username, email=email, password=hashed_password)

    try:
        db.session.add(new_user)
        db.session.commit()

        session['user_id'] = new_user.id
        session.permanent = True  # Make session persistent

        response_data = {
            'success': True,
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email
            }
        }
        
        # In development mode, also return a JWT token for cross-origin requests
        vercel_env = os.environ.get('VERCEL_ENV', 'production')
        if vercel_env == 'development':
            jwt_token = create_jwt_token(new_user.id)
            response_data['token'] = jwt_token
        
        response = make_response(jsonify(response_data), 201)
        return response
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Username or email already exists'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing username or password'}), 400

    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

    session['user_id'] = user.id
    session.permanent = True  # Make session persistent

    response_data = {
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }
    
    # In development mode, also return a JWT token for cross-origin requests
    vercel_env = os.environ.get('VERCEL_ENV', 'production')
    if vercel_env == 'development':
        jwt_token = create_jwt_token(user.id)
        response_data['token'] = jwt_token
    
    response = make_response(jsonify(response_data))
    return response

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.clear()
    
    response = make_response(jsonify({'success': True, 'message': 'Logged out successfully'}))
    
    return response

@auth_bp.route('/user', methods=['GET'])
def get_user():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    })
