import io
import pytest
import openpyxl
import datetime
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cross_user_isolation(client: AsyncClient):
    # 1. Register User A and User B
    res_a = await client.post("/api/v1/auth/register", json={
        "email": "user_a@example.com",
        "password": "Password123!",
        "name": "User A"
    })
    assert res_a.status_code == 201
    login_a = await client.post("/api/v1/auth/login", json={
        "email": "user_a@example.com",
        "password": "Password123!"
    })
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = await client.post("/api/v1/auth/register", json={
        "email": "user_b@example.com",
        "password": "Password123!",
        "name": "User B"
    })
    assert res_b.status_code == 201
    login_b = await client.post("/api/v1/auth/login", json={
        "email": "user_b@example.com",
        "password": "Password123!"
    })
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User A creates Account, Goal, Investment
    acc_a = await client.post("/api/v1/accounts", headers=headers_a, json={
        "name": "User A Private Checking",
        "account_type": "checking",
        "current_balance": 5000.00
    })
    acc_a_id = acc_a.json()["id"]

    goal_a = await client.post("/api/v1/goals", headers=headers_a, json={
        "name": "User A Private Goal",
        "target_amount": 10000.00
    })
    goal_a_id = goal_a.json()["id"]

    inv_a = await client.post("/api/v1/investments", headers=headers_a, json={
        "account_id": acc_a_id,
        "name": "User A Secret Holding",
        "asset_type": "stock",
        "quantity": 10.0,
        "average_cost": 100.0,
        "current_value": 1200.0
    })
    inv_a_id = inv_a.json()["id"]

    tx_a = await client.post("/api/v1/transactions", headers=headers_a, json={
        "account_id": acc_a_id,
        "amount": 200.00,
        "transaction_type": "expense",
        "transaction_date": str(datetime.date.today()),
        "description": "User A Confidential Transaction"
    })
    tx_a_id = tx_a.json()["id"]

    # 3. User B tries to read User A's resources -> Must be 404 (or isolated from list)
    # B reads accounts list
    acc_list_b = await client.get("/api/v1/accounts", headers=headers_b)
    assert acc_list_b.status_code == 200
    b_acc_ids = [a["id"] for a in acc_list_b.json()]
    assert acc_a_id not in b_acc_ids

    # B directly accesses A's account
    acc_get_b = await client.get(f"/api/v1/accounts/{acc_a_id}", headers=headers_b)
    assert acc_get_b.status_code == 404

    # B tries to modify/delete A's account
    acc_del_b = await client.delete(f"/api/v1/accounts/{acc_a_id}", headers=headers_b)
    assert acc_del_b.status_code == 404

    # B tries to read A's transaction
    tx_get_b = await client.get(f"/api/v1/transactions/{tx_a_id}", headers=headers_b)
    assert tx_get_b.status_code == 404

    # B tries to delete A's transaction
    tx_del_b = await client.delete(f"/api/v1/transactions/{tx_a_id}", headers=headers_b)
    assert tx_del_b.status_code == 404

    # B tries to read A's goal
    goal_get_b = await client.get(f"/api/v1/goals/{goal_a_id}", headers=headers_b)
    assert goal_get_b.status_code == 404

    # B tries to delete A's goal
    goal_del_b = await client.delete(f"/api/v1/goals/{goal_a_id}", headers=headers_b)
    assert goal_del_b.status_code == 404

    # B tries to read A's investment
    inv_get_b = await client.get(f"/api/v1/investments/{inv_a_id}", headers=headers_b)
    assert inv_get_b.status_code == 404


@pytest.mark.asyncio
async def test_transaction_update_ledger_balance(client: AsyncClient, auth_headers):
    # 1. Create account with initial $1,000 balance
    acc_res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Ledger Audit Account",
        "account_type": "checking",
        "current_balance": 1000.00
    })
    acc_id = acc_res.json()["id"]

    # 2. Create $100 expense -> Balance should be $900
    tx_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_id,
        "amount": 100.00,
        "transaction_type": "expense",
        "transaction_date": str(datetime.date.today()),
        "description": "Initial Expense"
    })
    tx_id = tx_res.json()["id"]

    acc_check1 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(acc_check1.json()["current_balance"]) == 900.00

    # 3. Update expense amount from $100 to $150 -> Balance should be $850 (decreases additional $50)
    tx_up1 = await client.patch(f"/api/v1/transactions/{tx_id}", headers=auth_headers, json={
        "amount": 150.00
    })
    assert tx_up1.status_code == 200

    acc_check2 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(acc_check2.json()["current_balance"]) == 850.00

    # 4. Change $150 expense to $200 income -> Balance should be $1000 (orig) + $200 = $1200
    tx_up2 = await client.patch(f"/api/v1/transactions/{tx_id}", headers=auth_headers, json={
        "amount": 200.00,
        "transaction_type": "income"
    })
    assert tx_up2.status_code == 200

    acc_check3 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(acc_check3.json()["current_balance"]) == 1200.00

    # 5. Delete transaction -> Balance restores to initial $1000.00
    del_res = await client.delete(f"/api/v1/transactions/{tx_id}", headers=auth_headers)
    assert del_res.status_code == 200

    acc_check4 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(acc_check4.json()["current_balance"]) == 1000.00


@pytest.mark.asyncio
async def test_excel_import_pipeline(client: AsyncClient, auth_headers):
    # 1. Create target account
    acc_res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Excel Import Account",
        "account_type": "checking",
        "current_balance": 1000.00
    })
    acc_id = acc_res.json()["id"]

    # 2. Build in-memory Excel workbook (.xlsx)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"
    ws.append(["Date", "Description", "Amount", "Type"])
    ws.append(["2025-04-01", "Client Payment", 2500.00, "income"])
    ws.append(["2025-04-02", "Office Supplies", 150.00, "expense"])
    ws.append(["2025-04-03", "Software Subscription", 49.99, "expense"])

    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_bytes = excel_buffer.getvalue()

    # 3. Preview Excel file
    files = {"file": ("statement.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    preview_res = await client.post(
        "/api/v1/imports/preview",
        headers=auth_headers,
        files=files,
        data={"account_id": acc_id}
    )
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["total_rows"] == 3
    assert pdata["suggested_mapping"]["date"] == "Date"
    assert pdata["suggested_mapping"]["amount"] == "Amount"

    # 4. Execute Excel Import
    import json
    files2 = {"file": ("statement.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    exec_res = await client.post(
        "/api/v1/imports/execute",
        headers=auth_headers,
        files=files2,
        data={
            "account_id": acc_id,
            "mapping": json.dumps(pdata["suggested_mapping"]),
            "skip_duplicates": "true"
        }
    )
    assert exec_res.status_code == 200
    res_data = exec_res.json()
    assert res_data["imported_count"] == 3
    assert res_data["skipped_duplicates_count"] == 0

    # 5. Re-import identical Excel file -> Deduplication must skip all 3
    files3 = {"file": ("statement.xlsx", io.BytesIO(excel_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    exec_res2 = await client.post(
        "/api/v1/imports/execute",
        headers=auth_headers,
        files=files3,
        data={
            "account_id": acc_id,
            "mapping": json.dumps(pdata["suggested_mapping"]),
            "skip_duplicates": "true"
        }
    )
    assert exec_res2.status_code == 200
    res_data2 = exec_res2.json()
    assert res_data2["imported_count"] == 0
    assert res_data2["skipped_duplicates_count"] == 3
