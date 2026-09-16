import pytest
from app.ai.graph.state import GraphState
from app.ai.graph.edges import should_run_rag, critic_decision
from app.ai.graph.nodes import (
    planner_node,
    context_router_node,
    analyst_node,
    critic_node,
    final_response_node,
    _extract_key_metrics,
)
from app.ai.graph.graph import build_financial_graph
from app.ai.schemas.chat import KeyMetric, Citation, ChatRequest
from app.ai.services.analyst_service import FinancialAnalystService


def test_graph_edges():
    # should_run_rag
    assert should_run_rag({"intent": "educational"}) == "context_router"
    assert should_run_rag({"intent": "hybrid"}) == "context_router"
    assert should_run_rag({"intent": "financial_data"}) == "analyst"

    # critic_decision
    assert critic_decision({"critic_verdict": "PASS", "iteration": 1}) == "final_response"
    assert critic_decision({"critic_verdict": "REVISE", "iteration": 1}) == "analyst"
    assert critic_decision({"critic_verdict": "REVISE", "iteration": 5}) == "final_response"  # capped at MAX_GRAPH_ITERATIONS


@pytest.mark.asyncio
async def test_planner_node():
    state = GraphState(
        user_query="How much did I spend on food this month?",
        messages=[],
    )
    result = await planner_node(state)
    assert "intent" in result
    assert "tools_plan" in result
    assert "plan" in result


@pytest.mark.asyncio
async def test_context_router_node():
    # Educational query should fetch rag context
    state = GraphState(
        intent="educational",
        user_query="What is the 50/30/20 budget rule?",
        include_rag=True,
    )
    result = await context_router_node(state)
    assert "rag_context" in result
    assert "rag_citations" in result

    # Financial data query should skip rag context
    state_fin = GraphState(
        intent="financial_data",
        user_query="What is my account balance?",
        include_rag=True,
    )
    result_fin = await context_router_node(state_fin)
    assert result_fin.get("rag_context") == ""
    assert result_fin.get("rag_citations") == []


@pytest.mark.asyncio
async def test_critic_node():
    state = GraphState(
        user_query="My net worth overview",
        analyst_draft="Your net worth is ₹5,00,000.",
        tool_outputs={"get_net_worth": {"net_worth": "500000.00"}},
        iteration=0,
    )
    result = await critic_node(state)
    assert result.get("critic_verdict") in ("PASS", "REVISE")
    assert result.get("iteration") == 1


@pytest.mark.asyncio
async def test_final_response_node():
    state = GraphState(
        user_query="Summary of my portfolio",
        analyst_draft="Your investment portfolio is valued at ₹1,50,000 with a 12% return.",
        critic_feedback="",
        rag_citations=[Citation(topic="Investing", title="Mutual Funds", source="AMFI", snippet="SIP investing")],
        citations=[],
    )
    result = await final_response_node(state)
    assert "final_response" in result
    assert len(result.get("final_response", "")) > 0
    assert len(result.get("citations", [])) > 0


def test_extract_key_metrics():
    tool_outputs = {
        "get_financial_overview": {
            "net_worth": "250000.00",
            "savings_rate_percentage": "35.5",
            "total_income": "80000.00",
            "total_expenses": "51600.00",
        },
        "get_investment_summary": {
            "current_value": "120000.00",
            "pnl_percentage": "14.2",
        },
    }
    metrics = _extract_key_metrics(tool_outputs)
    assert len(metrics) >= 2
    labels = [m.label for m in metrics]
    assert "Net Worth" in labels
    assert "Savings Rate" in labels


@pytest.mark.asyncio
async def test_build_and_run_graph():
    # Test compiled graph with mock tools
    graph = build_financial_graph(tools=[])
    assert graph is not None

    initial_state = GraphState(
        user_query="What is my financial overview?",
        user_id="test_user_001",
        conversation_id=None,
        include_rag=True,
        messages=[],
        tools_used=[],
        tool_outputs={},
        rag_context="",
        rag_citations=[],
        citations=[],
        key_metrics=[],
        insights=[],
        iteration=0,
        critic_verdict="",
        critic_feedback="",
        analyst_draft="",
        final_response="",
        guardrail_intervened=False,
    )

    final_state = await graph.ainvoke(initial_state)
    assert "final_response" in final_state
    assert len(final_state["final_response"]) > 0
