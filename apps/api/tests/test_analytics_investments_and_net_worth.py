import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_investments_and_net_worth_snapshots(client: AsyncClient, auth_headers: dict):
    # Create Bank and Investment accounts
    bank = await client.post(
        "/api/v1/accounts",
        json={"name": "Savings", "account_type": "savings", "current_balance": 15000.0},
        headers=auth_headers,
    )
    inv_acc = await client.post(
        "/api/v1/accounts",
        json={"name": "Brokerage", "account_type": "investment", "current_balance": 5000.0},
        headers=auth_headers,
    )
    loan_acc = await client.post(
        "/api/v1/accounts",
        json={"name": "Auto Loan", "account_type": "loan", "current_balance": 4000.0},
        headers=auth_headers,
    )
    inv_acc_id = inv_acc.json()["id"]

    # Add investment holding: 10 shares of VOO at $400 avg cost ($4000 cost), current value $4500 ($500 gain)
    await client.post(
        "/api/v1/investments",
        json={
            "account_id": inv_acc_id,
            "name": "Vanguard S&P 500 ETF",
            "symbol": "VOO",
            "asset_type": "etf",
            "quantity": 10.0,
            "average_cost": 400.0,
            "current_value": 4500.0,
        },
        headers=auth_headers,
    )

    # Query Investment Analytics
    inv_res = await client.get("/api/v1/analytics/investments", headers=auth_headers)
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert Decimal(inv_data["total_invested"]) == Decimal("4000.00")
    assert Decimal(inv_data["current_value"]) == Decimal("4500.00")
    assert Decimal(inv_data["total_pnl"]) == Decimal("500.00")
    assert Decimal(inv_data["pnl_percentage"]) == Decimal("12.50")
    assert len(inv_data["allocations"]) == 1
    assert inv_data["allocations"][0]["asset_type"] == "Etf"

    # Query Net Worth Analytics
    nw_res = await client.get("/api/v1/analytics/net-worth", headers=auth_headers)
    assert nw_res.status_code == 200
    nw_data = nw_res.json()
    # Assets = 15000 (savings) + 5000 (brokerage balance) + 4500 (holding) = 24500
    # Liabilities = 4000 (loan)
    # Net worth = 20500
    assert Decimal(nw_data["current"]["total_assets"]) == Decimal("24500.00")
    assert Decimal(nw_data["current"]["total_liabilities"]) == Decimal("4000.00")
    assert Decimal(nw_data["current"]["net_worth"]) == Decimal("20500.00")

    # Record snapshot
    snap_res = await client.post("/api/v1/analytics/net-worth/snapshot", headers=auth_headers)
    assert snap_res.status_code == 201
    assert Decimal(snap_res.json()["net_worth"]) == Decimal("20500.00")
