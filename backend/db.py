import sqlite3
import click
from flask import current_app, g
from flask.cli import with_appcontext
from pathlib import Path
import uuid

def get_db():
    if 'db' not in g:
        db_path = Path(current_app.root_path) / 'users.db'
        g.db = sqlite3.connect(str(db_path))
        g.db.execute('PRAGMA foreign_keys = ON')
        g.db.row_factory = sqlite3.Row

    return g.db

def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()

def init_db():
    db = get_db()

    db.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    db.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')

    db.execute('''
    CREATE TABLE IF NOT EXISTS user_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        receipt_data TEXT NOT NULL,
        image_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

@click.command('migrate-receipt-line-items')
@with_appcontext
def migrate_receipt_line_items_command():
    """Add a unique 'id' and an 'assignments' array to each object in the line_items array in receipt_data for all user_receipts."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, receipt_data FROM user_receipts")
    rows = cursor.fetchall()
    updated_count = 0
    for row in rows:
        receipt_id, receipt_data_str = row
        try:
            data = json.loads(receipt_data_str)
            line_items = data.get("line_items", [])
            modified = False
            for item in line_items:
                if "id" not in item:
                    item["id"] = str(uuid.uuid4())
                    modified = True
                if "assignments" not in item:
                    item["assignments"] = []
                    modified = True
            if modified:
                data["line_items"] = line_items
                new_receipt_data_str = json.dumps(data)
                cursor.execute(
                    "UPDATE user_receipts SET receipt_data = ? WHERE id = ?",
                    (new_receipt_data_str, receipt_id)
                )
                updated_count += 1
                click.echo(f"Updated receipt {receipt_id}")
        except Exception as e:
            click.echo(f"Error processing receipt {receipt_id}: {e}")
    conn.commit()
    click.echo(f"Migration complete. Updated {updated_count} receipts.")


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(migrate_receipt_line_items_command)

def get_db_connection():
    db_path = Path(__file__).resolve().parent / 'users.db'
    conn = sqlite3.connect(str(db_path))
    # Enforce foreign key constraints
    conn.execute('PRAGMA foreign_keys = ON')
    conn.row_factory = sqlite3.Row
    return conn
