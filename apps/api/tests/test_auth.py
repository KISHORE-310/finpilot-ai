import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "alex@finpilot.ai",
        "password": "SecurePassword123!",
        "name": "Alex Morgan"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "alex@finpilot.ai"

    # 2. Login
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "alex@finpilot.ai",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 3. Get /me
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Alex Morgan"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, test_user):
    res = await client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401
