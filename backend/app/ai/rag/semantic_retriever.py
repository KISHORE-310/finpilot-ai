"""
Phase 4: Semantic retriever backed by the in-memory vector store.
Falls back to the Phase 3 keyword retriever when the vector store is empty.
"""
from __future__ import annotations

import logging
from typing import List, Tuple

from app.ai.config import ai_settings
from app.ai.rag.documents import KnowledgeDocument
from app.ai.rag.ingestion import load_knowledge_documents
from app.ai.rag.embeddings import get_embedding_provider
from app.ai.rag.vector_store import VectorDocument, get_vector_store
from app.ai.schemas.chat import Citation

logger = logging.getLogger(__name__)


class SemanticRetriever:
    """
    Semantic retriever that uses the vector store for cosine-similarity search.
    Automatically populates the store from the knowledge base on first use.
    Falls back to keyword matching if the store is empty.
    """

    _initialized: bool = False
    _docs_index: dict[str, KnowledgeDocument] = {}

    def __init__(self) -> None:
        self._store = get_vector_store()
        self._ensure_populated()

    def _ensure_populated(self) -> None:
        if SemanticRetriever._initialized:
            return
        docs = load_knowledge_documents()
        if not docs:
            SemanticRetriever._initialized = True
            return
        vector_docs: List[VectorDocument] = []
        for doc in docs:
            self._docs_index[doc.id] = doc
            # Split long docs into chunks (max 1000 chars)
            chunks = _chunk_text(doc.content, chunk_size=1000, overlap=100)
            for i, chunk in enumerate(chunks):
                vector_docs.append(VectorDocument(
                    id=f"{doc.id}__chunk_{i}",
                    content=chunk,
                    metadata={
                        "doc_id": doc.id,
                        "topic": doc.topic,
                        "title": doc.title,
                        "source": doc.source,
                        "source_url": doc.source_url or "",
                        "snippet": doc.snippet,
                        "chunk_index": i,
                    },
                ))
        self._store.add_documents(vector_docs)
        SemanticRetriever._initialized = True
        logger.info(f"Semantic retriever initialized with {len(vector_docs)} chunks from {len(docs)} docs.")

    def retrieve(self, query: str, top_k: int | None = None) -> List[Tuple[KnowledgeDocument, float]]:
        k = top_k or ai_settings.RAG_TOP_K
        if self._store.count() == 0:
            return self._keyword_fallback(query, k)

        results = self._store.similarity_search(query, top_k=k * 2)

        # Deduplicate by doc_id, keeping highest score per doc
        seen: dict[str, float] = {}
        for vdoc in results:
            doc_id = vdoc.metadata.get("doc_id", vdoc.id)
            if doc_id not in seen or vdoc.score > seen[doc_id]:
                seen[doc_id] = vdoc.score

        # Sort by score and build output
        sorted_ids = sorted(seen.items(), key=lambda x: x[1], reverse=True)[:k]
        output: List[Tuple[KnowledgeDocument, float]] = []
        for doc_id, score in sorted_ids:
            if doc_id in self._docs_index:
                output.append((self._docs_index[doc_id], score))
        return output

    def query_rag(self, query: str, top_k: int | None = None) -> Tuple[str, List[Citation]]:
        """Main interface: returns (context_text, citations) for use in prompts."""
        matches = self.retrieve(query, top_k)
        if not matches:
            return ("No specific educational knowledge documents matched this query.", [])

        context_blocks = []
        citations: List[Citation] = []
        for doc, score in matches:
            context_blocks.append(
                f"### {doc.title} ({doc.topic})\nSource: {doc.source}\n{doc.content}"
            )
            citations.append(Citation(
                topic=doc.topic,
                title=doc.title,
                source=doc.source,
                source_url=doc.source_url,
                snippet=doc.snippet,
            ))
        return ("\n\n---\n\n".join(context_blocks), citations)

    def _keyword_fallback(self, query: str, top_k: int) -> List[Tuple[KnowledgeDocument, float]]:
        """Phase 3 keyword matching as fallback."""
        import re
        docs = load_knowledge_documents()
        query_terms = set(re.findall(r"\w+", query.lower()))
        scored = []
        for doc in docs:
            doc_terms = set(re.findall(r"\w+", (doc.content + " " + doc.topic + " " + doc.title).lower()))
            overlap = query_terms.intersection(doc_terms)
            if overlap:
                score = len(overlap) / (len(query_terms) + 1.0)
                title_overlap = query_terms.intersection(set(re.findall(r"\w+", doc.title.lower())))
                if title_overlap:
                    score += 0.5
                scored.append((doc, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks."""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks
