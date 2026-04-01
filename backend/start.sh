#!/bin/bash
# Start the backend development server.
#
# OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES suppresses the macOS fork() crash that
# occurs because httpx (used by clerk_backend_api) initialises Objective-C /
# Grand-Central-Dispatch resources in the master process before Gunicorn forks
# its worker processes.  This env-var must be set at the process level (not via
# Python's os.environ) so it is present before the Python runtime itself boots.
#
# Usage (from the backend/ directory):
#   ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate the local virtualenv so we never accidentally run a global gunicorn.
if [ -f "$SCRIPT_DIR/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.venv/bin/activate"
elif [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/venv/bin/activate"
fi

export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
exec gunicorn --config gunicorn.conf.py app:app
