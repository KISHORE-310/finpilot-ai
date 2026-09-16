"""phase2 analytics snapshots and alerts

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-13 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001_initial_phase1_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'net_worth_snapshots',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('total_assets', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('total_liabilities', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('net_worth', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_net_worth_snapshots_snapshot_date', 'net_worth_snapshots', ['snapshot_date'], unique=False)
    op.create_index('ix_net_worth_snapshots_user_id', 'net_worth_snapshots', ['user_id'], unique=False)
    op.create_index('ix_net_worth_snapshots_user_date', 'net_worth_snapshots', ['user_id', 'snapshot_date'], unique=False)

    op.create_table(
        'financial_alerts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('context_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_financial_alerts_is_read', 'financial_alerts', ['is_read'], unique=False)
    op.create_index('ix_financial_alerts_user_id', 'financial_alerts', ['user_id'], unique=False)
    op.create_index('ix_financial_alerts_user_read', 'financial_alerts', ['user_id', 'is_read'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_financial_alerts_user_read', table_name='financial_alerts')
    op.drop_index('ix_financial_alerts_user_id', table_name='financial_alerts')
    op.drop_index('ix_financial_alerts_is_read', table_name='financial_alerts')
    op.drop_table('financial_alerts')

    op.drop_index('ix_net_worth_snapshots_user_date', table_name='net_worth_snapshots')
    op.drop_index('ix_net_worth_snapshots_user_id', table_name='net_worth_snapshots')
    op.drop_index('ix_net_worth_snapshots_snapshot_date', table_name='net_worth_snapshots')
    op.drop_table('net_worth_snapshots')
