import os
from pathlib import Path
from flask import Flask
from dotenv import load_dotenv, find_dotenv
from flask_cors import CORS
import datetime

def create_app():
    # Load environment variables from backend directory
    backend_dir = Path(__file__).resolve().parent
    env_path = backend_dir / '.env'
    load_dotenv(env_path)

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
    from .blueprints import main, auth, receipts
    app.register_blueprint(main.main_bp)
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(receipts.receipts_bp)

    return app
