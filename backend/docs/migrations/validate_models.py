#!/usr/bin/env python3
"""
Validation script to compare SQLAlchemy models with the actual database schema.

This script helps verify that your models match the current database state.
Run this from the backend directory with the virtual environment activated.

Usage:
    cd backend
    source venv/bin/activate
    python docs/migrations/validate_models.py
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the path
# Since this script is in docs/migrations/, we need to go up two directory levels to reach backend/
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from __init__ import create_app
from models import db
from sqlalchemy import inspect
from sqlalchemy.schema import CreateTable

# Import all models to ensure they're registered with SQLAlchemy
from models.user import User
from models.user_receipt import UserReceipt
from models.receipt_line_item import ReceiptLineItem


def compare_table_schema(inspector, model_class, table_name):
    """Compare a model's schema with the actual database table."""
    differences = []
    
    if not inspector.has_table(table_name):
        differences.append(f"  ❌ Table '{table_name}' does not exist in database")
        return differences
    
    # Get model columns
    model_columns = {col.name: col for col in model_class.__table__.columns}
    
    # Get database columns
    db_columns = {col['name']: col for col in inspector.get_columns(table_name)}
    
    # Check for missing columns in database
    for col_name, model_col in model_columns.items():
        if col_name not in db_columns:
            differences.append(f"  ❌ Column '{col_name}' exists in model but not in database")
        else:
            db_col = db_columns[col_name]
            # Compare types (simplified - full type comparison is complex)
            model_type = str(model_col.type)
            db_type = str(db_col['type'])
            
            # Normalize type strings for comparison
            model_type_norm = model_type.replace('VARCHAR', 'VARCHAR').replace('TEXT', 'TEXT')
            db_type_norm = db_type.replace('character varying', 'VARCHAR').replace('text', 'TEXT')
            
            # Check nullable
            if model_col.nullable != db_col['nullable']:
                differences.append(
                    f"  ⚠️  Column '{col_name}': nullable mismatch "
                    f"(model: {model_col.nullable}, db: {db_col['nullable']})"
                )
    
    # Check for extra columns in database
    for col_name in db_columns:
        if col_name not in model_columns:
            differences.append(f"  ⚠️  Column '{col_name}' exists in database but not in model")
    
    return differences


def validate_models():
    """Main validation function."""
    app = create_app()
    
    with app.app_context():
        print("=" * 70)
        print("SQLAlchemy Models vs Database Schema Validation")
        print("=" * 70)
        print()
        
        # Get database inspector
        inspector = inspect(db.engine)
        
        # Get all tables from database
        db_tables = set(inspector.get_table_names())
        
        # Get all tables from models
        model_tables = set(db.metadata.tables.keys())
        
        print("📊 Table Comparison:")
        print("-" * 70)
        
        # Check for missing tables
        missing_in_db = model_tables - db_tables
        if missing_in_db:
            print("❌ Tables in models but not in database:")
            for table in missing_in_db:
                print(f"  - {table}")
            print()
        else:
            print("✅ All model tables exist in database")
            print()
        
        # Check for extra tables (excluding alembic_version)
        extra_in_db = db_tables - model_tables - {'alembic_version'}
        if extra_in_db:
            print("⚠️  Tables in database but not in models:")
            for table in extra_in_db:
                print(f"  - {table}")
            print()
        
        # Compare each model table
        print("🔍 Column Comparison:")
        print("-" * 70)
        
        all_differences = []
        models_to_check = [
            (User, 'users'),
            (UserReceipt, 'user_receipts'),
            (ReceiptLineItem, 'receipt_line_items'),
        ]
        
        for model_class, table_name in models_to_check:
            print(f"\n📋 Checking table: {table_name}")
            differences = compare_table_schema(inspector, model_class, table_name)
            
            if differences:
                all_differences.extend(differences)
                for diff in differences:
                    print(diff)
            else:
                print(f"  ✅ Table '{table_name}' schema matches model")
        
        # Summary
        print()
        print("=" * 70)
        print("Summary")
        print("=" * 70)
        
        if not all_differences and not missing_in_db:
            print("✅ All models match the database schema!")
            print()
            print("💡 Tip: Run 'flask db migrate' to verify no pending migrations exist.")
            return 0
        else:
            print("⚠️  Differences found between models and database.")
            print()
            print("💡 Next steps:")
            print("  1. Review the differences above")
            print("  2. If models are ahead: Run 'flask db migrate' to create a migration")
            print("  3. If database is ahead: Update your models or run 'flask db upgrade'")
            print("  4. If unsure: Check migration history with 'flask db history'")
            return 1


def check_migration_status():
    """Check if there are pending migrations using Alembic API."""
    app = create_app()
    
    with app.app_context():
        try:
            from alembic import script
            from alembic.runtime.migration import MigrationContext
            from flask_migrate import Migrate
            
            # Get the migrate extension
            migrate = app.extensions.get('migrate')
            if not migrate:
                print("\n⚠️  Flask-Migrate not initialized")
                return
            
            # Get the database connection
            engine = migrate.db.engine
            connection = engine.connect()
            
            # Get migration context from database
            context = MigrationContext.configure(connection)
            current_rev = context.get_current_revision()
            
            # Get script directory to find head revision
            # Use the migrations directory path directly
            migrations_dir = migrate.directory
            script_dir = script.ScriptDirectory(migrations_dir)
            heads_rev = script_dir.get_current_head()
            
            connection.close()
            
            print("\n" + "=" * 70)
            print("Migration Status Check")
            print("=" * 70)
            
            # Handle multiple heads (branches) - heads_rev can be a tuple or string
            if isinstance(heads_rev, tuple):
                heads_display = ', '.join(heads_rev) if heads_rev else "None"
                heads_list = list(heads_rev) if heads_rev else []
            elif heads_rev is None:
                heads_display = "None (no migrations found)"
                heads_list = []
            else:
                heads_display = str(heads_rev)
                heads_list = [heads_rev]
            
            current_display = current_rev if current_rev else "None (database not initialized)"
            
            print(f"Current database revision: {current_display}")
            print(f"Latest available revision:   {heads_display}")
            
            # Compare revisions
            if current_rev is None:
                if heads_list:
                    print("⚠️  Database has no migrations applied")
                    print("   Run 'flask db upgrade' to apply all migrations")
                else:
                    print("⚠️  No migrations found in codebase")
            elif not heads_list:
                print("⚠️  No migration files found")
            elif current_rev in heads_list or current_rev == heads_rev:
                print("✅ Database is up to date with migrations")
            else:
                print("⚠️  Database is not at the latest migration")
                print("   Run 'flask db upgrade' to apply pending migrations")
            
            print()
        except Exception as e:
            print(f"\n⚠️  Could not check migration status: {e}")
            print("   This is normal if migrations haven't been initialized yet")
            import traceback
            traceback.print_exc()
            print()


if __name__ == '__main__':
    try:
        exit_code = validate_models()
        check_migration_status()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ Error during validation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


