"""
Phase 4: pgvector-backed vector store with graceful in-memory fallback.
The in-memory fallback ensures tests (which use SQLite) continue working.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from app.ai.config import ai_settings
from app.ai.rag.embeddings import EmbeddingProvider, get_embedding_provider

logger = logging.getLogger(__name__)

VECTOR_TABLE = "knowledge_vectors"


@dataclass
class VectorDocument:
    """A document chunk stored in (or retrieved from) the vector store."""
    id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    score: float = 0.0


class InMemoryVectorStore:
    """
    Purely in-memory vector store using cosine similarity.
    Used as fallback when pgvector is unavailable (e.g., test SQLite env).
    """

    def __init__(self, embedder: EmbeddingProvider) -> None:
        self._embedder = embedder
        self._docs: List[VectorDocument] = []
        self._vecs: List[List[float]] = []

    def add_documents(self, docs: List[VectorDocument]) -> None:
        texts = [d.content for d in docs]
        vecs = self._embedder.embed_texts(texts)
        for doc, vec in zip(docs, vecs):
            self._docs.append(doc)
            self._vecs.append(vec)

    def similarity_search(self, query: str, top_k: int = 5) -> List[VectorDocument]:
        if not self._docs:
            return []
        q_vec = self._embedder.embed_query(query)
        scored: List[Tuple[float, VectorDocument]] = []
        for doc, d_vec in zip(self._docs, self._vecs):
            score = _cosine(q_vec, d_vec)
            scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, doc in scored[:top_k]:
            results.append(VectorDocument(
                id=doc.id,
                content=doc.content,
                metadata=doc.metadata,
                score=score,
            ))
        return results

    def count(self) -> int:
        return len(self._docs)

    def clear(self) -> None:
        self._docs.clear()
        self._vecs.clear()


class PgVectorStore:
    """
    PostgreSQL + pgvector store using raw asyncpg for vector operations.
    Falls back to InMemoryVectorStore if extension is unavailable.
    """

    def __init__(self, embedder: EmbeddingProvider) -> None:
        self._embedder = embedder
        self._fallback = InMemoryVectorStore(embedder)
        self._available = False  # Set True after successful init

    async def initialize(self, connection_str: str) -> None:
        """Create table and ivfflat index if pgvector extension is available."""
        try:
            import asyncpg
            conn = await asyncpg.connect(connection_str)
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {VECTOR_TABLE} (
                        id TEXT PRIMARY KEY,
                        content TEXT NOT NULL,
                        metadata JSONB DEFAULT '{{}}',
                        embedding vector({self._embedder.dimension})
                    );
                """)
                self._available = True
                logger.info("pgvector store initialized successfully.")
            finally:
                await conn.close()
        except Exception as exc:
            logger.warning(f"pgvector unavailable, using in-memory fallback: {exc}")
            self._available = False

    async def add_documents(self, docs: List[VectorDocument], connection_str: str) -> None:
        if not self._available:
            self._fallback.add_documents(docs)
            return
        try:
            import asyncpg
            texts = [d.content for d in docs]
            vecs = self._embedder.embed_texts(texts)
            conn = await asyncpg.connect(connection_str)
            try:
                for doc, vec in zip(docs, vecs):
                    vec_str = "[" + ",".join(str(v) for v in vec) + "]"
                    await conn.execute(
                        f"""INSERT INTO {VECTOR_TABLE} (id, content, metadata, embedding)
                            VALUES ($1, $2, $3, $4::vector)
                            ON CONFLICT (id) DO UPDATE
                            SET content=EXCLUDED.content, metadata=EXCLUDED.metadata,
                                embedding=EXCLUDED.embedding;""",
                        doc.id, doc.content, json.dumps(doc.metadata), vec_str,
                    )
            finally:
                await conn.close()
        except Exception as exc:
            logger.error(f"pgvector add_documents failed: {exc}")
            self._fallback.add_documents(docs)

    async def similarity_search(
        self, query: str, top_k: int = 5, connection_str: Optional[str] = None
    ) -> List[VectorDocument]:
        if not self._available or connection_str is None:
            return self._fallback.similarity_search(query, top_k)
        try:
            import asyncpg
            q_vec = self._embedder.embed_query(query)
            vec_str = "[" + ",".join(str(v) for v in q_vec) + "]"
            conn = await asyncpg.connect(connection_str)
            try:
                rows = await conn.fetch(
                    f"""SELECT id, content, metadata,
                               1 - (embedding <=> $1::vector) AS score
                        FROM {VECTOR_TABLE}
                        ORDER BY embedding <=> $1::vector
                        LIMIT $2;""",
                    vec_str, top_k,
                )
                return [
                    VectorDocument(
                        id=r["id"],
                        content=r["content"],
                        metadata=json.loads(r["metadata"] or "{}"),
                        score=float(r["score"]),
                    )
                    for r in rows
                ]
            finally:
                await conn.close()
        except Exception as exc:
            logger.warning(f"pgvector similarity_search failed, using fallback: {exc}")
            return self._fallback.similarity_search(query, top_k)

    def count(self) -> int:
        return self._fallback.count()


# ─── Module-level singleton ────────────────────────────────────────────────────

_vector_store: Optional[InMemoryVectorStore | PgVectorStore] = None


def get_vector_store() -> InMemoryVectorStore:
    """Return the module-level vector store (always in-memory for sync use)."""
    global _vector_store
    if _vector_store is None:
        _vector_store = InMemoryVectorStore(get_embedding_provider())
    return _vector_store  # type: ignore[return-value]


def reset_vector_store() -> None:
    """Reset the singleton (useful in tests)."""
    global _vector_store
    _vector_store = None


# ─── Utility ──────────────────────────────────────────────────────────────────

def _cosine(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two L2-normalized vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
