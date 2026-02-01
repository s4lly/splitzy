"""disable autoincrement for zero managed tables

Revision ID: f4581a533603
Revises: 1954b05ce143
Create Date: 2026-01-25 11:11:41.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4581a533603'
down_revision = '1954b05ce143'
branch_labels = None
depends_on = None


def upgrade():
    """
    Convert receipt_users and assignments tables to use ULID (Text) IDs instead of BigInteger.
    These tables now use client-generated ULID IDs via Zero mutators.
    
    Steps:
    1. Drop sequences if they exist (no longer needed)
    2. Change id columns from BigInteger to Text
    3. Change receipt_user_id foreign key in assignments from BigInteger to Text
    4. Remove any default values that reference sequences
    """
    conn = op.get_bind()
    
    # Helper function to safely drop a sequence if it exists
    def drop_sequence_if_exists(sequence_name):
        # Check if sequence exists
        result = conn.execute(sa.text("""
            SELECT EXISTS (
                SELECT 1 
                FROM pg_sequences 
                WHERE schemaname = 'public' 
                AND sequencename = :seq_name
            )
        """), {"seq_name": sequence_name})
        
        exists = result.scalar()
        if exists:
            op.execute(sa.text(f"DROP SEQUENCE IF EXISTS {sequence_name} CASCADE"))
            return True
        return False
    
    # Step 1: Drop sequences if they exist (before changing column types)
    receipt_users_seq = conn.execute(sa.text(
        "SELECT pg_get_serial_sequence('receipt_users', 'id')"
    )).scalar()
    
    assignments_seq = conn.execute(sa.text(
        "SELECT pg_get_serial_sequence('assignments', 'id')"
    )).scalar()
    
    if receipt_users_seq:
        seq_name = receipt_users_seq.split('.')[-1] if '.' in receipt_users_seq else receipt_users_seq
        drop_sequence_if_exists(seq_name)
    
    if assignments_seq:
        seq_name = assignments_seq.split('.')[-1] if '.' in assignments_seq else assignments_seq
        drop_sequence_if_exists(seq_name)
    
    # Step 2: Drop foreign key constraint BEFORE changing column types
    # This is necessary because PostgreSQL won't allow changing the type of a column
    # that's referenced by a foreign key when the types are incompatible
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.drop_constraint('assignments_receipt_user_id_fkey', type_='foreignkey')
    
    # Step 3: Change receipt_users.id from BigInteger to Text
    with op.batch_alter_table('receipt_users', schema=None) as batch_op:
        batch_op.alter_column('id',
               existing_type=sa.BigInteger(),
               type_=sa.Text(),
               nullable=False,
               server_default=None,
               postgresql_using='id::text')
    
    # Step 4: Change assignments.id and receipt_user_id from BigInteger to Text
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        # Change receipt_user_id column type
        batch_op.alter_column('receipt_user_id',
               existing_type=sa.BigInteger(),
               type_=sa.Text(),
               nullable=False,
               postgresql_using='receipt_user_id::text')
        
        # Change id column type
        batch_op.alter_column('id',
               existing_type=sa.BigInteger(),
               type_=sa.Text(),
               nullable=False,
               server_default=None,
               postgresql_using='id::text')
        
        # Recreate the foreign key constraint
        batch_op.create_foreign_key(
            'assignments_receipt_user_id_fkey',
            'receipt_users',
            ['receipt_user_id'],
            ['id'],
            ondelete='CASCADE'
        )


def downgrade():
    """
    Revert receipt_users and assignments tables back to BigInteger with auto-increment.
    This recreates sequences and converts Text IDs back to BigInteger.
    
    WARNING: This will fail if there are ULID values that cannot be converted to numbers.
    Only use this if you need to rollback before any ULID data is inserted.
    """
    conn = op.get_bind()
    
    # Step 1: Change columns back to BigInteger
    # Note: This will fail if ULID strings exist - they cannot be converted to numbers
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        # Drop foreign key first
        batch_op.drop_constraint('assignments_receipt_user_id_fkey', type_='foreignkey')
        
        # Convert receipt_user_id back to BigInteger (will fail if ULIDs exist)
        batch_op.alter_column('receipt_user_id',
               existing_type=sa.Text(),
               type_=sa.BigInteger(),
               nullable=False,
               postgresql_using='receipt_user_id::bigint')
        
        # Convert id back to BigInteger (will fail if ULIDs exist)
        batch_op.alter_column('id',
               existing_type=sa.Text(),
               type_=sa.BigInteger(),
               nullable=False,
               server_default=None)
        
        # Recreate foreign key
        batch_op.create_foreign_key(
            'assignments_receipt_user_id_fkey',
            'receipt_users',
            ['receipt_user_id'],
            ['id'],
            ondelete='CASCADE'
        )
    
    with op.batch_alter_table('receipt_users', schema=None) as batch_op:
        batch_op.alter_column('id',
               existing_type=sa.Text(),
               type_=sa.BigInteger(),
               nullable=False,
               server_default=None,
               postgresql_using='id::bigint')
    
    # Step 2: Create sequences
    receipt_users_max = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM receipt_users")).scalar() or 0
    assignments_max = conn.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM assignments")).scalar() or 0
    
    op.execute(sa.text(f"""
        CREATE SEQUENCE IF NOT EXISTS receipt_users_id_seq
        START WITH {receipt_users_max + 1}
    """))
    
    op.execute(sa.text(f"""
        CREATE SEQUENCE IF NOT EXISTS assignments_id_seq
        START WITH {assignments_max + 1}
    """))
    
    # Step 3: Set default values to use sequences
    with op.batch_alter_table('receipt_users', schema=None) as batch_op:
        batch_op.alter_column('id',
               existing_type=sa.BigInteger(),
               nullable=False,
               server_default=sa.text("nextval('receipt_users_id_seq'::regclass)"),
               autoincrement=True)
    
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.alter_column('id',
               existing_type=sa.BigInteger(),
               nullable=False,
               server_default=sa.text("nextval('assignments_id_seq'::regclass)"),
               autoincrement=True)
