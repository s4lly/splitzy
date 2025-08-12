@echo off
echo Starting Chop It Up Application...

:: Check for Python virtual environment (create under repo root)
if not exist ..\venv (
    echo Setting up Python virtual environment...
    python -m venv ..\venv
    call ..\venv\Scripts\activate
    pip install -r backend\requirements.txt
) else (
    call ..\venv\Scripts\activate
)

:: Check if .env file exists at repo root
if not exist ..\.env (
    echo Error: .env file not found. Please create a .env file with your configuration.
    echo Example .env file:
    echo AZURE_OPENAI_KEY=your_azure_openai_key
    echo AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
    echo AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment
    echo SECRET_KEY=your_flask_secret_key
    exit /b 1
)

:: Make the uploads directory if it doesn't exist (under backend)
if not exist backend\uploads mkdir backend\uploads

:: Start the backend in a new command window
echo Starting Flask backend server...
start cmd /k "call ..\venv\Scripts\activate && python -m backend.app"

:: Wait for backend to start
timeout /t 2 /nobreak > nul

:: Navigate to frontend directory and ensure node modules are installed
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

:: Start frontend in a new window
echo Starting React frontend...
start cmd /k "npm run dev"

echo.
echo Both servers are running.

:: Extract port from REACT_APP_API_URL environment variable
if defined REACT_APP_API_URL (
    :: Extract port from URL like http://localhost:5000/api
    for /f "tokens=2 delims=:" %%a in ("%REACT_APP_API_URL%") do (
        for /f "tokens=1 delims=/" %%b in ("%%a") do (
            set BACKEND_PORT=%%b
        )
    )
    if defined BACKEND_PORT (
        echo Backend: http://localhost:%BACKEND_PORT%
    ) else (
        echo Backend: http://localhost:5001
    )
) else (
    echo Backend: http://localhost:5001
)

echo Frontend: http://localhost:5173
echo Close the command windows to stop the servers. 