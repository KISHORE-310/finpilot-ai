import pytest
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_category_and_merchant_analytics(client: AsyncClient, auth_headers: dict):
    # Create account
    acc = await client.post(
        "/api/v1/accounts",
        json={"name": "Primary Card", "account_type": "credit_card", "current_balance": 0.0},
        headers=auth_headers,
    )
    acc_id = acc.json()["id"]

    # Create category
    cat = await client.post(
        "/api/v1/categories",
        json={"name": "Groceries", "category_type": "expense", "color": "#10B981"},
        headers=auth_headers,
    )
    cat_id = cat.json()["id"]

    today = date.today()

    # Add transactions with merchant
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "category_id": cat_id,
            "amount": 150.00,
            "transaction_type": "expense",
            "transaction_date": today.isoformat(),
            "description": "Weekly grocery trip",
            "merchant_name": "Trader Joe's",
        },
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "category_id": cat_id,
            "amount": 250.00,
            "transaction_type": "expense",
            "transaction_date": today.isoformat(),
            "description": "Costco wholesale",
            "merchant_name": "Costco",
        },
        headers=auth_headers,
    )

    # Test category spending
    cat_res = await client.get("/api/v1/analytics/spending/categories?period=this_month", headers=auth_headers)
    assert cat_res.status_code == 200
    c_data = cat_res.json()
    assert Decimal(c_data["total_spending"]) == Decimal("400.00")
    assert len(c_data["categories"]) == 1
    assert c_data["categories"][0]["category_name"] == "Groceries"
    assert Decimal(c_data["categories"][0]["amount"]) == Decimal("400.00")
    assert Decimal(c_data["categories"][0]["percentage"]) == Decimal("100.00")

    # Test merchant spending
    merch_res = await client.get("/api/v1/analytics/spending/merchants?period=this_month", headers=auth_headers)
    assert merch_res.status_code == 200
    m_data = merch_res.json()
    assert len(m_data["merchants"]) == 2
    assert m_data["merchants"][0]["merchant_name"] == "Costco"
    assert Decimal(m_data["merchants"][0]["total_spent"]) == Decimal("250.00")

    # Test largest transactions
    large_res = await client.get("/api/v1/analytics/spending/largest?period=this_month", headers=auth_headers)
    assert large_res.status_code == 200
    l_data = large_res.json()
    assert len(l_data["transactions"]) == 2
    assert Decimal(l_data["transactions"][0]["amount"]) == Decimal("250.00")
