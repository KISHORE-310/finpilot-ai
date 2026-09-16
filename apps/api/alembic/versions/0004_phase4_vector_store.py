"""phase4 knowledge vectors table

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-16 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        op.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_vectors (
                id VARCHAR(255) PRIMARY KEY,
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                embedding vector(1536),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_knowledge_vectors_embedding
            ON knowledge_vectors USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 10);
        """)
    else:
        # SQLite fallback for test environments
        op.create_table(
            'knowledge_vectors',
            sa.Column('id', sa.String(length=255), primary_key=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('metadata', sa.Text(), nullable=True),
            sa.Column('embedding', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("DROP TABLE IF EXISTS knowledge_vectors;")
    else:
        op.drop_table('knowledge_vectors')
