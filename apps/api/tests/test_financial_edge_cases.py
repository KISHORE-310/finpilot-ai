import pytest
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_zero_and_empty_edge_cases_safety(client: AsyncClient, auth_headers: dict):
    # Query all analytics endpoints with ZERO accounts and ZERO transactions
    # Must return 200 OK with zeroed fields, without division by zero, NaN, or 500 errors.

    cf = await client.get("/api/v1/analytics/cash-flow?period=this_month", headers=auth_headers)
    assert cf.status_code == 200
    assert Decimal(cf.json()["savings_rate"]) == Decimal("0.00")

    sp = await client.get("/api/v1/analytics/spending/categories?period=this_month", headers=auth_headers)
    assert sp.status_code == 200
    assert Decimal(sp.json()["total_spending"]) == Decimal("0.00")

    merch = await client.get("/api/v1/analytics/spending/merchants?period=this_month", headers=auth_headers)
    assert merch.status_code == 200
    assert len(merch.json()["merchants"]) == 0

    budgets = await client.get("/api/v1/analytics/budgets", headers=auth_headers)
    assert budgets.status_code == 200
    assert Decimal(budgets.json()["overall_utilization"]) == Decimal("0.00")

    goals = await client.get("/api/v1/analytics/goals", headers=auth_headers)
    assert goals.status_code == 200
    assert Decimal(goals.json()["overall_progress"]) == Decimal("0.00")

    inv = await client.get("/api/v1/analytics/investments", headers=auth_headers)
    assert inv.status_code == 200
    assert Decimal(inv.json()["pnl_percentage"]) == Decimal("0.00")

    nw = await client.get("/api/v1/analytics/net-worth", headers=auth_headers)
    assert nw.status_code == 200
    assert Decimal(nw.json()["current"]["net_worth"]) == Decimal("0.00")

    health = await client.get("/api/v1/analytics/financial-health", headers=auth_headers)
    assert health.status_code == 200
    assert 0 <= health.json()["overall_score"] <= 100

    insights = await client.get("/api/v1/analytics/insights?period=this_month", headers=auth_headers)
    assert insights.status_code == 200

    overview = await client.get("/api/v1/analytics/overview?period=this_month", headers=auth_headers)
    assert overview.status_code == 200
