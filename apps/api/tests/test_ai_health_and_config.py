import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ai_health_endpoint(client: AsyncClient):
    """Health endpoint is public - no auth needed per route definition"""
    response = await client.get("/api/v1/ai/health")
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert "model" in data
    assert "rag_documents_count" in data
    assert data["rag_documents_count"] >= 5
    assert "knowledge_docs_count" in data
    assert data["knowledge_docs_count"] >= 5
    assert data["provider"] in ["openai", "mock", "deterministic-mock"]
    assert data["tools_count"] == 13
