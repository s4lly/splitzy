from clerk_backend_api.security.types import AuthenticateRequestOptions
from flask import current_app, request

from models.user import User


def get_current_user():
    """
    Authenticate the current request using Clerk and return the associated User.
    Returns the User object if authenticated, None otherwise.
    """
    try:
        # Get authorized parties precomputed at app startup
        authorized_parties = current_app.config["AUTHORIZED_PARTIES"]

        # Get cached Clerk SDK instance from app config
        sdk = current_app.config["CLERK_SDK"]
        try:
            request_state = sdk.authenticate_request(
                request,
                AuthenticateRequestOptions(authorized_parties=authorized_parties),
            )
        except Exception as clerk_error:
            current_app.logger.warning(
                f"[auth.get_current_user] Clerk authentication error: {clerk_error}"
            )
            return None

        # Extract the user ID from the authenticated request
        payload = getattr(request_state, "payload", None) or {}
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            current_app.logger.warning(
                "[auth.get_current_user] Clerk authentication failed: no sub in payload"
            )
            return None

        # Look up the user in the database by auth_user_id
        user = User.query.filter_by(auth_user_id=clerk_user_id, deleted_at=None).first()
        if not user:
            current_app.logger.warning(
                f"[auth.get_current_user] No user found in DB for auth_user_id '{clerk_user_id}'"
            )
            return None

        return user

    except Exception as e:
        current_app.logger.error(f"[auth.get_current_user] Unexpected error: {str(e)}")
        return None
