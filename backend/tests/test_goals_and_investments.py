import pytest
import datetime
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_goals_and_investments(client: AsyncClient, auth_headers):
    # 1. Goal
    g_res = await client.post("/api/v1/goals", headers=auth_headers, json={
        "name": "Emergency Fund",
        "target_amount": 10000.00,
        "current_amount": 2500.00,
        "target_date": "2026-12-31"
    })
    assert g_res.status_code == 201
    goal = g_res.json()
    assert float(goal["progress_percentage"]) == 25.0

    # 2. Investment & Transaction
    acc_res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Brokerage",
        "account_type": "investment",
        "current_balance": 5000.00
    })
    acc_id = acc_res.json()["id"]

    inv_res = await client.post("/api/v1/investments", headers=auth_headers, json={
        "account_id": acc_id,
        "name": "Vanguard Total Stock Market",
        "symbol": "VTI",
        "asset_type": "etf",
        "quantity": 10.0,
        "average_cost": 240.0,
        "current_value": 2750.0
    })
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # Add Buy transaction
    itx_res = await client.post(f"/api/v1/investments/{inv_id}/transactions", headers=auth_headers, json={
        "transaction_type": "buy",
        "transaction_date": str(datetime.date.today()),
        "quantity": 5.0,
        "price_per_unit": 250.0,
        "total_amount": 1250.0
    })
    assert itx_res.status_code == 201
