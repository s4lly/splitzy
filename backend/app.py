#!/usr/bin/env python3
"""
Production entry point for the Flask application.
This file is designed to work with gunicorn from within the backend directory.
"""

import os
import sys

# Add the current directory to Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import the Flask app factory
from __init__ import create_app

# Create the Flask application instance
app = create_app()

if __name__ == '__main__':
    # This will only run if the file is executed directly (not through gunicorn)
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5001)))