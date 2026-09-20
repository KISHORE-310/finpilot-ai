import io
import time
import pytest
import datetime
from decimal import Decimal
from httpx import AsyncClient
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, is_token_revoked, revoke_token
from app.core.rate_limit import rate_limit_auth, InMemoryRateLimiter
from app.services.analytics.date_range_helper import get_period_dates


# ==============================================================================
# 1. AUTHENTICATION & JWT SECURITY TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_jwt_expired_token_rejected(client: AsyncClient, test_user):
    """Verify that an expired JWT is rejected with 401 Unauthorized."""
    expired_token = create_access_token(
        subject=str(test_user.id),
        expires_delta=datetime.timedelta(seconds=-10)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    res = await client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401
    assert "Invalid or expired token" in res.json()["detail"]


@pytest.mark.asyncio
async def test_jwt_tampered_signature_rejected(client: AsyncClient, test_user):
    """Verify that a token with a tampered payload/signature is rejected with 401."""
    valid_token = create_access_token(subject=str(test_user.id))
    # Alter the last 4 characters of the signature
    tampered_token = valid_token[:-4] + "xxxx"
    headers = {"Authorization": f"Bearer {tampered_token}"}
    res = await client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_token_revocation_on_logout(client: AsyncClient, test_user):
    """Verify that logging out revokes the bearer token so subsequent calls return 401."""
    token = create_access_token(subject=str(test_user.id))
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Verify token works initially
    me_res1 = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res1.status_code == 200

    # 2. Call logout
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert "Logged out successfully" in logout_res.json()["message"]

    # 3. Verify token is now revoked and rejected
    me_res2 = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res2.status_code == 401


# ==============================================================================
# 2. RATE LIMITING & ABUSE PROTECTION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_rate_limiter_blocks_excessive_requests(client: AsyncClient):
    """Verify that exceeding rate limits returns 429 Too Many Requests."""
    limiter = InMemoryRateLimiter("test_limit", limit_provider=lambda: 3, window_seconds=60)
    limiter.reset()

    class MockRequest:
        def __init__(self):
            self.headers = {}
            self.client = type("Client", (), {"host": "192.168.1.100"})()

    req = MockRequest()

    # 3 requests allowed
    limiter.check_rate_limit(req)
    limiter.check_rate_limit(req)
    limiter.check_rate_limit(req)

    # 4th request must raise 429
    with pytest.raises(Exception) as exc_info:
        limiter.check_rate_limit(req)
    assert "429" in str(exc_info.value) or "Rate limit exceeded" in str(exc_info.value)


# ==============================================================================
# 3. CSV / EXCEL IMPORT SECURITY & VALIDATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_import_empty_file_rejected(client: AsyncClient, auth_headers):
    """Verify that uploading an empty file (0 bytes) is rejected with 400."""
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res = await client.post("/api/v1/imports/preview", headers=auth_headers, files=files)
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_import_cross_user_account_isolation(client: AsyncClient):
    """Verify that User A cannot import transactions into User B's account."""
    # Register User A
    await client.post("/api/v1/auth/register", json={
        "email": "user_importer_a@example.com",
        "password": "Password123!",
        "name": "Importer A"
    })
    login_a = await client.post("/api/v1/auth/login", json={
        "email": "user_importer_a@example.com",
        "password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # Register User B
    await client.post("/api/v1/auth/register", json={
        "email": "user_importer_b@example.com",
        "password": "Password123!",
        "name": "Importer B"
    })
    login_b = await client.post("/api/v1/auth/login", json={
        "email": "user_importer_b@example.com",
        "password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # User B creates an account
    acc_b = await client.post("/api/v1/accounts", headers=headers_b, json={
        "name": "User B Target Account",
        "account_type": "checking",
        "current_balance": 1000.00
    })
    acc_b_id = acc_b.json()["id"]

    # User A attempts to import into User B's account -> 404
    csv_content = b"Date,Description,Amount\n2025-05-01,Unauthorized Tx,150.00\n"
    files = {"file": ("statement.csv", io.BytesIO(csv_content), "text/csv")}
    res = await client.post(
        "/api/v1/imports/execute",
        headers=headers_a,
        files=files,
        data={
            "account_id": acc_b_id,
            "mapping": '{"date": "Date", "amount": "Amount", "description": "Description"}',
            "skip_duplicates": "true"
        }
    )
    assert res.status_code == 404


# ==============================================================================
# 4. REQUEST VALIDATION & SCHEMA GUARDS
# ==============================================================================

@pytest.mark.asyncio
async def test_budget_invalid_date_range_rejected(client: AsyncClient, auth_headers):
    """Verify that a budget with end_date earlier than start_date is rejected with 422."""
    res = await client.post("/api/v1/budgets", headers=auth_headers, json={
        "name": "Invalid Budget",
        "amount": 5000.00,
        "period": "monthly",
        "start_date": "2025-06-01",
        "end_date": "2025-05-01"  # Invalid: end earlier than start
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_goal_negative_target_amount_rejected(client: AsyncClient, auth_headers):
    """Verify that creating a goal with negative target amount is rejected with 422."""
    res = await client.post("/api/v1/goals", headers=auth_headers, json={
        "name": "Negative Goal",
        "target_amount": -1000.00
    })
    assert res.status_code == 422


# ==============================================================================
# 5. DATE RANGE & ANALYTICS ROBUSTNESS
# ==============================================================================

def test_date_range_helper_normalizes_inverted_dates():
    """Verify that date_range_helper handles inverted custom dates cleanly."""
    d_start = datetime.date(2025, 6, 30)
    d_end = datetime.date(2025, 6, 1)

    start_date, end_date, prev_start, prev_end = get_period_dates(
        period="custom",
        custom_start=d_start,
        custom_end=d_end
    )
    assert start_date == datetime.date(2025, 6, 1)
    assert end_date == datetime.date(2025, 6, 30)
    assert start_date <= end_date
