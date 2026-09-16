import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient
from app.core.security import create_access_token, get_password_hash
from app.db.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_cross_user_analytics_isolation(client: AsyncClient, db_session: AsyncSession, auth_headers: dict):
    # 1. User A creates account and transaction
    acc_a = await client.post(
        "/api/v1/accounts",
        json={"name": "User A Vault", "account_type": "savings", "current_balance": 100000.0},
        headers=auth_headers,
    )
    acc_a_id = acc_a.json()["id"]

    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_a_id,
            "amount": 25000.00,
            "transaction_type": "income",
            "transaction_date": date.today().isoformat(),
            "description": "User A Secret Bonus",
        },
        headers=auth_headers,
    )

    # 2. Create User B
    user_b = User(
        email="user_b_analytics@finpilot.ai",
        password_hash=get_password_hash("SecretPass123!"),
        name="User B",
        is_active=True,
    )
    db_session.add(user_b)
    await db_session.commit()
    await db_session.refresh(user_b)

    token_b = create_access_token(subject=str(user_b.id))
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User B queries analytics -> must be strictly 0.00
    cf_b = await client.get("/api/v1/analytics/cash-flow?period=this_month", headers=headers_b)
    assert cf_b.status_code == 200
    assert Decimal(cf_b.json()["total_income"]) == Decimal("0.00")
    assert Decimal(cf_b.json()["net_cash_flow"]) == Decimal("0.00")

    nw_b = await client.get("/api/v1/analytics/net-worth", headers=headers_b)
    assert nw_b.status_code == 200
    assert Decimal(nw_b.json()["current"]["net_worth"]) == Decimal("0.00")

    # User B cannot read User A's alerts or overview
    alerts_b = await client.get("/api/v1/alerts", headers=headers_b)
    assert alerts_b.status_code == 200
    assert len(alerts_b.json()) == 0
