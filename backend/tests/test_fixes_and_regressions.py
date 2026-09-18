import pytest
import datetime
import math
from decimal import Decimal
from httpx import AsyncClient

from app.ai.graph.nodes import _resolve_tool_args, _parse_tool_args


@pytest.mark.asyncio
async def test_transaction_pagination_total_pages(client: AsyncClient, auth_headers: dict):
    acc = await client.post("/api/v1/accounts", json={"name": "Checking", "account_type": "checking", "current_balance": 10000.0}, headers=auth_headers)
    acc_id = acc.json()["id"]

    for i in range(5):
        res = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": acc_id,
                "amount": 50.00 + i,
                "transaction_type": "expense",
                "transaction_date": str(datetime.date.today()),
                "description": f"tx-{i}",
            },
            headers=auth_headers,
        )
        assert res.status_code == 201

    page = await client.get("/api/v1/transactions?page=1&page_size=2", headers=auth_headers)
    assert page.status_code == 200
    data = page.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
    assert data["total_pages"] == math.ceil(5 / 2)

    page2 = await client.get("/api/v1/transactions?page=3&page_size=2", headers=auth_headers)
    assert page2.status_code == 200
    assert len(page2.json()["items"]) == 1


@pytest.mark.asyncio
async def test_transaction_search_matches_merchant_name(client: AsyncClient, auth_headers: dict):
    acc = await client.post("/api/v1/accounts", json={"name": "Checking", "account_type": "checking", "current_balance": 10000.0}, headers=auth_headers)
    acc_id = acc.json()["id"]

    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 250.00,
            "transaction_type": "expense",
            "transaction_date": str(datetime.date.today()),
            "description": "restaurant bill",
            "merchant_name": "Swiggy",
        },
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 999.00,
            "transaction_type": "expense",
            "transaction_date": str(datetime.date.today()),
            "description": "other purchase",
            "merchant_name": "Amazon",
        },
        headers=auth_headers,
    )

    found = await client.get("/api/v1/transactions?search=swig", headers=auth_headers)
    assert found.status_code == 200
    items = found.json()["items"]
    assert len(items) == 1
    assert items[0]["merchant_name"] == "Swiggy"


