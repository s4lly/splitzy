# Database Migration Guide

This guide explains how to verify and run database migrations for the Splitzy backend project.

## Overview

The project uses **Flask-Migrate** (which uses **Alembic** under the hood) to manage database schema migrations. The presence of the `alembic_version` table in your PostgreSQL database confirms that migrations are set up and have been run at least once.

## Prerequisites

1. **Activate the virtual environment:**

   ```bash
   cd backend
   source venv/bin/activate
   ```

2. **Ensure environment variables are set:**

   - `DATABASE_URL` or `NEON_DATABASE_URL` should be configured in `backend/.env`
   - The database connection string should point to your PostgreSQL database

3. **Verify Flask-Migrate is installed:**
   ```bash
   pip list | grep Flask-Migrate
   ```
   You should see `Flask-Migrate==4.0.7` (or similar version)

## Migration Commands

All migration commands must be run from the `backend/` directory with the virtual environment activated.

### 1. Check Current Migration Status

To see which migration revision is currently applied to your database:

```bash
cd backend
source venv/bin/activate
flask db current
```

This will output the current revision ID (e.g., `6cc783342a7a`) or show that the database is up to date.

### 2. View Migration History

To see all available migrations and their status:

```bash
flask db history
```

This shows the complete migration chain with revision IDs and descriptions.

### 3. Check for Pending Migrations

To see if there are migrations that haven't been applied:

```bash
flask db heads
```

This shows the latest migration revision. Compare this with `flask db current` to see if you're behind.

### 4. Show Migration Details

To see detailed information about a specific migration:

```bash
flask db show <revision_id>
```

Example:

```bash
flask db show 6cc783342a7a
```

### 5. Run Migrations (Upgrade)

To apply all pending migrations to bring your database up to date:

```bash
flask db upgrade
```

This will apply all migrations that haven't been run yet, in order.

**To upgrade to a specific revision:**

```bash
flask db upgrade <revision_id>
```

Example:

```bash
flask db upgrade 6cc783342a7a
```

### 6. Rollback Migrations (Downgrade)

⚠️ **Warning:** Only use this in development. Rolling back migrations can cause data loss.

To rollback the last migration:

```bash
flask db downgrade
```

To rollback to a specific revision:

```bash
flask db downgrade <revision_id>
```

Example:

```bash
flask db downgrade 2ff8dc210cb7
```

## Verifying Migration Status

### Method 1: Using Flask-Migrate Commands

```bash
# Check current revision
flask db current

# Check latest available revision
flask db heads

# If they match, you're up to date!
```

### Method 2: Direct Database Query

You can also check the `alembic_version` table directly in PostgreSQL:

```sql
SELECT * FROM alembic_version;
```

This will show the current revision ID stored in the database.

### Method 3: Compare with Migration Files

List all migration files:

```bash
ls -la backend/migrations/versions/*.py
```

The migration files are:

- `d46372914063_initial_sqlite_schema.py`
- `ed0b1b9e0c7b_sqlite_to_postgresql_migration.py`
- `2ff8dc210cb7_fix_foreign_key_relationships.py`
- `6cc783342a7a_create_assignment_table.py` (latest)

The latest migration should match what `flask db heads` shows.

## Common Workflows

### Initial Setup (First Time)

If you're setting up a fresh database:

```bash
cd backend
source venv/bin/activate
flask db upgrade
```

This will apply all migrations from scratch.

### After Pulling New Code

When you pull code that includes new migrations:

```bash
cd backend
source venv/bin/activate
flask db current    # Check current status
flask db upgrade    # Apply new migrations
```

### Creating New Migrations

If you've modified models and need to create a new migration:

```bash
cd backend
source venv/bin/activate
flask db migrate -m "Description of changes"
```

This creates a new migration file in `backend/migrations/versions/`. Review the generated file before applying it.

## Troubleshooting

### Issue: "Target database is not up to date"

**Solution:**

```bash
flask db upgrade
```

### Issue: "Can't locate revision identified by 'xxxxx'"

This means the database references a migration that doesn't exist in your codebase. This can happen if:

- Migration files were deleted
- You're on a different branch
- Database is out of sync

**Solution:**

1. Check which revision the database thinks it's on:
   ```bash
   flask db current
   ```
2. Check what migrations exist:
   ```bash
   flask db history
   ```
3. If needed, manually update the `alembic_version` table (use with caution):
   ```sql
   UPDATE alembic_version SET version_num = '<revision_id>';
   ```

### Issue: Migration fails with foreign key errors

This can happen if there's existing data that violates new constraints.

**Solution:**

1. Review the migration file to understand what it's trying to do
2. Manually fix the data issues
3. Retry the migration

