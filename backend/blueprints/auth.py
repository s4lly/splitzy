from clerk_backend_api.security.types import AuthenticateRequestOptions
from flask import current_app, request

from models.user import User


def get_current_user():
    """
    Authenticate the current request using Clerk and return the associated User.
    Returns the User object if authenticated, None otherwise.
    """
    # Skip authentication for OPTIONS preflight requests (they don't have auth headers)
    if request.method == "OPTIONS":
        current_app.logger.warning(
            "[auth.get_current_user] OPTIONS preflight request, skipping auth"
        )
        return None

    current_app.logger.warning(
        f"[auth.get_current_user] Starting authentication for {request.method} request"
    )

    try:
        # Get authorized parties precomputed at app startup
        authorized_parties = current_app.config.get("AUTHORIZED_PARTIES")
        if not authorized_parties:
            current_app.logger.error(
                "[auth.get_current_user] AUTHORIZED_PARTIES not configured"
            )
            return None

        current_app.logger.warning(
            f"[auth.get_current_user] Using authorized parties: {authorized_parties}"
        )

        # Get cached Clerk SDK instance from app config
        sdk = current_app.config.get("CLERK_SDK")
        if not sdk:
            current_app.logger.error(
                "[auth.get_current_user] CLERK_SDK not configured in app config"
            )
            return None

        current_app.logger.warning(
            "[auth.get_current_user] Attempting Clerk authentication"
        )

        # Log request method and all headers for warningging
        current_app.logger.warning(
            f"[auth.get_current_user] Request method: {request.method}"
        )
        current_app.logger.warning(
            f"[auth.get_current_user] All request headers: {dict(request.headers)}"
        )

        # Check if Authorization header is present
        # Try multiple ways to access the header (case-insensitive)
        auth_header = (
            request.headers.get("Authorization")
            or request.headers.get("authorization")
            or request.headers.get("AUTHORIZATION")
        )
        if not auth_header:
            current_app.logger.warning(
                f"[auth.get_current_user] No Authorization header found for "
                f"{request.method} request to {request.path}"
            )
            # If there's no Authorization header, Clerk can't authenticate
            # Return None early to avoid calling authenticate_request
            return None
        else:
            current_app.logger.warning(
                f"[auth.get_current_user] Authorization header present: "
                f"{auth_header[:20]}..."
            )

        try:
            request_state = sdk.authenticate_request(
                request,
                AuthenticateRequestOptions(authorized_parties=authorized_parties),
            )
            current_app.logger.warning(
                "[auth.get_current_user] Clerk authentication successful"
            )
        except Exception as clerk_error:
            current_app.logger.warning(
                f"[auth.get_current_user] Clerk authentication error: {clerk_error}",
                exc_info=True,
            )
            return None

        # Extract the user ID from the authenticated request
        payload = getattr(request_state, "payload", None) or {}
        current_app.logger.warning(
            f"[auth.get_current_user] Extracted payload keys: {list(payload.keys())}"
        )

        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            current_app.logger.warning(
                "[auth.get_current_user] Clerk auth failed: no 'sub' in payload. "
                f"Available keys: {list(payload.keys())}"
            )
            return None

        current_app.logger.warning(
            f"[auth.get_current_user] Found Clerk user ID: {clerk_user_id}"
        )

        # Look up the user in the database by auth_user_id
        user = User.query.filter_by(auth_user_id=clerk_user_id, deleted_at=None).first()
        if not user:
            current_app.logger.warning(
                f"[auth.get_current_user] No user found in DB for "
                f"auth_user_id '{clerk_user_id}'"
            )
            return None

        current_app.logger.warning(
            f"[auth.get_current_user] User authenticated successfully: "
            f"user_id={user.id}, auth_user_id={user.auth_user_id}"
        )
        return user

    except KeyError as e:
        current_app.logger.error(
            f"[auth.get_current_user] Missing required config key: {str(e)}"
        )
        return None
    except Exception as e:
        current_app.logger.error(
            f"[auth.get_current_user] Unexpected error: {str(e)}",
            exc_info=True,
        )
        return None
