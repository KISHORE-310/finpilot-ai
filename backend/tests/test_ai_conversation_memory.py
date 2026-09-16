import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_conversation_create_and_delete(client: AsyncClient, auth_headers: dict):
    """Test conversation CRUD lifecycle"""
    # Create
    conv_resp = await client.post(
        "/api/v1/ai/conversations?title=My+Test+Conversation",
        headers=auth_headers
    )
    assert conv_resp.status_code == 201
    conv_data = conv_resp.json()
    assert "id" in conv_data
    assert conv_data["title"] == "My Test Conversation"
    conv_id = conv_data["id"]

    # Get
    get_resp = await client.get(
        f"/api/v1/ai/conversations/{conv_id}",
        headers=auth_headers
    )
    assert get_resp.status_code == 200

    # Delete
    del_resp = await client.delete(
        f"/api/v1/ai/conversations/{conv_id}",
        headers=auth_headers
    )
    assert del_resp.status_code == 204

    # Verify gone
    gone_resp = await client.get(
        f"/api/v1/ai/conversations/{conv_id}",
        headers=auth_headers
    )
    assert gone_resp.status_code == 404

@pytest.mark.asyncio
async def test_chat_creates_conversation_when_none_given(client: AsyncClient, auth_headers: dict):
    """Chat without conversation_id auto-creates a conversation"""
    chat_resp = await client.post(
        "/api/v1/ai/chat",
        json={"message": "What is my net worth?"},
        headers=auth_headers
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "answer" in data
    assert "conversation_id" in data
    assert len(data["conversation_id"]) > 0
    assert "citations" in data
    assert "tools_used" in data

@pytest.mark.asyncio
async def test_chat_continues_existing_conversation(client: AsyncClient, auth_headers: dict):
    """Sending multiple messages to same conversation_id works"""
    # Create conversation
    conv_resp = await client.post(
        "/api/v1/ai/conversations?title=Memory+Test",
        headers=auth_headers
    )
    conv_id = conv_resp.json()["id"]

    # First turn
    chat1 = await client.post(
        "/api/v1/ai/chat",
        json={"message": "What is my net worth?", "conversation_id": conv_id},
        headers=auth_headers
    )
    assert chat1.status_code == 200
    assert chat1.json()["conversation_id"] == conv_id

    # Second turn
    chat2 = await client.post(
        "/api/v1/ai/chat",
        json={"message": "What about my spending?", "conversation_id": conv_id},
        headers=auth_headers
    )
    assert chat2.status_code == 200
    assert chat2.json()["conversation_id"] == conv_id

    # Conversation should now have messages
    conv_detail = await client.get(
        f"/api/v1/ai/conversations/{conv_id}",
        headers=auth_headers
    )
    assert conv_detail.status_code == 200
    detail_data = conv_detail.json()
    assert len(detail_data["messages"]) >= 4  # 2 user + 2 assistant messages

@pytest.mark.asyncio
async def test_list_conversation_messages_endpoint(client: AsyncClient, auth_headers: dict):
    """GET /ai/conversations/{id}/messages endpoint returns message list"""
    conv_resp = await client.post(
        "/api/v1/ai/conversations?title=Messages+Route+Test",
        headers=auth_headers
    )
    conv_id = conv_resp.json()["id"]

    # Send a message
    chat_resp = await client.post(
        "/api/v1/ai/chat",
        json={"message": "What is my emergency fund target?", "conversation_id": conv_id},
        headers=auth_headers
    )
    assert chat_resp.status_code == 200

    # Fetch messages list directly
    msgs_resp = await client.get(
        f"/api/v1/ai/conversations/{conv_id}/messages",
        headers=auth_headers
    )
    assert msgs_resp.status_code == 200
    msgs_data = msgs_resp.json()
    assert isinstance(msgs_data, list)
    assert len(msgs_data) >= 2  # user + assistant
    assert msgs_data[0]["role"] == "user"
    assert msgs_data[1]["role"] == "assistant"
    assert "content" in msgs_data[0]
    assert "tools_used" in msgs_data[1]

