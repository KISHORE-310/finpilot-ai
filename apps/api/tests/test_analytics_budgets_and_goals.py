import pytest
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_budget_projection_and_goal_analytics(client: AsyncClient, auth_headers: dict):
    # Create account & category
    acc = await client.post(
        "/api/v1/accounts",
        json={"name": "Checking", "account_type": "checking", "current_balance": 1000.0},
        headers=auth_headers,
    )
    acc_id = acc.json()["id"]

    cat = await client.post(
        "/api/v1/categories",
        json={"name": "Dining Out", "category_type": "expense"},
        headers=auth_headers,
    )
    cat_id = cat.json()["id"]

    today = date.today()

    # Create Budget: $500 for Dining Out
    await client.post(
        "/api/v1/budgets",
        json={
            "name": "Dining Budget",
            "category_id": cat_id,
            "amount": 500.00,
            "period": "monthly",
            "start_date": date(today.year, today.month, 1).isoformat(),
        },
        headers=auth_headers,
    )

    # Spend $450 (90% - should trigger WARNING status)
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "category_id": cat_id,
            "amount": 450.00,
            "transaction_type": "expense",
            "transaction_date": today.isoformat(),
            "description": "Dinner with friends",
        },
        headers=auth_headers,
    )

    b_res = await client.get("/api/v1/analytics/budgets", headers=auth_headers)
    assert b_res.status_code == 200
    b_data = b_res.json()
    assert Decimal(b_data["total_budget"]) == Decimal("500.00")
    assert Decimal(b_data["total_spent"]) == Decimal("450.00")
    assert Decimal(b_data["overall_utilization"]) == Decimal("90.00")
    assert b_data["budgets"][0]["status"] in ["WARNING", "OVER_BUDGET"]

    # Create Goal: Target $10,000, current $6,000, target date 6 months from now
    target_d = today + timedelta(days=180)
    await client.post(
        "/api/v1/goals",
        json={
            "name": "Emergency Fund",
            "goal_type": "emergency_fund",
            "target_amount": 10000.00,
            "current_amount": 6000.00,
            "target_date": target_d.isoformat(),
        },
        headers=auth_headers,
    )

    g_res = await client.get("/api/v1/analytics/goals", headers=auth_headers)
    assert g_res.status_code == 200
    g_data = g_res.json()
    assert Decimal(g_data["total_target"]) == Decimal("10000.00")
    assert Decimal(g_data["total_saved"]) == Decimal("6000.00")
    assert Decimal(g_data["overall_progress"]) == Decimal("60.00")
    assert g_data["goals"][0]["status"] == "ON_TRACK"
    assert Decimal(g_data["goals"][0]["required_monthly_contribution"]) > Decimal("0.00")
