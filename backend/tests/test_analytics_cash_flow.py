import pytest
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient
from app.db.models.user import User

@pytest.mark.asyncio
async def test_cash_flow_and_savings_rate_analytics(client: AsyncClient, auth_headers: dict):
    # 1. Create account
    acc_res = await client.post(
        "/api/v1/accounts",
        json={"name": "Checking Account", "account_type": "checking", "current_balance": 0.0, "currency": "USD"},
        headers=auth_headers,
    )
    assert acc_res.status_code == 201
    acc_id = acc_res.json()["id"]

    today = date.today()
    d1 = today - timedelta(days=5)
    d2 = today - timedelta(days=3)

    # 2. Add income: $5000
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 5000.00,
            "transaction_type": "income",
            "transaction_date": d1.isoformat(),
            "description": "Monthly Salary",
        },
        headers=auth_headers,
    )

    # 3. Add expense: $2000
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 2000.00,
            "transaction_type": "expense",
            "transaction_date": d2.isoformat(),
            "description": "Rent & Groceries",
        },
        headers=auth_headers,
    )

    # 4. Query cash-flow analytics
    res = await client.get("/api/v1/analytics/cash-flow?period=this_month&granularity=daily", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert Decimal(data["total_income"]) == Decimal("5000.00")
    assert Decimal(data["total_expenses"]) == Decimal("2000.00")
    assert Decimal(data["net_cash_flow"]) == Decimal("3000.00")
    assert Decimal(data["savings_rate"]) == Decimal("60.00")
    assert len(data["points"]) > 0
