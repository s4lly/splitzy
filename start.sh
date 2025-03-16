#!/bin/bash

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Chop It Up Application...${NC}"

# Check for Python virtual environment
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Setting up Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found. Please create a .env file with your configuration.${NC}"
    echo -e "Example .env file:"
    echo -e "${BLUE}AZURE_OPENAI_KEY=your_azure_openai_key"
    echo -e "AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint"
    echo -e "AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment"
    echo -e "SECRET_KEY=your_flask_secret_key${NC}"
    exit 1
fi

# Make the uploads directory if it doesn't exist
mkdir -p uploads

# Start the backend in the background
echo -e "${GREEN}Starting Flask backend server...${NC}"
python app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Navigate to frontend directory and ensure node modules are installed
cd chop-it-up-frontend
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}Starting React frontend...${NC}"
npm start &
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
echo -e "Backend: http://localhost:5000"
echo -e "Frontend: http://localhost:3000"
echo -e "Press Ctrl+C to stop both servers."
wait 