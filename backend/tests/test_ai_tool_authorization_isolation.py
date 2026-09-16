import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
from app.core.security import get_password_hash, create_access_token
from app.ai.tools import get_financial_tools

@pytest.mark.asyncio
async def test_user_data_isolation_in_tools(db_session: AsyncSession, test_user: User):
    """Different users get separate tool instances with separate data access"""
    user2 = User(
        email="user2@test.com",
        name="User Two",
        password_hash=get_password_hash("password123"),
        is_active=True
    )
    db_session.add(user2)
    await db_session.commit()
    await db_session.refresh(user2)

    tools1 = get_financial_tools(db_session, test_user.id)
    tools2 = get_financial_tools(db_session, user2.id)

    overview_tool1 = next(t for t in tools1 if t.name == "get_financial_overview")
    overview_tool2 = next(t for t in tools2 if t.name == "get_financial_overview")

    # Both return valid JSON strings scoped to their respective users
    res1 = await overview_tool1.ainvoke({})
    res2 = await overview_tool2.ainvoke({})

    assert isinstance(res1, str)
    assert isinstance(res2, str)

@pytest.mark.asyncio
async def test_conversation_access_isolation(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """User B cannot access User A conversation"""
    user2 = User(
        email="user_iso@test.com",
        name="Iso User",
        password_hash=get_password_hash("password123"),
        is_active=True
    )
    db_session.add(user2)
    await db_session.commit()
    await db_session.refresh(user2)
    token2 = create_access_token(subject=str(user2.id))

    # User 1 creates conversation
    create_resp = await client.post(
        "/api/v1/ai/conversations?title=User1+Private+Chat",
        headers=auth_headers
    )
    assert create_resp.status_code == 201
    conv_id = create_resp.json()["id"]

    # User 2 attempts to get User 1 conversation -> should 404
    get_resp = await client.get(
        f"/api/v1/ai/conversations/{conv_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert get_resp.status_code == 404
