# Splitzy

A full-stack application for receipt analysis, expense tracking, and bill splitting among friends.

## Overview

Splitzy is a web application that allows users to upload receipts or bills, analyzes them using AI to extract line items and amounts, and provides an interface to split expenses among friends. The application consists of a Flask backend API that processes receipt images using OpenAI's vision capabilities, and a React frontend that provides a user-friendly interface.

## Features

- **Receipt Analysis**: Upload receipt images and extract structured data including merchant, date, line items, tax, and totals
- **Bill Splitting**: Assign items to different people and calculate how much each person owes
- **User Authentication**: Register and login to save and access your receipts
- **Expense History**: View past receipts and their analyses
- **Responsive Design**: Mobile-friendly interface works on all devices
- **Dark/Light Mode**: Toggle between light and dark themes
- **Tax Distribution**: Automatically distributes tax proportionally based on item assignments

## Project Structure

```
project-root/
├── backend/
│   ├── app.py              # Flask backend application
│   ├── image_analyzer.py   # Receipt analysis logic using OpenAI
│   ├── requirements.txt    # Python dependencies
│   ├── uploads/            # Directory for uploaded receipt images
│   ├── templates/          # Jinja templates
│   └── static/             # Static assets for Flask
└── frontend/               # React frontend application
    ├── src/                # React source code
    ├── public/             # Static assets
    ├── package.json        # Node.js dependencies
    └── tailwind.config.js  # Tailwind CSS configuration
```

## Technology Stack

### Backend

- **Flask**: Python web framework for the API
- **OpenAI API**: AI for receipt image analysis
- **SQLite**: Database for storing user information and receipts
- **Flask-CORS**: Cross-Origin Resource Sharing support

### Frontend

- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Lucide React**: Icon library
- **Shadcn UI**: UI component library

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for full local development stack)

### Environment Variables

This project uses `.env.example` files as templates. Copy them to create your local configuration:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Then edit the `.env` files with your actual values. For local-only overrides, you can also create `.env.local` files which take priority.

### Development Modes

You can develop in two ways:

#### Option A: Connect to Deployed Environment (Simpler)

For simple changes or quick testing, connect directly to a deployed database:

1. Get the `DATABASE_URL` from your dev/staging environment (e.g., Neon)
2. Set it in `backend/.env`
3. Start the backend and frontend as described below

This approach doesn't require Docker.

#### Option B: Full Local Development Stack (Recommended for Zero features)

For working on Zero sync features or testing with a fresh database, run the complete stack locally using Docker:

```bash
# First-time setup (with database restore from a dump file)
./backend/scripts/setup-local-db.sh mydumpfile.bak

# Or start fresh without restoring data
./backend/scripts/setup-local-db.sh
```

This starts:

- **PostgreSQL** at `localhost:5432`
- **Zero Query API** at `localhost:3000`
- **Zero Cache** at `localhost:4848`

Set this in `backend/.env`:

```
DATABASE_URL=postgresql://postgres:pass@localhost:5432/splitzy
```

**Docker commands:**

```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose down -v        # Stop and delete all data
docker-compose logs -f        # Follow logs
```

**Updating a single service:**

To update one service without restarting the others (e.g., after making changes to `zero-query`):

```bash
# Rebuild and restart a single service
docker-compose up -d --build zero-query-local

# Just restart without rebuilding
docker-compose up -d zero-query-local

# Force recreate even if nothing changed
docker-compose up -d --force-recreate zero-query-local

# Clean rebuild (no cache)
docker-compose build --no-cache zero-query-local
docker-compose up -d zero-query-local
```

This works for any service: `db-splitzy-local`, `zero-query-local`, or `zero-cache-local`. Dependent services will automatically reconnect after the updated service becomes healthy.

### Backend Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Navigate to the backend directory and create/activate a virtual environment:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (see [Environment Variables](#environment-variables) above):

   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and other values
   ```

5. Run database migrations (if using a fresh database):

   ```bash
   flask db upgrade
   ```

6. **Start the Flask application:**
   ```bash
   python app.py
   ```
   The backend will start at http://localhost:5001

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will start at http://localhost:5173

## Usage

1. Register or login to your account
2. Upload a receipt image from your device
3. The AI will analyze the receipt and extract items and amounts
4. Add the names of people who participated in the expense
5. Assign items to different people
6. View how much each person owes, with tax automatically distributed

## Development

### Running Tests

```bash
# Backend tests
pytest

# Frontend tests
cd frontend
npm test
```

## License

[MIT License](LICENSE)

## Acknowledgements

- OpenAI for the vision API capabilities
- All open-source libraries and frameworks used in this project
