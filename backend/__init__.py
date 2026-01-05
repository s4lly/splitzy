import datetime
import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine


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
    secret_key = os.environ.get("SECRET_KEY")
    if not secret_key and vercel_env == "production":
        raise ValueError("SECRET_KEY environment variable is required for production")
    app.secret_key = secret_key or "supersecretkey"

    # Validate required environment variables and store in app config
    clerk_secret_key = os.environ.get("CLERK_SECRET_KEY")
    if not clerk_secret_key:
        raise ValueError(
            "CLERK_SECRET_KEY environment variable is required for Clerk authentication"
        )
    app.config["CLERK_SECRET_KEY"] = clerk_secret_key

    vercel_function_url = os.environ.get("VERCEL_FUNCTION_URL")
    if not vercel_function_url:
        raise ValueError(
            "VERCEL_FUNCTION_URL environment variable is required for blob storage functionality"
        )

    # ============================================================================
    # Session Cookie Configuration
    # ============================================================================
    # Configure session cookies based on environment
    if vercel_env != "production":
        # In non-production, minimize session cookie usage since we use JWT tokens
        app.config["SESSION_COOKIE_HTTPONLY"] = False  # Override default True
        app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # Override default None
        app.config["PERMANENT_SESSION_LIFETIME"] = datetime.timedelta(
            minutes=1
        )  # Override default 31 days
    else:
        # In production, use secure session cookies for cross-origin
        app.config["SESSION_COOKIE_SAMESITE"] = (
            "None"  # Override default None for cross-origin
        )
        app.config["SESSION_COOKIE_SECURE"] = True  # Override default False for HTTPS
        app.config["PERMANENT_SESSION_LIFETIME"] = datetime.timedelta(
            days=7
        )  # Override default 31 days

    # ============================================================================
    # Paths & Directories
    # ============================================================================
    BASE_DIR = Path(__file__).resolve().parent
    UPLOAD_FOLDER = str(BASE_DIR / "uploads")
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    # Create uploads folder if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # ============================================================================
    # Database Configuration
    # ============================================================================
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

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    # Configure migrations directory
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    migrate = Migrate(app, db, directory=migrations_dir)

    # ============================================================================
    # Blueprints Registration
    # ============================================================================
    from blueprints import receipts, webhooks

    app.register_blueprint(webhooks.webhooks_bp)
    app.register_blueprint(receipts.receipts_bp)

    return app
