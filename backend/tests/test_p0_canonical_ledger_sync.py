import datetime
import pytest
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_canonical_ledger_salary_rent_grocery_flow(client: AsyncClient):
    """
    P0 Regression Test:
    - Salary income: ₹1,25,000
    - Rent expense: ₹18,500
    - Grocery expense: ₹7,250
    - Expected remaining amount: ₹99,250
    Validates atomic balances, canonical ledger transactions, dashboard totals,
    cash flow analytics, duplicate prevention, backfill safety, and cross-user isolation.
    """
    today_str = datetime.date.today().isoformat()

    # 1. Register User A
    user_a_email = "usera_ledger@finpilot.ai"
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": user_a_email,
        "password": "Password123!",
        "name": "Ledger User A"
    })
    assert reg_res.status_code == 201

    login_res = await client.post("/api/v1/auth/login", json={
        "email": user_a_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token_a = login_res.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Create primary bank account with ₹0.00 initial balance
    acc_res = await client.post("/api/v1/accounts", headers=headers_a, json={
        "name": "HDFC Salary Account",
        "account_type": "bank",
        "currency": "INR",
        "current_balance": 0.00
    })
    assert acc_res.status_code == 201
    account_id = acc_res.json()["id"]

    # 3. Create Salary Income: ₹1,25,000
    inc_res = await client.post("/api/v1/income", headers=headers_a, json={
        "source": "salary",
        "amount": 125000.00,
        "currency": "INR",
        "account_id": account_id,
        "date": today_str,
        "description": "Monthly Software Engineering Salary"
    })
    assert inc_res.status_code == 201
    income_id = inc_res.json()["id"]

    # Verify balance: 1,25,000
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert acc_get.status_code == 200
    assert float(acc_get.json()["current_balance"]) == 125000.00

    # 4. Create Rent Expense: ₹18,500
    rent_res = await client.post("/api/v1/expenses", headers=headers_a, json={
        "name": "Apartment Rent",
        "amount": 18500.00,
        "currency": "INR",
        "account_id": account_id,
        "date": today_str,
        "description": "Monthly 2BHK Rent"
    })
    assert rent_res.status_code == 201
    rent_id = rent_res.json()["id"]

    # Verify balance: 1,25,000 - 18,500 = 1,06,500
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 106500.00

    # 5. Create Grocery Expense: ₹7,250
    groc_res = await client.post("/api/v1/expenses", headers=headers_a, json={
        "name": "Blinkit Groceries & Household",
        "amount": 7250.00,
        "currency": "INR",
        "account_id": account_id,
        "date": today_str,
        "description": "Weekly grocery supplies"
    })
    assert groc_res.status_code == 201
    groc_id = groc_res.json()["id"]

    # Verify final balance: 1,06,500 - 7,250 = ₹99,250.00
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 99250.00

    # 6. Verify Canonical Transaction Ledger
    tx_res = await client.get("/api/v1/transactions", headers=headers_a)
    assert tx_res.status_code == 200
    tx_list = tx_res.json()["items"]
    assert len(tx_list) == 3, f"Expected 3 canonical ledger transactions, got {len(tx_list)}"

    amounts = {tx["transaction_type"]: [] for tx in tx_list}
    for tx in tx_list:
        amounts[tx["transaction_type"]].append(float(tx["amount"]))

    assert 125000.00 in amounts["income"]
    assert 18500.00 in amounts["expense"]
    assert 7250.00 in amounts["expense"]

    # 7. Verify Dashboard Overview
    dash_res = await client.get("/api/v1/dashboard/overview", headers=headers_a)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert float(dash_data["net_worth"]["net_worth"]) == 99250.00
    assert float(dash_data["total_income_period"]) == 125000.00
    assert float(dash_data["total_expenses_period"]) == 25750.00
    assert float(dash_data["net_savings_period"]) == 99250.00

    # 8. Verify Cash Flow Analytics
    cf_res = await client.get(f"/api/v1/analytics/cash-flow?period=this_month", headers=headers_a)
    assert cf_res.status_code == 200
    cf_data = cf_res.json()
    assert float(cf_data["total_income"]) == 125000.00
    assert float(cf_data["total_expenses"]) == 25750.00
    assert float(cf_data["net_cash_flow"]) == 99250.00

    # 9. Verify Edit / Update Atomic Sync
    # Update grocery expense from 7,250 to 8,000
    upd_res = await client.put(f"/api/v1/expenses/{groc_id}", headers=headers_a, json={
        "amount": 8000.00
    })
    assert upd_res.status_code == 200

    # Balance becomes: 99,250 - 750 = 98,500
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 98500.00

    # Verify transaction amount updated
    tx_res = await client.get("/api/v1/transactions", headers=headers_a)
    exp_tx_amounts = [float(tx["amount"]) for tx in tx_res.json()["items"] if tx["transaction_type"] == "expense"]
    assert 8000.00 in exp_tx_amounts
    assert 7250.00 not in exp_tx_amounts
    assert len(tx_res.json()["items"]) == 3  # No duplicate created!

    # Revert grocery expense back to 7,250
    upd_res2 = await client.put(f"/api/v1/expenses/{groc_id}", headers=headers_a, json={
        "amount": 7250.00
    })
    assert upd_res2.status_code == 200
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 99250.00

    # 10. Verify Safe, Idempotent Backfill
    backfill_res = await client.post("/api/v1/transactions/backfill", headers=headers_a)
    assert backfill_res.status_code == 200
    assert backfill_res.json()["total_backfilled"] == 0  # All records already synced

    # Account balance must NOT be affected a second time
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 99250.00

    # 11. Cross-User Access Protections
    user_b_email = "userb_isolation@finpilot.ai"
    reg_b = await client.post("/api/v1/auth/register", json={
        "email": user_b_email,
        "password": "Password123!",
        "name": "User B Isolation"
    })
    assert reg_b.status_code == 201

    login_b = await client.post("/api/v1/auth/login", json={
        "email": user_b_email,
        "password": "Password123!"
    })
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B cannot read User A's income
    b_get_inc = await client.get(f"/api/v1/income/{income_id}", headers=headers_b)
    assert b_get_inc.status_code in [404, 403]

    # User B cannot read User A's expense
    b_get_exp = await client.get(f"/api/v1/expenses/{rent_id}", headers=headers_b)
    assert b_get_exp.status_code in [404, 403]

    # User B cannot create income into User A's account
    b_hack_inc = await client.post("/api/v1/income", headers=headers_b, json={
        "source": "salary",
        "amount": 50000.00,
        "account_id": account_id,
        "date": today_str
    })
    assert b_hack_inc.status_code in [404, 403]

    # User A's balance remains uncompromised
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 99250.00

    # 12. Delete Grocery Expense: balance reverts to 1,06,500 and canonical tx deleted
    del_res = await client.delete(f"/api/v1/expenses/{groc_id}", headers=headers_a)
    assert del_res.status_code == 200
    acc_get = await client.get(f"/api/v1/accounts/{account_id}", headers=headers_a)
    assert float(acc_get.json()["current_balance"]) == 106500.00

    tx_res = await client.get("/api/v1/transactions", headers=headers_a)
    assert len(tx_res.json()["items"]) == 2
