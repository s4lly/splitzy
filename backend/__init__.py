import os
from pathlib import Path
from flask import Flask
from dotenv import load_dotenv
from flask_cors import CORS
import datetime
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

def create_app():
    # Load environment variables from backend directory
    backend_dir = Path(__file__).resolve().parent
    env_path = backend_dir / '.env'
    load_dotenv(env_path)

    app = Flask(__name__)
    
    # Configure CORS for cross-origin requests
    # Check VERCEL_ENV environment variable for development mode
    vercel_env = os.environ.get('VERCEL_ENV', 'development')

    print(f"VERCEL_ENV: {vercel_env}")

    if vercel_env == 'development':
        # In development mode, allow all origins dynamically
        CORS(app, 
             origins=lambda: True,  # Allow all origins dynamically
             supports_credentials=True,  # Enable credentials for session cookies
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
             expose_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
             max_age=3600)
    else:
        # In production, use configured allowed origins
        cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS')
        if not cors_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS environment variable must be configured for production")
        
        # Split comma-separated origins
        allowed_origins = [origin.strip() for origin in cors_origins.split(',')]
        
        CORS(app, 
             origins=allowed_origins,
             supports_credentials=True,
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
             expose_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
             max_age=3600)
    
    app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey")
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Required for cross-origin
    app.config['SESSION_COOKIE_SECURE'] = True      # Required for HTTPS
    app.config['SESSION_COOKIE_DOMAIN'] = None      # Let Flask set the domain
    app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=7)

    # Configure paths
    BASE_DIR = Path(__file__).resolve().parent
    UPLOAD_FOLDER = str(BASE_DIR / 'uploads')
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    # Create uploads folder if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Configure database
    database_url = os.environ.get('DATABASE_URL') or os.environ.get('NEON_DATABASE_URL')
    if database_url:
        # Use Neon/PostgreSQL
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        # Fallback to SQLite for development
        db_path = BASE_DIR / 'users.db'
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    from backend.models import db
    from flask_migrate import Migrate
    db.init_app(app)

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    
    # Configure migrations directory
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    migrate = Migrate(app, db, directory=migrations_dir)

    # Register blueprints
    from backend.blueprints import auth, receipts
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(receipts.receipts_bp)

    return app
