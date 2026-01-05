import datetime
import os

import jwt
from flask import Blueprint, current_app, jsonify, make_response, request, session
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.user import User


auth_bp = Blueprint("auth", __name__, url_prefix="/api")


def get_current_user():
    # Check if we're in non-production mode and should use JWT tokens
    vercel_env = os.environ.get("VERCEL_ENV", "production")

    if vercel_env != "production":
        # Try to get user from JWT token first (for cross-origin requests)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            # Check if secret_key is available before attempting JWT decode
            secret_key = current_app.config.get("SECRET_KEY")
            if not secret_key:
                current_app.logger.error(
                    "JWT authentication failed: SECRET_KEY is not configured"
                )
                return None

            try:
                payload = jwt.decode(token, secret_key, algorithms=["HS256"])
                user_id = payload.get("user_id")
                if user_id:
                    user = db.session.get(User, user_id)
                    return user
                return None
            except jwt.ExpiredSignatureError as e:
                current_app.logger.warning(
                    "JWT authentication failed: token expired - %s", str(e)
                )
                return None
            except jwt.InvalidTokenError as e:
                current_app.logger.warning(
                    "JWT authentication failed: invalid token - %s", str(e)
                )
                return None

    # Fall back to session-based authentication
    user_id = session.get("user_id")
    if not user_id:
        return None

    user = db.session.get(User, user_id)
    return user


def create_jwt_token(user_id):
    """Create a JWT token for the user"""
    # Retrieve the signing secret from app config
    secret_key = current_app.config.get("SECRET_KEY")
    if not secret_key:
        error_msg = "JWT token creation failed: SECRET_KEY is not configured"
        current_app.logger.error(error_msg)
        raise ValueError(error_msg)

    # Ensure secret_key is str or bytes for jwt library
    if not isinstance(secret_key, (str, bytes)):
        error_msg = f"JWT token creation failed: SECRET_KEY must be str or bytes, got {type(secret_key)}"
        current_app.logger.error(error_msg)
        raise TypeError(error_msg)

    # Get JWT TTL from config or default to 7 days
    jwt_ttl_days = current_app.config.get("JWT_TTL_DAYS", 7)

    # Use timezone-aware UTC datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    exp_time = now + datetime.timedelta(days=jwt_ttl_days)

    payload = {
        "user_id": user_id,
        "iat": now,  # issued at
        "nbf": now,  # not before
        "exp": exp_time,  # expires
    }

    return jwt.encode(payload, secret_key, algorithm="HS256")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if (
        not data
        or not data.get("username")
        or not data.get("email")
        or not data.get("password")
    ):
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

    new_user = User(username=username, email=email, password=hashed_password)

    try:
        db.session.add(new_user)
        db.session.commit()

        response_data = {
            "success": True,
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
            },
        }

        # In non-production mode, use JWT tokens instead of session cookies
        vercel_env = os.environ.get("VERCEL_ENV", "production")
        if vercel_env != "production":
            jwt_token = create_jwt_token(new_user.id)
            response_data["token"] = jwt_token
        else:
            # In production, use session cookies
            session["user_id"] = new_user.id
            session.permanent = True  # Make session persistent

        response = make_response(jsonify(response_data), 201)
        return response
    except IntegrityError:
        db.session.rollback()
        return jsonify(
            {"success": False, "error": "Username or email already exists"}
        ), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"success": False, "error": "Missing username or password"}), 400

    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"success": False, "error": "Invalid credentials"}), 401

    response_data = {
        "success": True,
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }

    # In non-production mode, use JWT tokens instead of session cookies
    vercel_env = os.environ.get("VERCEL_ENV", "production")
    if vercel_env != "production":
        jwt_token = create_jwt_token(user.id)
        response_data["token"] = jwt_token
    else:
        # In production, use session cookies
        session["user_id"] = user.id
        session.permanent = True  # Make session persistent

    response = make_response(jsonify(response_data))
    return response


@auth_bp.route("/logout", methods=["POST"])
def logout():
    # In non-production mode, JWT tokens are handled client-side
    # In production mode, clear session cookies
    vercel_env = os.environ.get("VERCEL_ENV", "production")
    if vercel_env == "production":
        session.pop("user_id", None)
        session.clear()

    response = make_response(
        jsonify({"success": True, "message": "Logged out successfully"})
    )

    return response


@auth_bp.route("/user", methods=["GET"])
def get_user():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Not authenticated"}), 401

    return jsonify(
        {
            "success": True,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        }
    )
