from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from backend.db import get_db_connection

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()

    return dict(user) if user else None

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            (username, email, hashed_password)
        )
        conn.commit()

        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()

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

@auth_bp.route('/login', methods=['POST'])
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

    session['user_id'] = user['id']

    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email']
        }
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/user', methods=['GET'])
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
