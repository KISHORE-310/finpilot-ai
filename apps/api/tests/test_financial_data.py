import pytest
import datetime
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_income_expenses_budgets(client: AsyncClient, auth_headers):
    # 1. Income
    inc_res = await client.post("/api/v1/income", headers=auth_headers, json={
        "source": "salary",
        "amount": 8500.00,
        "currency": "USD",
        "is_recurring": True,
        "date": str(datetime.date.today())
    })
    assert inc_res.status_code == 201

    # 2. Expense
    exp_res = await client.post("/api/v1/expenses", headers=auth_headers, json={
        "name": "Fiber Internet",
        "amount": 80.00,
        "currency": "USD",
        "is_recurring": True,
        "date": str(datetime.date.today())
    })
    assert exp_res.status_code == 201

    # 3. Budget
    b_res = await client.post("/api/v1/budgets", headers=auth_headers, json={
        "name": "Dining Out",
        "amount": 450.00,
        "period": "monthly",
        "start_date": str(datetime.date.today())
    })
    assert b_res.status_code == 201
    assert float(b_res.json()["amount"]) == 450.00