@pytest.mark.asyncio
async def test_budget_analytics_accepts_period_and_dates(client: AsyncClient, auth_headers: dict):
    cat = await client.post("/api/v1/categories", json={"name": "Groceries", "category_type": "expense"}, headers=auth_headers)
    cat_id = cat.json()["id"]
    today = datetime.date.today()
    first = datetime.date(today.year, today.month, 1)
    await client.post(
        "/api/v1/budgets",
        json={"name": "Grocery Budget", "category_id": cat_id, "amount": 1000.0, "period": "monthly", "start_date": first.isoformat()},
        headers=auth_headers,
    )

    res = await client.get(
        f"/api/v1/analytics/budgets?period=custom&start_date={first.isoformat()}&end_date={today.isoformat()}",
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert Decimal(res.json()["total_budget"]) == Decimal("1000.00")

    res2 = await client.get("/api/v1/analytics/budgets?period=this_month", headers=auth_headers)
    assert res2.status_code == 200


@pytest.mark.asyncio
async def test_alert_evaluation_is_idempotent_within_24h(client: AsyncClient, auth_headers: dict):
    cat = await client.post("/api/v1/categories", json={"name": "Dining Out", "category_type": "expense"}, headers=auth_headers)
    cat_id = cat.json()["id"]
    acc = await client.post("/api/v1/accounts", json={"name": "Checking", "account_type": "checking", "current_balance": 10000.0}, headers=auth_headers)
    acc_id = acc.json()["id"]

    await client.post(
        "/api/v1/budgets",
        json={"name": "Dining", "category_id": cat_id, "amount": 100.0, "period": "monthly", "start_date": "2026-01-01"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "category_id": cat_id,
            "amount": 500.0,
            "transaction_type": "expense",
            "transaction_date": str(datetime.date.today()),
            "description": "dinner",
        },
        headers=auth_headers,
    )

    first = await client.post("/api/v1/alerts/evaluate", headers=auth_headers)
    second = await client.post("/api/v1/alerts/evaluate", headers=auth_headers)
    assert first.status_code == 200
    assert second.status_code == 200

    first_alerts = first.json()
    assert len(first_alerts) >= 1
    first_pairs = {(a["alert_type"], a["title"]) for a in first_alerts}
    assert ("budget_exceeded", "Budget Exceeded: Dining") in first_pairs

    # Repeated evaluation within 24h must not recreate the same alerts.
    second_pairs = {(a["alert_type"], a["title"]) for a in second.json()}
    assert first_pairs.isdisjoint(second_pairs)


@pytest.mark.asyncio
async def test_financial_health_uses_overall_score_key(client: AsyncClient, auth_headers: dict):
    res = await client.get("/api/v1/analytics/financial-health", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "overall_score" in data
    assert "rating" in data


@pytest.mark.asyncio
async def test_patch_expense_resyncs_account_balance_across_accounts(client: AsyncClient, auth_headers: dict):
    acc_a = await client.post("/api/v1/accounts", json={"name": "A", "account_type": "checking", "current_balance": 1000.0}, headers=auth_headers)
    acc_b = await client.post("/api/v1/accounts", json={"name": "B", "account_type": "checking", "current_balance": 2000.0}, headers=auth_headers)
    a_id, b_id = acc_a.json()["id"], acc_b.json()["id"]

    exp = await client.post(
        "/api/v1/expenses",
        json={"account_id": a_id, "name": "Weekly Groceries", "amount": 100.0, "description": "groceries"},
        headers=auth_headers,
    )
    assert exp.status_code == 201
    exp_id = exp.json()["id"]
    check_a = await client.get(f"/api/v1/accounts/{a_id}", headers=auth_headers)
    assert float(check_a.json()["current_balance"]) == 900.00

    upd = await client.patch(
        f"/api/v1/expenses/{exp_id}",
        json={"account_id": b_id, "amount": 150.0},
        headers=auth_headers,
    )
    assert upd.status_code == 200
    check_a2 = await client.get(f"/api/v1/accounts/{a_id}", headers=auth_headers)
    check_b = await client.get(f"/api/v1/accounts/{b_id}", headers=auth_headers)
    assert float(check_a2.json()["current_balance"]) == 1000.00
    assert float(check_b.json()["current_balance"]) == 1850.00


@pytest.mark.asyncio
async def test_income_analytics_single_source_from_transactions(client: AsyncClient, auth_headers: dict):
    acc = await client.post("/api/v1/accounts", json={"name": "Checking", "account_type": "checking", "current_balance": 0.0}, headers=auth_headers)
    acc_id = acc.json()["id"]
    cat = await client.post("/api/v1/categories", json={"name": "Salary", "category_type": "income"}, headers=auth_headers)
    cat_id = cat.json()["id"]

    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 50000.0,
            "transaction_type": "income",
            "transaction_date": str(datetime.date.today()),
            "description": "Salary credit",
            "category_id": cat_id,
        },
        headers=auth_headers,
    )

    await client.post(
        "/api/v1/income",
        json={"account_id": acc_id, "category_id": cat_id, "source": "salary", "amount": 50000.0, "is_recurring": True},
        headers=auth_headers,
    )

    res = await client.get("/api/v1/analytics/income", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert Decimal(data["total_income"]) == Decimal("50000.00")
    sources_total = sum(Decimal(s["amount"]) for s in data["sources"])
    assert sources_total == Decimal("50000.00")


@pytest.mark.asyncio
async def test_delete_income_reverses_account_balance(client: AsyncClient, auth_headers: dict):
    acc = await client.post("/api/v1/accounts", json={"name": "Checking", "account_type": "checking", "current_balance": 1000.0}, headers=auth_headers)
    acc_id = acc.json()["id"]

    inc = await client.post(
        "/api/v1/income",
        json={"account_id": acc_id, "source": "salary", "amount": 2000.0, "is_recurring": False},
        headers=auth_headers,
    )
    assert inc.status_code == 201
    check = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(check.json()["current_balance"]) == 3000.00

    dell = await client.delete(f"/api/v1/income/{inc.json()['id']}", headers=auth_headers)
    assert dell.status_code == 200
    check2 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert float(check2.json()["current_balance"]) == 1000.00


@pytest.mark.asyncio
async def test_ai_chat_survives_braces_in_message(client: AsyncClient, auth_headers: dict):
    """Regression: str.format placeholder crash on literal { } in user content."""
    res = await client.post(
        "/api/v1/ai/chat",
        json={"message": "Show my spending as JSON like {\"category\": \"food\"} — what is my total?"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["answer"]) > 0


@pytest.mark.asyncio
async def test_net_worth_snapshot_accepts_query_param(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        f"/api/v1/analytics/net-worth/snapshot?snapshot_date={datetime.date.today().isoformat()}",
        headers=auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["snapshot_date"] == datetime.date.today().isoformat()


@pytest.mark.asyncio
async def test_goal_analytics_includes_pace_and_gap(client: AsyncClient, auth_headers: dict):
    target_d = datetime.date.today() + datetime.timedelta(days=180)
    await client.post(
        "/api/v1/goals",
        json={
            "name": "New Car",
            "goal_type": "purchase",
            "target_amount": 100000.0,
            "current_amount": 20000.0,
            "target_date": target_d.isoformat(),
        },
        headers=auth_headers,
    )
    res = await client.get("/api/v1/analytics/goals", headers=auth_headers)
    assert res.status_code == 200
    goal = res.json()["goals"][0]
    assert "current_monthly_pace" in goal
    assert "contribution_gap" in goal
    assert "required_monthly_contribution" in goal


@pytest.mark.asyncio
async def test_inr_is_default_currency(client: AsyncClient, auth_headers: dict):
    acc = await client.post("/api/v1/accounts", json={"name": "Checking", "account_type": "checking", "current_balance": 1000.0}, headers=auth_headers)
    acc_id = acc.json()["id"]

    tx = await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acc_id,
            "amount": 100.0,
            "transaction_type": "expense",
            "transaction_date": str(datetime.date.today()),
            "description": "no currency specified",
        },
        headers=auth_headers,
    )
    assert tx.status_code == 201
    assert tx.json()["currency"] == "INR"

    goal = await client.post(
        "/api/v1/goals",
        json={"name": "Goal", "goal_type": "savings", "target_amount": 5000.0},
        headers=auth_headers,
    )
    assert goal.status_code == 201
    assert goal.json()["currency"] == "INR"


def test_parse_and_resolve_tool_args():
    raw = '{"get_category_spending": {"category_name": "food", "period": "this_month"}, "query_financial_knowledge_rag": {"query": "how to budget"}}'
    parsed = _parse_tool_args(raw)
    assert parsed["get_category_spending"]["category_name"] == "food"

    resolved = _resolve_tool_args(
        "What did I spend on groceries last week?",
        ["get_category_spending"],
        {},
    )
    assert resolved["get_category_spending"]["category_name"] == "groceries"

    rag_resolved = _resolve_tool_args(
        "How does the 50/30/20 rule work?",
        ["query_financial_knowledge_rag"],
        {},
    )
    assert rag_resolved["query_financial_knowledge_rag"]["query"] == "How does the 50/30/20 rule work?"