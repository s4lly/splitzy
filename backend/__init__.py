import os
from pathlib import Path
from flask import Flask
from dotenv import load_dotenv, find_dotenv
from flask_cors import CORS
import datetime

def create_app():
    # Load environment variables
    load_dotenv(find_dotenv())

    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey")
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=7)

    # Configure paths
    BASE_DIR = Path(__file__).resolve().parent
    UPLOAD_FOLDER = str(BASE_DIR / 'uploads')
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

    # Create uploads folder if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Initialize database
    from . import db
    db.init_app(app)

    # Register blueprints
    from .blueprints import main, auth, receipts
    app.register_blueprint(main.main_bp)
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(receipts.receipts_bp)

    return app
