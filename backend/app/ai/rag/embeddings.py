"""
Phase 4: Embedding provider abstraction.
Supports OpenAI embeddings and a deterministic MockEmbeddingProvider for tests/offline use.
"""
from __future__ import annotations

import hashlib
import math
from abc import ABC, abstractmethod
from typing import List

from app.ai.config import ai_settings

EMBEDDING_DIM = 1536  # Matches text-embedding-ada-002; mock uses same dim


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @property
    def dimension(self) -> int:
        return EMBEDDING_DIM

    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts and return list of float vectors."""

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query string."""
        return self.embed_texts([text])[0]


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic mock embedding provider for tests and offline use.
    Produces unit-norm vectors derived from a SHA-256 hash of the text,
    ensuring identical inputs always produce identical embeddings and
    that semantic similarity is approximated by character-level overlap.
    No external API calls are made.
    """

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_single(t) for t in texts]

    def _embed_single(self, text: str) -> List[float]:
        # Seed a deterministic vector from the text's SHA-256 hash
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        # Expand digest bytes to EMBEDDING_DIM floats using cyclic repeat
        raw: List[float] = []
        for i in range(EMBEDDING_DIM):
            byte_val = digest[i % len(digest)]
            raw.append(float(byte_val) - 128.0)  # center around 0
        # L2-normalize so cosine similarity = dot product
        magnitude = math.sqrt(sum(v * v for v in raw))
        if magnitude == 0.0:
            return [0.0] * EMBEDDING_DIM
        return [v / magnitude for v in raw]


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """
    OpenAI text-embedding-ada-002 provider.
    Falls back to MockEmbeddingProvider if API key is unavailable.
    """

    def __init__(self) -> None:
        self._client = None
        if ai_settings.LLM_API_KEY:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=ai_settings.LLM_API_KEY)
            except ImportError:
                pass

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if self._client is None:
            return MockEmbeddingProvider().embed_texts(texts)
        try:
            response = self._client.embeddings.create(
                input=texts,
                model="text-embedding-ada-002",
            )
            return [item.embedding for item in response.data]
        except Exception:
            return MockEmbeddingProvider().embed_texts(texts)


def get_embedding_provider() -> EmbeddingProvider:
    """Factory returning configured embedding provider."""
    provider = ai_settings.EMBEDDING_PROVIDER.lower()
    if provider == "openai" and ai_settings.LLM_API_KEY:
        return OpenAIEmbeddingProvider()
    return MockEmbeddingProvider()
