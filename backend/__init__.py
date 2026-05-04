import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from clerk_backend_api import Clerk
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import event
from sqlalchemy.engine import Engine
from werkzeug.middleware.proxy_fix import ProxyFix


limiter = Limiter(key_func=get_remote_address)


def create_app():
    # ============================================================================
    # Environment Setup
    # ============================================================================
    # Load environment variables from backend directory
    backend_dir = Path(__file__).resolve().parent
    env_path = backend_dir / ".env"
    load_dotenv(env_path)

    # ============================================================================
    # Flask App Creation
    # ============================================================================
    app = Flask(__name__)

    # Render terminates TLS upstream; trust X-Forwarded-* so get_remote_address
    # resolves to the real client IP instead of the proxy.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

    # ============================================================================
    # CORS Configuration
    # ============================================================================
    # Check VERCEL_ENV environment variable for non-production mode
    vercel_env = os.environ.get("VERCEL_ENV", "production")
    app.logger.info("VERCEL_ENV: %s", vercel_env)

    if vercel_env != "production":
        # In non-production mode, allow all origins without credentials
        # Simple CORS configuration since we use JWT tokens instead of cookies
        CORS(
            app,
            origins="*",  # Allow all origins
            supports_credentials=False,  # No credentials needed with JWT tokens
            methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=[
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "Accept",
                "Origin",
            ],
            expose_headers=["Content-Type", "Authorization", "X-Requested-With"],
            max_age=3600,
        )
    else:
        # In production, use configured allowed origins
        cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS")
        if not cors_origins:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS environment variable must be configured for production"
            )

        # Split comma-separated origins
        allowed_origins = [origin.strip() for origin in cors_origins.split(",")]

        CORS(
            app,
            origins=allowed_origins,
            supports_credentials=True,
            methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=[
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "Accept",
                "Origin",
            ],
            expose_headers=["Content-Type", "Authorization", "X-Requested-With"],
            max_age=3600,
        )

    # ============================================================================
    # Secret Keys & Configuration
    # ============================================================================
    # Validate required environment variables and store in app config
    clerk_secret_key = os.environ.get("CLERK_SECRET_KEY")
    if not clerk_secret_key:
        raise ValueError(
            "CLERK_SECRET_KEY environment variable is required for Clerk authentication"
        )
    app.config["CLERK_SECRET_KEY"] = clerk_secret_key

    # Initialize Clerk SDK instance and cache it in app config
    app.config["CLERK_SDK"] = Clerk(bearer_auth=clerk_secret_key)

    clerk_webhook_secret = os.environ.get("CLERK_WEBHOOK_SECRET")
    if not clerk_webhook_secret:
        raise ValueError(
            "CLERK_WEBHOOK_SECRET environment variable is required for Clerk webhook verification"
        )
    app.config["CLERK_WEBHOOK_SECRET"] = clerk_webhook_secret

    # Require CLERK_AUTHORIZED_PARTIES to be set (no default) for Clerk authentication
    clerk_authorized_parties = os.environ.get("CLERK_AUTHORIZED_PARTIES")
    if not clerk_authorized_parties:
        raise ValueError(
            "CLERK_AUTHORIZED_PARTIES environment variable is required. "
            "Used to configure authorized_parties for Clerk authentication."
        )

    # Pre-compute authorized parties list for Clerk and store in config
    authorized_parties = [
        origin.strip() for origin in clerk_authorized_parties.split(",") if origin.strip()
    ]
    if not authorized_parties:
        raise ValueError(
            "CLERK_AUTHORIZED_PARTIES must contain at least one valid origin. "
            "AUTHORIZED_PARTIES cannot be empty."
        )
    app.config["AUTHORIZED_PARTIES"] = authorized_parties
    app.logger.info(f"Configured AUTHORIZED_PARTIES: {authorized_parties}")

    vercel_function_url = os.environ.get("VERCEL_FUNCTION_URL")
    if not vercel_function_url:
        raise ValueError(
            "VERCEL_FUNCTION_URL environment variable is required for blob storage functionality"
        )

    # Cutoff for the legacy /receipts/:id preview surface. Receipts with
    # created_at < this timestamp may be reached by integer id; everything
    # newer must use the unguessable share_token. Required in production;
    # fail-closed default (epoch 0) in dev so legacy lookups always 404 unless
    # explicitly opted in.
    cutoff_iso = os.environ.get("LEGACY_ID_CUTOFF_ISO")
    if vercel_env == "production" and not cutoff_iso:
        raise ValueError(
            "LEGACY_ID_CUTOFF_ISO is required in production"
        )
    if cutoff_iso:
        try:
            cutoff_dt = datetime.fromisoformat(cutoff_iso.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValueError(
                f"LEGACY_ID_CUTOFF_ISO is not a valid ISO timestamp: {cutoff_iso!r}"
            ) from e
        if cutoff_dt.tzinfo is None:
            raise ValueError(
                f"LEGACY_ID_CUTOFF_ISO must include a timezone: {cutoff_iso!r}"
            )
        app.config["LEGACY_ID_CUTOFF"] = cutoff_dt
    else:
        app.config["LEGACY_ID_CUTOFF"] = datetime(1970, 1, 1, tzinfo=timezone.utc)

    # ============================================================================
    # Database Configuration
    # ============================================================================
    BASE_DIR = Path(__file__).resolve().parent
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("NEON_DATABASE_URL")
    if database_url:
        # Use Neon/PostgreSQL
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    else:
        # Fallback to SQLite for development
        db_path = BASE_DIR / "users.db"
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ============================================================================
    # Extensions Initialization
    # ============================================================================
    from flask_migrate import Migrate

    from models import db

    db.init_app(app)

    # Import all models to ensure SQLAlchemy can resolve string references in relationships
    # This must happen after db.init_app() but before blueprints are registered
    from models.assignment import Assignment  # noqa: F401
    from models.receipt_line_item import ReceiptLineItem  # noqa: F401
    from models.receipt_user import ReceiptUser  # noqa: F401
    from models.user import User  # noqa: F401
    from models.user_receipt import UserReceipt  # noqa: F401

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    # Configure migrations directory
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    migrate = Migrate(app, db, directory=migrations_dir)

    # Rate limiter — Redis-backed when REDIS_URL is set (Render Key Value),
    # in-memory fallback otherwise. Production requires Redis so per-process
    # counters can't be sidestepped by horizontal scaling.
    redis_url = os.environ.get("REDIS_URL")
    if vercel_env == "production":
        if not redis_url:
            raise RuntimeError("REDIS_URL is required in production")
        app.config["RATELIMIT_STORAGE_URI"] = redis_url
        app.config["RATELIMIT_IN_MEMORY_FALLBACK_ENABLED"] = False
    else:
        app.config["RATELIMIT_STORAGE_URI"] = redis_url or "memory://"
        app.config["RATELIMIT_IN_MEMORY_FALLBACK_ENABLED"] = True
    app.config["RATELIMIT_STRATEGY"] = "fixed-window"
    app.config["RATELIMIT_HEADERS_ENABLED"] = True
    limiter.init_app(app)

    # ============================================================================
    # Blueprints Registration
    # ============================================================================
    from blueprints import receipts, webhooks

    app.register_blueprint(webhooks.webhooks_bp)
    app.register_blueprint(receipts.receipts_bp)

    return app
