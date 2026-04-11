"""add payment tracking and receipt soft delete

Revision ID: a1b2c3d4e5f6
Revises: 8d6982a3f40c
Create Date: 2026-04-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '8d6982a3f40c'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user_receipts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f('ix_user_receipts_deleted_at'), ['deleted_at'], unique=False)

    with op.batch_alter_table('receipt_users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('paid_at', sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade():
    with op.batch_alter_table('receipt_users', schema=None) as batch_op:
        batch_op.drop_column('paid_at')

    with op.batch_alter_table('user_receipts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_receipts_deleted_at'))
        batch_op.drop_column('deleted_at')
