#!/bin/bash

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Chop It Up Application...${NC}"

# Resolve paths relative to the repo root regardless of current working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check for Python virtual environment (create it under backend directory)
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo -e "${BLUE}Setting up Python virtual environment...${NC}"
    python3 -m venv "$SCRIPT_DIR/venv"
    source "$SCRIPT_DIR/venv/bin/activate"
    pip install -r "$SCRIPT_DIR/requirements.txt"
else
    source "$SCRIPT_DIR/venv/bin/activate"
fi

# Check if .env file exists in backend directory
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found. Please create a .env file with your configuration.${NC}"
    echo -e "Example .env file:"
    echo -e "${BLUE}AZURE_OPENAI_KEY=your_azure_openai_key"
    echo -e "AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint"
    echo -e "AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment"
    echo -e "SECRET_KEY=your_flask_secret_key${NC}"
    exit 1
fi

# Make the uploads directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/uploads"

# Start the backend in the background
echo -e "${GREEN}Starting Flask backend server...${NC}"
(cd "$SCRIPT_DIR" && python app.py) &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Navigate to frontend directory and ensure node modules are installed
cd "$REPO_ROOT/frontend" || exit
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}Starting React frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
    echo -e "${RED}Shutting down servers...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Keep the script running
echo -e "${GREEN}Both servers are running.${NC}"

# Extract port from REACT_APP_API_URL environment variable
if [ -n "$REACT_APP_API_URL" ]; then
    # Extract port from URL like http://localhost:5000/api
    BACKEND_PORT=$(echo "$REACT_APP_API_URL" | sed -n 's/.*localhost:\([0-9]*\).*/\1/p')
    if [ -n "$BACKEND_PORT" ]; then
        echo -e "Backend: http://localhost:$BACKEND_PORT"
    else
        echo -e "Backend: http://localhost:5001"
    fi
else
    echo -e "Backend: http://localhost:5001"
fi

echo -e "Frontend: http://localhost:5173"
echo -e "Press Ctrl+C to stop both servers."
wait 