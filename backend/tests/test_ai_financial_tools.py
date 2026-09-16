import pytest
import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.tools import get_financial_tools
from app.db.models.user import User

@pytest.mark.asyncio
async def test_financial_tools_initialization(db_session: AsyncSession, test_user: User):
    tools = get_financial_tools(db_session, test_user.id)
    assert len(tools) == 13
    tool_names = [t.name for t in tools]
    expected_tools = [
        "get_financial_overview",
        "get_cash_flow",
        "get_spending_analysis",
        "get_category_spending",
        "search_transactions",
        "get_budget_status",
        "get_goal_status",
        "get_investment_summary",
        "get_net_worth",
        "get_financial_health",
        "get_financial_anomalies",
        "get_recurring_expenses",
        "query_financial_knowledge_rag"
    ]
    for expected in expected_tools:
        assert expected in tool_names

@pytest.mark.asyncio
async def test_financial_overview_tool_execution(db_session: AsyncSession, test_user: User):
    tools = get_financial_tools(db_session, test_user.id)
    overview_tool = next(t for t in tools if t.name == "get_financial_overview")
    result = await overview_tool.ainvoke({})
    data = json.loads(result)
    assert "net_worth" in data
    assert "total_assets" in data
    assert "total_liabilities" in data

@pytest.mark.asyncio
async def test_cash_flow_tool_execution(db_session: AsyncSession, test_user: User):
    tools = get_financial_tools(db_session, test_user.id)
    cash_flow_tool = next(t for t in tools if t.name == "get_cash_flow")
    result = await cash_flow_tool.ainvoke({"period": "this_month"})
    data = json.loads(result)
    # CashFlowResponse fields from Phase 2
    assert "total_income" in data or "net_cash_flow" in data

@pytest.mark.asyncio
async def test_rag_tool_execution(db_session: AsyncSession, test_user: User):
    tools = get_financial_tools(db_session, test_user.id)
    rag_tool = next(t for t in tools if t.name == "query_financial_knowledge_rag")
    result = await rag_tool.ainvoke({"query": "What is an emergency fund?"})
    data = json.loads(result)
    assert "educational_context" in data
    assert "citations" in data
