import sys
import os

# Add the current directory to Python path if running directly
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    # Also add parent directory to handle relative imports for local development
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend import create_app
except ImportError:
    # If running from within backend directory, import directly
    from __init__ import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 