### Issue: "No changes detected" when creating migrations

If Flask-Migrate doesn't detect model changes:

1. Ensure all models are imported in your application initialization
2. Check that models are properly defined with SQLAlchemy
3. Try running with verbose output:
   ```bash
   flask db migrate -m "Description" --verbose
   ```

## Migration File Structure

Migration files are located in `backend/migrations/versions/` and follow this naming pattern:

```
<revision_id>_<description>.py
```

Each migration file contains:

- `revision`: Unique identifier for this migration
- `down_revision`: The previous migration this builds upon
- `upgrade()`: Function that applies the migration
- `downgrade()`: Function that rolls back the migration

## Validating Models Match Database Schema

There are several ways to verify that your SQLAlchemy models match the current database schema:

### Method 1: Using Flask-Migrate Autogenerate (Recommended)

The easiest way is to use Flask-Migrate's autogenerate feature, which will detect any differences:

```bash
cd backend
source venv/bin/activate
flask db migrate -m "Check for differences"
```

**What to expect:**

- If models match the database: No migration file will be created (or an empty one that gets skipped)
- If there are differences: A new migration file will be created showing what needs to change

**Important:** Don't commit this migration if you're just checking - you can delete the generated file if no changes are needed.

### Method 2: Using the Validation Script

A validation script is provided at `backend/docs/migrations/validate_models.py` that compares your models with the database:

```bash
cd backend
source venv/bin/activate
python docs/migrations/validate_models.py
```

This script will:

- ✅ Check if all model tables exist in the database
- ✅ Compare column definitions (names, types, nullable)
- ✅ Identify missing or extra columns
- ✅ Show migration status

**Example output:**

```
======================================================================
SQLAlchemy Models vs Database Schema Validation
======================================================================

📊 Table Comparison:
----------------------------------------------------------------------
✅ All model tables exist in database

🔍 Column Comparison:
----------------------------------------------------------------------

📋 Checking table: users
  ✅ Table 'users' schema matches model

📋 Checking table: user_receipts
  ✅ Table 'user_receipts' schema matches model

📋 Checking table: receipt_line_items
  ✅ Table 'receipt_line_items' schema matches model

======================================================================
Summary
======================================================================
✅ All models match the database schema!
```

### Method 3: Manual SQLAlchemy Inspection

You can also write a quick Python script to inspect the database:

```python
from __init__ import create_app
from models import db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)

    # List all tables
    print("Database tables:", inspector.get_table_names())

    # Inspect a specific table
    columns = inspector.get_columns('users')
    for col in columns:
        print(f"{col['name']}: {col['type']}")
```

### Method 4: Direct Database Query

You can query PostgreSQL's information schema directly:

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Get column details for a table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

### When to Validate

Run validation:

- ✅ After pulling new code that includes model changes
- ✅ Before deploying to production
- ✅ After manually modifying the database schema
- ✅ When you suspect models and database are out of sync
- ✅ As part of your CI/CD pipeline

### Interpreting Results

**If validation shows differences:**

1. **Models ahead of database:**

   - Run `flask db migrate` to create a migration
   - Review the generated migration
   - Apply with `flask db upgrade`

2. **Database ahead of models:**

   - Check if migrations were applied manually
   - Update your models to match the database
   - Or create a migration to sync them

3. **Both have different changes:**
   - This requires careful review
   - Compare model definitions with database schema
   - Create a migration that reconciles the differences

## Best Practices

1. **Always check status before upgrading:**

   ```bash
   flask db current
   flask db heads
   ```

2. **Review generated migrations** before applying them, especially in production

3. **Test migrations** in a development environment first

4. **Backup your database** before running migrations in production

5. **Never edit applied migrations** - create a new migration to fix issues

6. **Keep migrations in version control** - they're part of your codebase

## Quick Reference

| Command                     | Description                             |
| --------------------------- | --------------------------------------- |
| `flask db current`          | Show current database revision          |
| `flask db heads`            | Show latest available migration         |
| `flask db history`          | Show all migrations                     |
| `flask db upgrade`          | Apply all pending migrations            |
| `flask db upgrade <rev>`    | Upgrade to specific revision            |
| `flask db downgrade`        | Rollback last migration                 |
| `flask db downgrade <rev>`  | Rollback to specific revision           |
| `flask db migrate -m "msg"` | Create new migration from model changes |
| `flask db show <rev>`       | Show details of a migration             |
| `python docs/migrations/validate_models.py` | Validate models match database schema   |

## Additional Resources

- [Flask-Migrate Documentation](https://flask-migrate.readthedocs.io/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- Migration files: `backend/migrations/versions/`
- Migration configuration: `backend/migrations/alembic.ini`

