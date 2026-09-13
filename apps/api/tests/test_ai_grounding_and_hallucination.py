import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ai_returns_structured_response(client: AsyncClient, auth_headers: dict):
    """AI response has all required fields"""
    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "Tell me about emergency funds"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    # All required ChatResponse fields
    assert "answer" in data
    assert "conversation_id" in data
    assert "message_id" in data
    assert "citations" in data
    assert "tools_used" in data
    assert "key_metrics" in data
    assert "guardrail_intervened" in data
    assert "disclaimer" in data
    assert len(data["answer"]) > 10
    assert data["guardrail_intervened"] is False

@pytest.mark.asyncio
async def test_ai_list_conversations(client: AsyncClient, auth_headers: dict):
    """Listing conversations returns a valid list"""
    response = await client.get(
        "/api/v1/ai/conversations",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
