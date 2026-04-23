"""reconcile line_item total_price to price_per_item x quantity

Revision ID: 7ebf97147f9e
Revises: 76997c37f508
Create Date: 2026-04-22 07:28:48.637179

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7ebf97147f9e'
down_revision = '76997c37f508'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE receipt_line_items
        SET total_price = ROUND(price_per_item * quantity, 2)
        WHERE total_price <> ROUND(price_per_item * quantity, 2)
          AND deleted_at IS NULL
        """
    )


def downgrade():
    # Irreversible: prior stale total_price values cannot be recovered.
    pass
