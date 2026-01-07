from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import IntegrityError
from svix.webhooks import Webhook, WebhookVerificationError

from models import db
from models.user import User


webhooks_bp = Blueprint("webhooks", __name__, url_prefix="/api")


@webhooks_bp.route("/webhooks/clerk", methods=["POST"])
def clerk_webhook():
    """
    Handle Clerk webhook events, specifically user.created events.
    Creates a new user record in the database with the Clerk user ID.
    """
    # Get webhook secret from app config (validated at startup)
    webhook_secret = current_app.config.get("CLERK_WEBHOOK_SECRET")

    # Get webhook headers
    svix_id = request.headers.get("svix-id")
    svix_timestamp = request.headers.get("svix-timestamp")
    svix_signature = request.headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        current_app.logger.warning("Missing required Svix headers")
        return jsonify({"error": "Missing required headers"}), 400

    # Get raw payload
    payload = request.get_data()

    # Verify webhook signature
    try:
        webhook = Webhook(webhook_secret)
        headers = {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }
        msg = webhook.verify(payload, headers)
    except WebhookVerificationError as e:
        current_app.logger.warning(f"Webhook verification failed: {str(e)}")
        return jsonify({"error": "Invalid signature"}), 401
    except Exception as e:
        current_app.logger.error(f"Webhook verification error: {str(e)}")
        return jsonify({"error": "Verification error"}), 500

    # Parse the verified payload
    # webhook.verify() returns a dict directly
    event_data = msg
    event_type = event_data.get("type")

    # Only handle user.created events
    if event_type != "user.created":
        current_app.logger.info(f"Ignoring webhook event type: {event_type}")
        return jsonify({"message": "Event type not handled"}), 200

    # Extract user ID from the webhook data
    try:
        user_data = event_data.get("data", {})
        clerk_user_id = user_data.get("id")
        if not clerk_user_id:
            current_app.logger.error("Missing user ID in webhook data")
            return jsonify({"error": "Missing user ID"}), 400
    except Exception as e:
        current_app.logger.error(f"Failed to extract user ID: {str(e)}")
        return jsonify({"error": "Invalid user data"}), 400

    # Create new user record
    try:
        new_user = User(auth_user_id=clerk_user_id)
        db.session.add(new_user)
        db.session.commit()

        current_app.logger.info(f"Created user with auth_user_id: {clerk_user_id}")
        return jsonify({"success": True, "user_id": new_user.id}), 200
    except IntegrityError:
        db.session.rollback()
        current_app.logger.warning(
            f"User with auth_user_id {clerk_user_id} already exists"
        )
        return jsonify({"error": "User already exists"}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to create user: {str(e)}")
        return jsonify({"error": "Failed to create user"}), 500
