# Splitzy Backend

Flask-based REST API backend for the Splitzy receipt splitting application.

## Setup

1. **Create and activate virtual environment:**

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Code Quality

This project uses [Ruff](https://docs.astral.sh/ruff/) for linting, import sorting, and code formatting.

### Install Ruff (if not already installed)

```bash
pip install ruff
```

### Running Ruff

**Check for linting issues (without fixing):**

```bash
cd backend
ruff check .
```

**Auto-fix linting issues (including removing unused imports and sorting imports):**

```bash
cd backend
ruff check --fix .
```

**Format code (similar to Black):**

```bash
cd backend
ruff format .
```

**Run both linting fixes and formatting:**

```bash
cd backend
ruff check --fix . && ruff format .
```

### What Ruff Checks

- **E**: pycodestyle errors (PEP 8 style)
- **F**: Pyflakes errors (including F401 for unused imports)
- **I**: isort-compatible import sorting

## Project Structure

```
backend/
├── app.py              # Application entry point
├── db.py               # Database configuration
├── blueprints/         # API route handlers
│   ├── auth.py         # Authentication endpoints
│   └── receipts.py     # Receipt CRUD endpoints
├── models/             # SQLAlchemy database models
│   ├── user.py
│   ├── user_receipt.py
│   └── receipt_line_item.py
├── schemas/            # Pydantic validation schemas
│   └── receipt.py
├── scripts/            # Utility scripts for backend operations
├── migrations/         # Alembic database migrations
├── tests/              # pytest test files
└── docs/               # Documentation
```

## Scripts

The `backend/scripts/` directory contains utility scripts for managing backend operations and infrastructure. These scripts can be run from any directory within the project, as they automatically detect the project root.

### Available Scripts

#### `restart_zero_cache.sh`

Restarts the zero-cache service with a cleared cache. This is useful after schema changes or when the cache becomes stale.

**What it does:**

- Stops the zero-cache service
- Clears the zero-cache data volume (removes container and volume)
- Restarts the zero-cache service with fresh cache (will resync from PostgreSQL)

**Usage:**

From project root:

```bash
./backend/scripts/restart_zero_cache.sh
# or
backend/scripts/restart_zero_cache.sh
```

From backend directory:

```bash
./scripts/restart_zero_cache.sh
# or
scripts/restart_zero_cache.sh
```

The script will:

1. Display what actions will be performed
2. Ask for confirmation before proceeding
3. Only execute if you confirm with "yes"

## Testing

```bash
cd backend
source venv/bin/activate
pytest
```
