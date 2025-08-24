"""copy_item_uuid_to_id_and_remove_item_uuid_column

Revision ID: 2cb916bbb47d
Revises: 53dbed776d5e
Create Date: 2025-08-23 17:25:12.249483

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '2cb916bbb47d'
down_revision = '53dbed776d5e'
branch_labels = None
depends_on = None


# --- File: backend/migrations/versions/2cb916bbb47d_copy_item_uuid_to_id_and_remove_item_.py ---

def upgrade():
    # Copy item_uuid -> id with robust collision handling.
    # Phase 1: compute targets and move only colliding rows to temporary UUIDs.
    connection = op.get_bind()
    import uuid

    rows = connection.execute(
        text("SELECT id, item_uuid FROM receipt_line_items")
    ).mappings().all()

    existing_ids = {r["id"] for r in rows}
    used_ids = set(existing_ids)
    target_by_old = {}

    # Determine unique final targets per row
    for r in rows:
        old_id = r["id"]
        target = r["item_uuid"] or str(uuid.uuid4())
        while target in used_ids:
            target = str(uuid.uuid4())
        target_by_old[old_id] = target
        used_ids.add(target)

    # Phase 1: move rows that would collide with any current id to a temp UUID
    temp_for_old = {}
    for old_id, target in target_by_old.items():
        if target in existing_ids and target != old_id:
            tmp = str(uuid.uuid4())  # 36 chars fits String(36)
            while tmp in used_ids:
                tmp = str(uuid.uuid4())
            connection.execute(
                text("UPDATE receipt_line_items SET id = :tmp WHERE id = :old"),
                {"tmp": tmp, "old": old_id},
            )
            temp_for_old[old_id] = tmp
            used_ids.add(tmp)

    # Phase 2: set final targets (from placeholder when applicable)
    for original_old, final_target in target_by_old.items():
        current_old = temp_for_old.get(original_old, original_old)
        if final_target != current_old:
            connection.execute(
                text("UPDATE receipt_line_items SET id = :new WHERE id = :old"),
                {"new": final_target, "old": current_old},
            )

    # Then remove the item_uuid column and its index
    with op.batch_alter_table('receipt_line_items', schema=None) as batch_op:
        batch_op.drop_index('ix_receipt_line_items_item_uuid')
        batch_op.drop_column('item_uuid')


def downgrade():
    raise RuntimeError("Irreversible migration: id values have been rewritten to UUIDs.")
