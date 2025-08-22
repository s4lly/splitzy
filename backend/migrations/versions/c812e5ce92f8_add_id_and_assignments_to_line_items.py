"""Add id and assignments to line items

Revision ID: c812e5ce92f8
Revises: 863552115f92
Create Date: 2025-08-17 17:11:46.580025

"""
from alembic import op
import sqlalchemy as sa
import json
import uuid

# revision identifiers, used by Alembic.
revision = 'c812e5ce92f8'
down_revision = '863552115f92'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    session = sa.orm.Session(bind=bind)

    # Define a simple UserReceipt model for the migration
    user_receipts_table = sa.Table('user_receipts', sa.MetaData(),
                                   sa.Column('id', sa.Integer, primary_key=True),
                                   sa.Column('receipt_data', sa.Text))

    for receipt in session.query(user_receipts_table):
        try:
            data = json.loads(receipt.receipt_data)
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
                session.execute(
                    user_receipts_table.update().
                    where(user_receipts_table.c.id == receipt.id).
                    values(receipt_data=new_receipt_data_str)
                )
        except Exception as e:
            print(f"Error processing receipt {receipt.id}: {e}")

    session.commit()


def downgrade():
    # Downgrade is not strictly necessary for this migration,
    # as it only adds data. However, a proper downgrade would
    # remove the 'id' and 'assignments' keys. For simplicity,
    # we will leave it empty.
    pass
