import pytest
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_anomalies_health_score_and_alerts(client: AsyncClient, auth_headers: dict):
    acc = await client.post(
        "/api/v1/accounts",
        json={"name": "Checking", "account_type": "checking", "current_balance": 10000.0},
        headers=auth_headers,
    )
    acc_id = acc.json()["id"]

    today = date.today()

    # Add 10 normal $30 transactions
    for i in range(10):
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": acc_id,
                "amount": 30.00,
                "transaction_type": "expense",
                "transaction_date": (today - timedelta(days=i+2)).isoformat(),
                "description": f"Lunch {i}",
                "merchant_name": "Cafe",
            },
            headers=auth_headers,
        )

    # Add 1 massive outlier transaction ($1200)
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 1200.00,
            "transaction_type": "expense",
            "transaction_date": today.isoformat(),
            "description": "Electronics shopping",
            "merchant_name": "Best Buy",
        },
        headers=auth_headers,
    )

    # Test anomaly detection
    anom_res = await client.get("/api/v1/analytics/anomalies?period=this_month", headers=auth_headers)
    assert anom_res.status_code == 200
    a_data = anom_res.json()
    assert a_data["total_anomalies"] >= 1
    assert Decimal(a_data["anomalies"][0]["amount"]) == Decimal("1200.00")

    # Test financial health score
    health_res = await client.get("/api/v1/analytics/financial-health", headers=auth_headers)
    assert health_res.status_code == 200
    h_data = health_res.json()
    assert 0 <= h_data["overall_score"] <= 100
    assert len(h_data["dimensions"]) == 6
    assert len(h_data["methodology_note"]) > 0

    # Evaluate alerts
    eval_res = await client.post("/api/v1/alerts/evaluate", headers=auth_headers)
    assert eval_res.status_code == 200

    # List alerts
    alerts_res = await client.get("/api/v1/alerts", headers=auth_headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) >= 1

    # Mark first alert as read
    first_id = alerts[0]["id"]
    read_res = await client.patch(f"/api/v1/alerts/{first_id}/read", headers=auth_headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
