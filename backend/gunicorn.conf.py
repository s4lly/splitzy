"""
Gunicorn configuration for local development.

NOTE: To fix the macOS fork() crash caused by httpx/clerk_backend_api initializing
Objective-C / GCD resources before Gunicorn forks workers, OBJC_DISABLE_INITIALIZE_FORK_SAFETY
must be exported as a shell-level env var BEFORE the gunicorn process starts:

    OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES gunicorn --bind localhost:5001 --config gunicorn.conf.py app:app

Setting it from Python (os.environ) inside this file does NOT work — the Python runtime
itself triggers the Obj-C initialization before any user code runs, so the env var must
already be present when the process is launched.
"""

bind = "localhost:5001"
workers = 2
# Gemini API calls with large images can take 30-60s — give generous headroom
timeout = 120
