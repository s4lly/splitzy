"""Denormalize receipt fields and add receipt_line_items

Revision ID: 2b9e6f3a4df1
Revises: ba982e80d38e
Create Date: 2025-08-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision = '2b9e6f3a4df1'
down_revision = 'ba982e80d38e'
branch_labels = None
depends_on = None


def upgrade():
    # --- Schema changes: add columns to user_receipts ---
    op.add_column('user_receipts', sa.Column('is_receipt', sa.Boolean(), nullable=True))
    op.add_column('user_receipts', sa.Column('document_type', sa.String(length=50), nullable=True))

    op.add_column('user_receipts', sa.Column('merchant', sa.String(length=255), nullable=True))
    op.add_column('user_receipts', sa.Column('date', sa.String(length=50), nullable=True))
    op.add_column('user_receipts', sa.Column('subtotal', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('tax', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('tip', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('gratuity', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('total', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('payment_method', sa.String(length=120), nullable=True))
    op.add_column('user_receipts', sa.Column('tax_included_in_items', sa.Boolean(), nullable=True))
    op.add_column('user_receipts', sa.Column('display_subtotal', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('items_total', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('pretax_total', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('posttax_total', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('final_total', sa.Float(), nullable=True))

    op.add_column('user_receipts', sa.Column('carrier', sa.String(length=255), nullable=True))
    op.add_column('user_receipts', sa.Column('ticket_number', sa.String(length=255), nullable=True))
    op.add_column('user_receipts', sa.Column('origin', sa.String(length=255), nullable=True))
    op.add_column('user_receipts', sa.Column('destination', sa.String(length=255), nullable=True))
    op.add_column('user_receipts', sa.Column('passenger', sa.String(length=255), nullable=True))
    op.add_column('user_receipts', sa.Column('class', sa.String(length=50), nullable=True))
    op.add_column('user_receipts', sa.Column('fare', sa.Float(), nullable=True))
    op.add_column('user_receipts', sa.Column('currency', sa.String(length=10), nullable=True))
    op.add_column('user_receipts', sa.Column('taxes', sa.Float(), nullable=True))

    # --- Schema changes: create receipt_line_items ---
    op.create_table(
        'receipt_line_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('receipt_id', sa.Integer(), sa.ForeignKey('user_receipts.id'), nullable=False),
        sa.Column('item_uuid', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('price_per_item', sa.Float(), nullable=True),
        sa.Column('total_price', sa.Float(), nullable=True),
        sa.Column('assignments', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_receipt_line_items_receipt_id', 'receipt_line_items', ['receipt_id'])
    op.create_index('ix_receipt_line_items_item_uuid', 'receipt_line_items', ['item_uuid'])

    # --- Data migration: backfill new columns and line items ---
    bind = op.get_bind()
    session = sa.orm.Session(bind=bind)

    user_receipts_table = sa.Table(
        'user_receipts', sa.MetaData(),
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('receipt_data', sa.Text),
        sa.Column('is_receipt', sa.Boolean),
        sa.Column('document_type', sa.String(50)),
        sa.Column('merchant', sa.String(255)),
        sa.Column('date', sa.String(50)),
        sa.Column('subtotal', sa.Float),
        sa.Column('tax', sa.Float),
        sa.Column('tip', sa.Float),
        sa.Column('gratuity', sa.Float),
        sa.Column('total', sa.Float),
        sa.Column('payment_method', sa.String(120)),
        sa.Column('tax_included_in_items', sa.Boolean),
        sa.Column('display_subtotal', sa.Float),
        sa.Column('items_total', sa.Float),
        sa.Column('pretax_total', sa.Float),
        sa.Column('posttax_total', sa.Float),
        sa.Column('final_total', sa.Float),
        sa.Column('carrier', sa.String(255)),
        sa.Column('ticket_number', sa.String(255)),
        sa.Column('origin', sa.String(255)),
        sa.Column('destination', sa.String(255)),
        sa.Column('passenger', sa.String(255)),
        sa.Column('class', sa.String(50)),
        sa.Column('fare', sa.Float),
        sa.Column('currency', sa.String(10)),
        sa.Column('taxes', sa.Float),
    )

    receipt_line_items_table = sa.Table(
        'receipt_line_items', sa.MetaData(),
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('receipt_id', sa.Integer),
        sa.Column('item_uuid', sa.String(36)),
        sa.Column('name', sa.String(255)),
        sa.Column('quantity', sa.Integer),
        sa.Column('price_per_item', sa.Float),
        sa.Column('total_price', sa.Float),
        sa.Column('assignments', sa.Text),
    )

    def to_float(value):
        try:
            if value is None:
                return None
            return float(value)
        except Exception:
            return None

    def to_bool(value):
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            return value.lower() in ('1', 'true', 'yes')
        return None

    for receipt in session.query(user_receipts_table).all():
        try:
            data = json.loads(receipt.receipt_data) if receipt.receipt_data else {}
        except Exception:
            data = {}

        is_receipt = data.get('is_receipt')
        document_type = data.get('document_type')

        update_values = {
            'is_receipt': to_bool(is_receipt),
            'document_type': document_type,
        }

        # Explicitly call to_bool once and only skip when it's explicitly False
        is_receipt_bool = to_bool(is_receipt)
        if is_receipt_bool is False:
            # Not a receipt; minimal fields
            session.execute(
                user_receipts_table.update()
                .where(user_receipts_table.c.id == receipt.id)
                .values(update_values)
            )
            continue

        # …rest of migration logic for receipts…
        if document_type == 'transportation_ticket':
            update_values.update({
                'carrier': data.get('carrier'),
                'ticket_number': data.get('ticket_number'),
                'date': data.get('date'),
                'origin': data.get('origin'),
                'destination': data.get('destination'),
                'passenger': data.get('passenger'),
                'class': data.get('class') or data.get('class_'),
                'fare': to_float(data.get('fare')),
                'currency': data.get('currency'),
                'taxes': to_float(data.get('taxes')),
                'total': to_float(data.get('total')),
            })
        else:
            # Regular receipt fields
            update_values.update({
                'merchant': data.get('merchant'),
                'date': data.get('date'),
                'subtotal': to_float(data.get('subtotal')),
                'tax': to_float(data.get('tax')),
                'tip': to_float(data.get('tip')),
                'gratuity': to_float(data.get('gratuity')),
                'total': to_float(data.get('total')) or to_float(data.get('final_total')),
                'payment_method': data.get('payment_method'),
                'tax_included_in_items': to_bool(data.get('tax_included_in_items')),
                'display_subtotal': to_float(data.get('display_subtotal')),
                'items_total': to_float(data.get('items_total')),
                'pretax_total': to_float(data.get('pretax_total')),
                'posttax_total': to_float(data.get('posttax_total')),
                'final_total': to_float(data.get('final_total')),
            })

        session.execute(
            user_receipts_table.update().where(user_receipts_table.c.id == receipt.id).values(update_values)
        )

        # Insert line items
        line_items = data.get('line_items') or []
        for item in line_items:
            item_uuid = str(item.get('id')) if item.get('id') is not None else None
            assignments = item.get('assignments')
            assignments_text = None
            try:
                if assignments is not None:
                    assignments_text = json.dumps(assignments)
            except Exception:
                assignments_text = None

            session.execute(
                receipt_line_items_table.insert().values(
                    receipt_id=receipt.id,
                    item_uuid=item_uuid,
                    name=item.get('name'),
                    quantity=item.get('quantity'),
                    price_per_item=to_float(item.get('price_per_item')),
                    total_price=to_float(item.get('total_price')),
                    assignments=assignments_text,
                )
            )

    session.commit()


def downgrade():
    # Drop indices and table
    op.drop_index('ix_receipt_line_items_item_uuid', table_name='receipt_line_items')
    op.drop_index('ix_receipt_line_items_receipt_id', table_name='receipt_line_items')
    op.drop_table('receipt_line_items')

    # Drop added columns from user_receipts
    for col in [
        'taxes', 'currency', 'fare', 'class', 'passenger', 'destination', 'origin', 'ticket_number', 'carrier',
        'final_total', 'posttax_total', 'pretax_total', 'items_total', 'display_subtotal', 'tax_included_in_items', 'payment_method', 'total', 'gratuity', 'tip', 'tax', 'subtotal', 'date', 'merchant', 'document_type', 'is_receipt'
    ]:
        try:
            op.drop_column('user_receipts', col)
        except Exception:
            # SQLite batch mode might be required in some cases; ignore if already dropped
            pass
