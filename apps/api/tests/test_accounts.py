import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_account_lifecycle(client: AsyncClient, auth_headers):
    # 1. Create account
    create_res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Checking Account",
        "account_type": "bank",
        "institution": "Chase Bank",
        "currency": "USD",
        "current_balance": 4500.00
    })
    assert create_res.status_code == 201
    acc = create_res.json()
    acc_id = acc["id"]
    assert acc["name"] == "Checking Account"
    assert float(acc["current_balance"]) == 4500.00

    # 2. List accounts
    list_res = await client.get("/api/v1/accounts", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Net worth summary
    nw_res = await client.get("/api/v1/accounts/net-worth-summary", headers=auth_headers)
    assert nw_res.status_code == 200
    assert float(nw_res.json()["net_worth"]) == 4500.00

    # 4. Update account
    upd_res = await client.patch(f"/api/v1/accounts/{acc_id}", headers=auth_headers, json={
        "name": "Premier Checking"
    })
    assert upd_res.status_code == 200
    assert upd_res.json()["name"] == "Premier Checking"

    # 5. Delete account
    del_res = await client.delete(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert del_res.status_code == 200
