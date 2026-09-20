import pytest
import datetime
from decimal import Decimal
from httpx import AsyncClient
from app.core.config import Settings


def test_production_secret_validation_fails_on_dev_secrets():
    """Verify that in production mode, insecure dev default secrets cause fast-failure."""
    insecure_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="dev_secret_key_change_me_in_production",
        DATABASE_URL="postgresql+asyncpg://finpilot_user:change_me@localhost:5432/finpilot_db",
    )
    with pytest.raises(RuntimeError) as exc_info:
        insecure_settings.validate_production_secrets()
    assert "Production startup blocked" in str(exc_info.value)


def test_production_secret_validation_passes_on_strong_secrets():
    """Verify that in production mode, strong 32+ char secrets pass validation cleanly."""
    valid_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="e4f7a2b9c1d8e5f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2",
        DATABASE_URL="postgresql+asyncpg://prod_user:prod_real_password_999@db.internal:5432/finpilot_db",
        SYNC_DATABASE_URL="postgresql://prod_user:prod_real_password_999@db.internal:5432/finpilot_db",
    )
    # Should not raise
    valid_settings.validate_production_secrets()



@pytest.mark.asyncio
async def test_transfer_double_entry_ledger_flow(client: AsyncClient, auth_headers):
    """
    Test Account A (₹10,000) -> Transfer ₹2,000 -> Account B (₹5,000).
    Expected: Account A = ₹8,000, Account B = ₹7,000.
    """
    # 1. Create Account A (₹10,000)
    res_a = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Savings Account A",
        "account_type": "savings",
        "currency": "INR",
        "current_balance": 10000.00
    })
    assert res_a.status_code == 201
    acc_a_id = res_a.json()["id"]

    # 2. Create Account B (₹5,000)
    res_b = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Checking Account B",
        "account_type": "checking",
        "currency": "INR",
        "current_balance": 5000.00
    })
    assert res_b.status_code == 201
    acc_b_id = res_b.json()["id"]

    # 3. Transfer ₹2,000 from A to B
    tx_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_a_id,
        "transfer_account_id": acc_b_id,
        "amount": 2000.00,
        "currency": "INR",
        "transaction_type": "transfer",
        "transaction_date": str(datetime.date.today()),
        "description": "Monthly savings allocation"
    })
    assert tx_res.status_code == 201
    tx_id = tx_res.json()["id"]
    assert tx_res.json()["transfer_account_id"] == acc_b_id

    # Verify balances: A = 8,000, B = 7,000
    check_a = await client.get(f"/api/v1/accounts/{acc_a_id}", headers=auth_headers)
    assert float(check_a.json()["current_balance"]) == 8000.00

    check_b = await client.get(f"/api/v1/accounts/{acc_b_id}", headers=auth_headers)
    assert float(check_b.json()["current_balance"]) == 7000.00

    # 4. Update transfer amount from ₹2,000 to ₹3,000 -> A = 7,000, B = 8,000
    up_res = await client.patch(f"/api/v1/transactions/{tx_id}", headers=auth_headers, json={
        "amount": 3000.00
    })
    assert up_res.status_code == 200

    check_a2 = await client.get(f"/api/v1/accounts/{acc_a_id}", headers=auth_headers)
    assert float(check_a2.json()["current_balance"]) == 7000.00

    check_b2 = await client.get(f"/api/v1/accounts/{acc_b_id}", headers=auth_headers)
    assert float(check_b2.json()["current_balance"]) == 8000.00

    # 5. Delete transfer -> Balances revert to original (A = 10,000, B = 5,000)
    del_res = await client.delete(f"/api/v1/transactions/{tx_id}", headers=auth_headers)
    assert del_res.status_code == 200

    check_a3 = await client.get(f"/api/v1/accounts/{acc_a_id}", headers=auth_headers)
    assert float(check_a3.json()["current_balance"]) == 10000.00

    check_b3 = await client.get(f"/api/v1/accounts/{acc_b_id}", headers=auth_headers)
    assert float(check_b3.json()["current_balance"]) == 5000.00


@pytest.mark.asyncio
async def test_transfer_validation_guards(client: AsyncClient, auth_headers):
    """Test validation guards against invalid transfers."""
    # Create an account
    res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Validation Test Account",
        "account_type": "bank",
        "currency": "USD",
        "current_balance": 1000.00
    })
    acc_id = res.json()["id"]

    # 1. Negative amount should fail (422)
    bad_amt_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_id,
        "amount": -50.00,
        "transaction_type": "expense",
        "description": "Negative expense"
    })
    assert bad_amt_res.status_code == 422

    # 2. Zero amount should fail (422)
    zero_amt_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_id,
        "amount": 0.00,
        "transaction_type": "income",
        "description": "Zero income"
    })
    assert zero_amt_res.status_code == 422

    # 3. Same source and destination account should fail (422)
    same_acc_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_id,
        "transfer_account_id": acc_id,
        "amount": 100.00,
        "transaction_type": "transfer",
        "description": "Self transfer"
    })
    assert same_acc_res.status_code == 422

    # 4. Transfer without destination account should fail (422)
    missing_dest_res = await client.post("/api/v1/transactions", headers=auth_headers, json={
        "account_id": acc_id,
        "amount": 100.00,
        "transaction_type": "transfer",
        "description": "Missing dest transfer"
    })
    assert missing_dest_res.status_code == 422


@pytest.mark.asyncio
async def test_cross_user_transfer_isolation(client: AsyncClient):
    """Test that User A cannot transfer funds into User B's account (isolated boundary)."""
    # 1. Register User A
    await client.post("/api/v1/auth/register", json={
        "email": "user_alpha@example.com",
        "password": "Password123!",
        "name": "User Alpha"
    })
    login_a = await client.post("/api/v1/auth/login", json={
        "email": "user_alpha@example.com",
        "password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # 2. Register User B
    await client.post("/api/v1/auth/register", json={
        "email": "user_beta@example.com",
        "password": "Password123!",
        "name": "User Beta"
    })
    login_b = await client.post("/api/v1/auth/login", json={
        "email": "user_beta@example.com",
        "password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # User A account
    acc_a_res = await client.post("/api/v1/accounts", headers=headers_a, json={
        "name": "User A Vault",
        "account_type": "checking",
        "current_balance": 5000.00
    })
    acc_a_id = acc_a_res.json()["id"]

    # User B account
    acc_b_res = await client.post("/api/v1/accounts", headers=headers_b, json={
        "name": "User B Target",
        "account_type": "savings",
        "current_balance": 1000.00
    })
    acc_b_id = acc_b_res.json()["id"]

    # User A tries to transfer to User B's account -> Must be rejected with 404
    cross_res = await client.post("/api/v1/transactions", headers=headers_a, json={
        "account_id": acc_a_id,
        "transfer_account_id": acc_b_id,
        "amount": 500.00,
        "transaction_type": "transfer",
        "description": "Unauthorized cross-user transfer"
    })
    assert cross_res.status_code == 404

    # Verify User A balance is unchanged (5000)
    check_a = await client.get(f"/api/v1/accounts/{acc_a_id}", headers=headers_a)
    assert float(check_a.json()["current_balance"]) == 5000.00
