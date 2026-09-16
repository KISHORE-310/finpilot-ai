import pytest
import datetime
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_transaction_ledger_balance_sync(client: AsyncClient, auth_headers):
    # 1. Create account ($1000)
    acc_res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Main Checking",
        "account_type": "bank",
        "currency": "USD",
        "current_balance": 1000.00
    })
    acc_id = acc_res.json()["id"]

    # 2. Create category
    cat_res = await client.post("/api/v1/categories", headers=auth_headers, json={
        "name": "Groceries",
        "category_type": "expense",
        "icon": "ShoppingCart",
        "color": "#F97316"
    })
    cat_id = cat_res.json()["id"]

    # 3. Post expense of $120.50
    tx_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_id,
        "category_id": cat_id,
        "amount": 120.50,
        "currency": "USD",
        "transaction_type": "expense",
        "transaction_date": str(datetime.date.today()),
        "description": "Trader Joe's groceries",
        "merchant_name": "Trader Joe's"
    })
    assert tx_res.status_code == 201
    tx_id = tx_res.json()["id"]

    # Verify balance is now $879.50
    acc_check = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(acc_check.json()["current_balance"]) == 879.50

    # 4. Delete transaction -> balance reverts to $1000.00
    del_res = await client.delete(f"/api/v1/transactions/{tx_id}", headers=auth_headers)
    assert del_res.status_code == 200

    acc_check2 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(acc_check2.json()["current_balance"]) == 1000.00
