import pytest
from app.ai.rag.retriever import FinancialKnowledgeRetriever

def test_rag_retriever_returns_relevant_context():
    retriever = FinancialKnowledgeRetriever()
    matches = retriever.retrieve("What is an emergency fund rule of thumb?", top_k=2)

    assert len(matches) > 0
    doc, score = matches[0]
    # doc.id should be the file stem (emergency_funds, budgeting_fundamentals, etc.)
    assert score > 0
    assert doc.content is not None

def test_rag_debt_snowball_query():
    retriever = FinancialKnowledgeRetriever()
    context, citations = retriever.query_rag("debt snowball vs avalanche method", top_k=2)

    assert len(context) > 0
    assert len(citations) > 0

def test_rag_returns_citations_with_required_fields():
    retriever = FinancialKnowledgeRetriever()
    _, citations = retriever.query_rag("investing basics diversification", top_k=2)
    for citation in citations:
        assert citation.title is not None
        assert citation.source is not None
        assert citation.topic is not None
