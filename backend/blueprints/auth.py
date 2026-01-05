import os

from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from flask import current_app, request

from models.user import User


def get_current_user():
    """
    Authenticate the current request using Clerk and return the associated User.
    Returns the User object if authenticated, None otherwise.
    """
    try:
        # Get Clerk secret key from app config
        clerk_secret_key = current_app.config["CLERK_SECRET_KEY"]

        # Get frontend origins from environment (comma-separated) or default to Vite default port
        frontend_origins = current_app.config.get(
            "FRONTEND_ORIGINS", "http://localhost:5173"
        )
        authorized_parties = [origin.strip() for origin in frontend_origins.split(",")]

        # Authenticate the request using Clerk
        sdk = Clerk(bearer_auth=clerk_secret_key)
        request_state = sdk.authenticate_request(
            request, AuthenticateRequestOptions(authorized_parties=authorized_parties)
        )

        # Extract the user ID from the authenticated request
        clerk_user_id = request_state.user_id
        if not clerk_user_id:
            return None

        # Look up the user in the database by auth_user_id
        user = User.query.filter_by(auth_user_id=clerk_user_id, deleted_at=None).first()
        return user

    except Exception as e:
        current_app.logger.error(f"Error authenticating user: {str(e)}")
        return None
