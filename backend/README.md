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

## Database Migrations

This project uses [Flask-Migrate](https://flask-migrate.readthedocs.io/) (Alembic) for database schema migrations.

### Creating Migrations

To create a new migration after modifying models:

```bash
cd backend
source venv/bin/activate
flask db migrate -m "description of changes"
```

### Applying Migrations

To apply pending migrations:

```bash
cd backend
source venv/bin/activate
flask db upgrade
```

### Important: Model Discovery Pattern

**Always import new models in `migrations/env.py`** to ensure Alembic can discover them during autogenerate.

When you create a new model in `backend/models/`, you must add an import for it in `backend/migrations/env.py`. This is a common pattern to ensure all models are registered with SQLAlchemy's metadata, even if they're not imported elsewhere in the application code.

**Example:** After creating `backend/models/assignment.py`, add this import to `migrations/env.py`:

```python
from models.assignment import Assignment
```

**Why this is needed:**

- Models that are imported in blueprints (like `User`, `UserReceipt`, `ReceiptLineItem`) are automatically discovered because they're imported when the Flask app initializes
- New models that aren't used in blueprints yet won't be discovered unless explicitly imported in `env.py`
- Importing all models in `env.py` serves as a catch-all to ensure Alembic always sees all models

**What happens if you forget:**

If you create a new model but forget to import it in `env.py`, running `flask db migrate` may not detect the new table, and you'll need to manually create the migration or add the import and regenerate.

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

#### `setup-local-db.sh`

Sets up the local development environment with PostgreSQL and Zero services. Optionally restores the database from a dump file.

**What it does:**

- Starts the PostgreSQL container
- Waits for PostgreSQL to be ready
- Optionally restores the database from a dump file (if provided)
- Starts zero-query and zero-cache services

**Usage:**

From project root:

```bash
./backend/scripts/setup-local-db.sh
# or
backend/scripts/setup-local-db.sh

# With database restore:
./backend/scripts/setup-local-db.sh mydumpfile.bak
# or
backend/scripts/setup-local-db.sh mydumpfile.bak
```

From backend directory:

```bash
./scripts/setup-local-db.sh
# or
scripts/setup-local-db.sh

# With database restore:
./scripts/setup-local-db.sh mydumpfile.bak
# or
scripts/setup-local-db.sh mydumpfile.bak
```

The script will:

1. Display what actions will be performed
2. Ask for confirmation before proceeding
3. Only execute if you confirm with "yes"

**Note:** If you provide a dump file path, it can be relative to the project root or an absolute path.

## Testing

```bash
cd backend
source venv/bin/activate
pytest
```
