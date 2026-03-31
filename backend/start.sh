#!/bin/bash
# Start the backend development server.
#
# OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES suppresses the macOS fork() crash that
# occurs because httpx (used by clerk_backend_api) initialises Objective-C /
# Grand-Central-Dispatch resources in the master process before Gunicorn forks
# its worker processes.  This env-var must be set at the process level (not via
# Python's os.environ) so it is present before the Python runtime itself boots.
#
# Usage (from the backend/ directory, with the venv active):
#   ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
exec gunicorn --config gunicorn.conf.py app:app
