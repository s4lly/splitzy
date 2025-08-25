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
    # Copy item_uuid -> id with optimized collision handling.
    # Phase 1: compute targets allowing targets equal to other rows' current ids
    # but ensuring targets are unique among themselves
    connection = op.get_bind()
    import uuid

    rows = connection.execute(
        text("SELECT id, item_uuid FROM receipt_line_items")
    ).mappings().all()

    existing_ids = {r["id"] for r in rows}
    target_by_old = {}
    target_to_old = {}  # Track which old_id each target is assigned to

    # Determine unique final targets per row, allowing targets equal to other rows' current ids
    for r in rows:
        old_id = r["id"]
        target = r["item_uuid"] or str(uuid.uuid4())
        
        # If target is already assigned to another row, generate new UUID
        while target in target_to_old and target_to_old[target] != old_id:
            target = str(uuid.uuid4())
        
        target_by_old[old_id] = target
        target_to_old[target] = old_id

    # Phase 1: update rows whose final target does not collide with any current id
    # directly to their final target
    for old_id, target in target_by_old.items():
        if target not in existing_ids or target == old_id:
            if target != old_id:
                connection.execute(
                    text("UPDATE receipt_line_items SET id = :new WHERE id = :old"),
                    {"new": target, "old": old_id},
                )

    # Phase 2: for rows where final target collides with some current id,
    # first set them to distinct temporary UUID placeholders
    temp_for_old = {}
    used_ids = set(existing_ids)
    
    # Update used_ids with the changes from Phase 1
    for old_id, target in target_by_old.items():
        if target not in existing_ids or target == old_id:
            if target != old_id:
                used_ids.remove(old_id)
                used_ids.add(target)

    for old_id, target in target_by_old.items():
        if target in existing_ids and target != old_id:
            # Generate temporary UUID that doesn't conflict with any current or target ID
            tmp = str(uuid.uuid4())
            while tmp in used_ids or tmp in target_by_old.values():
                tmp = str(uuid.uuid4())
            
            connection.execute(
                text("UPDATE receipt_line_items SET id = :tmp WHERE id = :old"),
                {"tmp": tmp, "old": old_id},
            )
            temp_for_old[old_id] = tmp
            used_ids.add(tmp)

    # Phase 3: set temporary placeholders to intended final targets
    for original_old, final_target in target_by_old.items():
        if original_old in temp_for_old:
            current_old = temp_for_old[original_old]
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
