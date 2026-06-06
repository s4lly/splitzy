"""backfill share_token and make NOT NULL

Revision ID: 350348f56766
Revises: 160dedca41ad
Create Date: 2026-05-03 18:48:09.007404

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '350348f56766'
down_revision = '160dedca41ad'
branch_labels = None
depends_on = None


def upgrade():
    # Backfill any existing NULL share_token rows with URL-safe random tokens.
    # Done in Python to avoid depending on pgcrypto and to match exactly what
    # secrets.token_urlsafe(16) produces at the model level.
    import secrets as _secrets

    bind = op.get_bind()
    rows = bind.execute(sa.text(
        "SELECT id FROM user_receipts WHERE share_token IS NULL"
    )).fetchall()
    for (row_id,) in rows:
        bind.execute(
            sa.text("UPDATE user_receipts SET share_token = :t WHERE id = :id"),
            {"t": _secrets.token_urlsafe(16), "id": row_id},
        )

    with op.batch_alter_table('user_receipts', schema=None) as batch_op:
        batch_op.alter_column('share_token',
               existing_type=sa.VARCHAR(length=32),
               nullable=False)


def downgrade():
    with op.batch_alter_table('user_receipts', schema=None) as batch_op:
        batch_op.alter_column('share_token',
               existing_type=sa.VARCHAR(length=32),
               nullable=True)
