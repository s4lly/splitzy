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

#### `create-dump.sh`

Creates a timestamped database backup using `pg_dump` in custom format. The dump file is compressed and can be restored using `pg_restore`.

**What it does:**

- Reads `DATABASE_URL` from environment (defaults to local dev if not set)
- Generates a timestamped filename: `mydumpfile-YYYY-MM-DD-HHMM.bak`
- Creates a compressed custom-format dump (best for `pg_restore`)
- Includes verbose output to show progress

**Prerequisites:**

- `pg_dump` command must be available
- `DATABASE_URL` environment variable (optional - uses local dev default if not set)
- Access to the source database

**Usage:**

From project root:

```bash
./backend/scripts/create-dump.sh
# or
backend/scripts/create-dump.sh
```

From backend directory:

```bash
./scripts/create-dump.sh
# or
scripts/create-dump.sh
```

**Output:**

The script creates a dump file in the `backend/` directory with a timestamp:
- Example: `backend/mydumpfile-2026-01-24-0830.bak`
- Format: `mydumpfile-YYYY-MM-DD-HHMM.bak`
- The custom format (`-F c`) provides best compression and flexibility

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - If not set, defaults to: `postgresql://postgres:pass@localhost:5432/splitzy`

**Note:** The dump uses custom format which is compressed and allows selective restoration. See the script comments for detailed explanation of all `pg_dump` flags.

#### `verify-dump.sh`

Verifies a database dump file by restoring it to a temporary Docker PostgreSQL container and comparing row counts with the source database.

**What it does:**

- Creates a temporary PostgreSQL container using Docker
- Restores the dump file to the temporary database
- Compares row counts for all tables between source and restored databases
- Displays a colorized comparison table (green = match, red = mismatch)
- Automatically cleans up the temporary container (even on errors)

**Prerequisites:**

- Docker must be installed and running
- `pg_restore` and `psql` commands must be available
- `DATABASE_URL` environment variable (optional - uses local dev default if not set)
- Dump file must exist and be readable

**Usage:**

From project root:

```bash
./backend/scripts/verify-dump.sh backend/mydumpfile-2026-01-24-0830.bak
# or
backend/scripts/verify-dump.sh backend/mydumpfile-2026-01-24-0830.bak
```

From backend directory:

```bash
./scripts/verify-dump.sh mydumpfile-2026-01-24-0830.bak
# or
scripts/verify-dump.sh ../backend/mydumpfile-2026-01-24-0830.bak
```

**What it checks:**

The script compares row counts for all tables in the `public` schema:
- `users`
- `user_receipts`
- `receipt_line_items`
- `alembic_version`
- `assignments`
- Any other tables found in the dump

**Output:**

The script displays:
- A comparison table showing row counts for each table
- Status indicators: ✓ MATCH (green) or ✗ DIFF (red)
- A summary indicating whether verification passed or failed

**Automatic Cleanup:**

The temporary Docker container is automatically removed when the script exits, even if:
- The script completes successfully
- An error occurs
- The script is interrupted (Ctrl+C)

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string for the source database
  - Format: `postgresql://user:password@host:port/database`
  - If not set, defaults to: `postgresql://postgres:pass@localhost:5432/splitzy`

**Interpreting Results:**

- **All matches (✓)**: The dump file contains all your data and appears complete
- **Mismatches (✗)**: Possible reasons:
  - Data was added/modified after the dump was created
  - Some tables failed to restore
  - Source database is not accessible (shows "?")

**Note:** The verification uses a temporary container on port 5433 to avoid conflicts with your main database on port 5432.

#### `restore-dump.sh`

Restores a database dump file created with `create-dump.sh` to your database. Provides clear information about what will happen during the restore process, including whether existing data will be preserved or deleted.

**What it does:**

- Restores a dump file to the target database specified by `DATABASE_URL`
- Provides two restore modes: safe (preserves existing data) or clean (drops existing objects)
- Includes extensive comments explaining restore behavior
- Asks for confirmation before proceeding
- Shows verbose progress during restore

**Prerequisites:**

- `pg_restore` command must be available
- `DATABASE_URL` environment variable (optional - uses local dev default if not set)
- Dump file must exist and be readable
- Access to the target database

**Usage:**

From project root:

```bash
# Safe restore (preserves existing data)
./backend/scripts/restore-dump.sh backend/mydumpfile-2026-01-24-0830.bak

# Clean restore (drops existing objects - WIPES DATA!)
./backend/scripts/restore-dump.sh backend/mydumpfile-2026-01-24-0830.bak --clean
```

From backend directory:

```bash
# Safe restore
./scripts/restore-dump.sh mydumpfile-2026-01-24-0830.bak

# Clean restore
./scripts/restore-dump.sh mydumpfile-2026-01-24-0830.bak --clean
```

**Restore Modes:**

**Safe Mode (default - without `--clean`):**
- Does NOT drop existing database objects
- If tables already exist, restore will fail with errors
- Your existing data is NOT touched or deleted
- Use this if you want to preserve existing data
- Best for: Adding data to an empty database or when you're sure objects don't exist

**Clean Mode (with `--clean` flag):**
- DROPS all existing database objects BEFORE restoring
- **WILL DELETE ALL EXISTING DATA** in those tables
- Tables, sequences, and other objects will be dropped and recreated
- Requires explicit confirmation (you must type "yes")
- Use this if you want to completely replace the database
- Best for: Restoring to a fresh database or completely replacing existing data

**What Gets Restored:**

- All tables and their data
- Sequences (auto-increment counters)
- Indexes
- Constraints (foreign keys, unique constraints, etc.)
- **NOT restored:** Ownership and privileges (prevents permission errors)

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string for the target database
  - Format: `postgresql://user:password@host:port/database`
  - If not set, defaults to: `postgresql://postgres:pass@localhost:5432/splitzy`

**Important Notes:**

- The script uses `-O` (no owner) and `-x` (no privileges) flags to prevent permission errors
- Custom format dumps (created with `create-dump.sh`) are required
- Plain SQL dumps cannot be restored with this script (use `psql` instead)
- Some warnings/errors may be normal (e.g., "already exists" in safe mode)
- Always verify your restore using `verify-dump.sh` or by checking your application

**Example Workflow:**

```bash
# 1. Create a dump
./backend/scripts/create-dump.sh

# 2. Verify the dump (optional but recommended)
./backend/scripts/verify-dump.sh backend/mydumpfile-2026-01-24-0830.bak

# 3. Restore the dump
./backend/scripts/restore-dump.sh backend/mydumpfile-2026-01-24-0830.bak --clean
```

## Testing

```bash
cd backend
source venv/bin/activate
pytest
```
