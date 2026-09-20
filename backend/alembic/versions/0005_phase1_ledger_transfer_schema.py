"""phase1 ledger transfer schema and constraints

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-20 15:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add transfer_account_id column to transactions
    op.add_column('transactions', sa.Column('transfer_account_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(
        'fk_transactions_transfer_account_id_accounts',
        'transactions', 'accounts',
        ['transfer_account_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_transactions_transfer_account_id', 'transactions', ['transfer_account_id'])


def downgrade() -> None:
    op.drop_index('ix_transactions_transfer_account_id', table_name='transactions')
    op.drop_constraint('fk_transactions_transfer_account_id_accounts', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'transfer_account_id')
