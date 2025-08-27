import os
from pathlib import Path
from flask import Flask
from dotenv import load_dotenv
from flask_cors import CORS
import datetime

def create_app():
    # Load environment variables from backend directory
    backend_dir = Path(__file__).resolve().parent
    env_path = backend_dir / '.env'
    load_dotenv(env_path)

    app = Flask(__name__)
    
    # Configure CORS for cross-origin requests
    # Get allowed origins from environment variable, with fallback for development
    cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS')
    if cors_origins:
        # Split comma-separated origins
        allowed_origins = [origin.strip() for origin in cors_origins.split(',')]
    else:
        # Fallback for development
        allowed_origins = [
            'http://localhost:3000',  # For local development
            'http://localhost:5173'   # For Vite dev server
        ]
    
    CORS(app, 
         origins=allowed_origins,
         supports_credentials=True,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'])
    
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
    db_path = BASE_DIR / 'users.db'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    from backend.models import db
    from flask_migrate import Migrate
    db.init_app(app)
    
    # Configure migrations directory
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    migrate = Migrate(app, db, directory=migrations_dir)

    # Register blueprints
    from backend.blueprints import auth, receipts
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(receipts.receipts_bp)

    return app
