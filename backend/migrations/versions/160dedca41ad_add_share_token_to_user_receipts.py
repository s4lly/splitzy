"""add share_token to user_receipts

Revision ID: 160dedca41ad
Revises: 7ebf97147f9e
Create Date: 2026-05-03 12:03:51.723038

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '160dedca41ad'
down_revision = '7ebf97147f9e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user_receipts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('share_token', sa.String(length=32), nullable=True))
        batch_op.create_index(batch_op.f('ix_user_receipts_share_token'), ['share_token'], unique=True)


def downgrade():
    with op.batch_alter_table('user_receipts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_receipts_share_token'))
        batch_op.drop_column('share_token')
