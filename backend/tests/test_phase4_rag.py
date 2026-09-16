import pytest
from app.ai.rag.embeddings import MockEmbeddingProvider, get_embedding_provider, EMBEDDING_DIM
from app.ai.rag.vector_store import InMemoryVectorStore, VectorDocument, get_vector_store, reset_vector_store
from app.ai.rag.semantic_retriever import SemanticRetriever


def test_mock_embedding_provider():
    provider = MockEmbeddingProvider()
    assert provider.dimension == EMBEDDING_DIM

    texts = ["emergency fund recommendations", "budgeting 50 30 20 rule"]
    vectors = provider.embed_texts(texts)

    assert len(vectors) == 2
    assert len(vectors[0]) == EMBEDDING_DIM
    assert len(vectors[1]) == EMBEDDING_DIM

    # Determinism test
    v1_again = provider.embed_query("emergency fund recommendations")
    assert v1_again == vectors[0]

    # Unit norm test (magnitude ~= 1.0)
    mag = sum(x * x for x in vectors[0]) ** 0.5
    assert abs(mag - 1.0) < 1e-4


def test_in_memory_vector_store():
    provider = MockEmbeddingProvider()
    store = InMemoryVectorStore(provider)

    doc1 = VectorDocument(id="doc1", content="Emergency fund is 3 to 6 months of expenses.", metadata={"topic": "Savings"})
    doc2 = VectorDocument(id="doc2", content="SIP in mutual funds helps rupee cost averaging.", metadata={"topic": "Investing"})
    doc3 = VectorDocument(id="doc3", content="50 30 20 budget rule divides needs, wants, and savings.", metadata={"topic": "Budgeting"})

    store.add_documents([doc1, doc2, doc3])
    assert store.count() == 3

    results = store.similarity_search("how many months emergency fund", top_k=2)
    assert len(results) <= 2
    assert any("Emergency fund" in r.content for r in results)

    store.clear()
    assert store.count() == 0


def test_semantic_retriever():
    retriever = SemanticRetriever()
    assert retriever is not None

    context, citations = retriever.query_rag("what is an emergency fund", top_k=2)
    assert len(context) > 0
    assert len(citations) <= 2

    # Verify citation fields
    for c in citations:
        assert c.title
        assert c.topic
        assert c.source


def test_embedding_factory():
    provider = get_embedding_provider()
    assert provider is not None
    assert provider.dimension == EMBEDDING_DIM
