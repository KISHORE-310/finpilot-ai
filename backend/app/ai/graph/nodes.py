"""
Phase 4: LangGraph node implementations.
Nodes: planner, context_router, analyst, critic, final_response.
Each node is a pure async function: GraphState -> GraphState patch.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.ai.config import ai_settings
from app.ai.graph.state import GraphState
from app.ai.models.provider import get_chat_model
from app.ai.prompts.graph_prompts import (
    ANALYST_PROMPT,
    CRITIC_PROMPT,
    FINAL_RESPONSE_PROMPT,
    PLANNER_PROMPT,
)
from app.ai.rag.semantic_retriever import SemanticRetriever
from app.ai.schemas.chat import AIInsight, Citation, KeyMetric

logger = logging.getLogger(__name__)

# ─── Planner Node ─────────────────────────────────────────────────────────────


async def planner_node(state: GraphState) -> GraphState:
    """
    Analyzes the user query, determines intent, and produces a tool execution plan.
    """
    query = state.get("user_query", "")
    messages = state.get("messages", [])

    # Build history summary (last 4 messages)
    history_lines = []
    for msg in messages[-4:]:
        if isinstance(msg, HumanMessage):
            history_lines.append(f"User: {msg.content[:200]}")
        elif isinstance(msg, AIMessage):
            history_lines.append(f"Assistant: {msg.content[:200]}")
    history_text = "\n".join(history_lines) if history_lines else "No prior conversation."

    prompt_text = PLANNER_PROMPT.format(query=query, history=history_text)
    model = get_chat_model()
    response = await model.ainvoke([HumanMessage(content=prompt_text)])
    plan_text = response.content if hasattr(response, "content") else str(response)

    # Parse planner response
    intent = "financial_data"
    plan = "Retrieve financial data to answer the query."
    tools_plan: List[str] = []

    for line in plan_text.splitlines():
        line = line.strip()
        if line.startswith("INTENT:"):
            raw_intent = line[7:].strip().lower()
            if raw_intent in ("financial_data", "educational", "hybrid"):
                intent = raw_intent
        elif line.startswith("PLAN:"):
            plan = line[5:].strip()
        elif line.startswith("TOOLS:"):
            raw_tools = line[6:].strip()
            if raw_tools.upper() != "NONE":
                tools_plan = [t.strip() for t in raw_tools.split(",") if t.strip()]

    logger.debug(f"Planner: intent={intent}, tools={tools_plan}")

    return GraphState(
        intent=intent,
        plan=plan,
        tools_plan=tools_plan,
        iteration=state.get("iteration", 0),
    )


# ─── Context Router Node ──────────────────────────────────────────────────────


async def context_router_node(state: GraphState) -> GraphState:
    """
    Routes to RAG retrieval based on intent.
    Populates rag_context and rag_citations.
    """
    intent = state.get("intent", "financial_data")
    query = state.get("user_query", "")
    include_rag = state.get("include_rag", True)

    rag_context = ""
    rag_citations: List[Citation] = []

    if include_rag and intent in ("educational", "hybrid"):
        try:
            retriever = SemanticRetriever()
            rag_context, rag_citations = retriever.query_rag(query, top_k=ai_settings.RAG_TOP_K)
        except Exception as exc:
            logger.warning(f"RAG retrieval failed: {exc}")
            rag_context = ""
            rag_citations = []

    return GraphState(
        rag_context=rag_context,
        rag_citations=rag_citations,
    )


# ─── Analyst Node ─────────────────────────────────────────────────────────────


async def analyst_node(state: GraphState, tools: List[Any]) -> GraphState:
    """
    Executes financial tools per the plan and synthesizes an analyst draft.
    """
    query = state.get("user_query", "")
    plan = state.get("plan", "")
    tools_plan = state.get("tools_plan", [])
    rag_context = state.get("rag_context", "")
    existing_tools_used = state.get("tools_used", [])
    existing_tool_outputs = state.get("tool_outputs", {})
    messages = state.get("messages", [])
    critic_feedback = state.get("critic_feedback", "")

    # Build tool map
    tool_map = {t.name: t for t in tools}

    # If this is a revision pass (iteration > 0), use existing tool outputs
    # and only re-run tools if the critic explicitly asked for more data
    tools_used = list(existing_tools_used)
    tool_outputs: Dict[str, Any] = dict(existing_tool_outputs)

    # Execute planned tools (skip already-executed ones)
    for t_name in tools_plan:
        if t_name in tool_outputs:
            continue  # Already have this data
        if t_name not in tool_map:
            logger.warning(f"Tool {t_name} not found in tool map.")
            continue
        try:
            out = await tool_map[t_name].ainvoke({})
            tool_outputs[t_name] = json.loads(out) if isinstance(out, str) else out
            tools_used.append(t_name)
        except Exception as exc:
            tool_outputs[t_name] = {"error": str(exc)}
            tools_used.append(t_name)

    # Format tool outputs for prompt
    tool_outputs_text = json.dumps(tool_outputs, indent=2, default=str) if tool_outputs else "No tool data retrieved."

    # Build analyst prompt
    prompt_text = ANALYST_PROMPT.format(
        query=query,
        plan=plan,
        rag_context=rag_context or "No educational context needed.",
        tool_outputs=tool_outputs_text,
    )
    if critic_feedback:
        prompt_text += f"\n\nCRITIC FEEDBACK TO ADDRESS: {critic_feedback}"

    model = get_chat_model()
    response = await model.ainvoke([HumanMessage(content=prompt_text)])
    draft = response.content if hasattr(response, "content") else str(response)

    # Extract key metrics from tool outputs
    key_metrics = _extract_key_metrics(tool_outputs)

    return GraphState(
        tools_used=list(set(tools_used)),
        tool_outputs=tool_outputs,
        analyst_draft=draft,
        key_metrics=key_metrics,
    )


# ─── Critic Node ──────────────────────────────────────────────────────────────


async def critic_node(state: GraphState) -> GraphState:
    """
    Reviews the analyst draft for grounding, completeness, and safety.
    Returns PASS or REVISE with feedback.
    """
    query = state.get("user_query", "")
    draft = state.get("analyst_draft", "")
    tool_outputs = state.get("tool_outputs", {})
    iteration = state.get("iteration", 0)

    # Hard iteration cap — always PASS after max iterations
    if iteration >= ai_settings.MAX_GRAPH_ITERATIONS - 1:
        logger.debug(f"Critic: max iterations reached ({iteration}), forcing PASS.")
        return GraphState(
            critic_verdict="PASS",
            critic_feedback="",
            iteration=iteration + 1,
        )

    tool_outputs_text = json.dumps(tool_outputs, indent=2, default=str)

    prompt_text = CRITIC_PROMPT.format(
        query=query,
        draft=draft,
        tool_outputs=tool_outputs_text,
    )

    model = get_chat_model()
    response = await model.ainvoke([HumanMessage(content=prompt_text)])
    critic_text = response.content if hasattr(response, "content") else str(response)

    verdict = "PASS"
    feedback = ""

    for line in critic_text.splitlines():
        line = line.strip()
        if line.startswith("VERDICT:"):
            v = line[8:].strip().upper()
            if v in ("PASS", "REVISE"):
                verdict = v
        elif line.startswith("FEEDBACK:"):
            feedback = line[9:].strip()

    logger.debug(f"Critic verdict: {verdict} (iteration={iteration})")

    return GraphState(
        critic_verdict=verdict,
        critic_feedback=feedback,
        iteration=iteration + 1,
    )


# ─── Final Response Node ──────────────────────────────────────────────────────


async def final_response_node(state: GraphState) -> GraphState:
    """
    Produces the polished final response incorporating critic feedback (if any).
    """
    query = state.get("user_query", "")
    draft = state.get("analyst_draft", "")
    feedback = state.get("critic_feedback", "")
    rag_citations = state.get("rag_citations", [])
    existing_citations = state.get("citations", [])

    prompt_text = FINAL_RESPONSE_PROMPT.format(
        query=query,
        draft=draft,
        feedback=feedback or "No revision needed.",
    )

    model = get_chat_model()
    response = await model.ainvoke([HumanMessage(content=prompt_text)])
    final_text = response.content if hasattr(response, "content") else str(response)

    # Merge citations (RAG + tool-extracted)
    all_citations = list(rag_citations) + list(existing_citations)
    # Deduplicate by title
    seen_titles = set()
    deduped_citations = []
    for c in all_citations:
        if c.title not in seen_titles:
            seen_titles.add(c.title)
            deduped_citations.append(c)

    return GraphState(
        final_response=final_text,
        citations=deduped_citations[:3],
    )


# ─── Utilities ────────────────────────────────────────────────────────────────


def _extract_key_metrics(tool_outputs: Dict[str, Any]) -> List[KeyMetric]:
    """Extract KeyMetric objects from tool output data."""
    metrics: List[KeyMetric] = []

    if "get_financial_overview" in tool_outputs:
        d = tool_outputs["get_financial_overview"]
        if isinstance(d, dict):
            if "net_worth" in d:
                metrics.append(KeyMetric(label="Net Worth", value=f"₹{d['net_worth']}"))
            if "savings_rate_percentage" in d:
                metrics.append(KeyMetric(label="Savings Rate", value=f"{d['savings_rate_percentage']}%"))
            if "total_income" in d:
                metrics.append(KeyMetric(label="Income", value=f"₹{d['total_income']}"))
            if "total_expenses" in d:
                metrics.append(KeyMetric(label="Expenses", value=f"₹{d['total_expenses']}"))

    if "get_cash_flow" in tool_outputs:
        d = tool_outputs["get_cash_flow"]
        if isinstance(d, dict):
            if "net_cash_flow" in d:
                metrics.append(KeyMetric(label="Net Cash Flow", value=f"₹{d['net_cash_flow']}"))
            if "savings_rate" in d:
                metrics.append(KeyMetric(label="Savings Rate", value=f"{d['savings_rate']}%"))

    if "get_spending_analysis" in tool_outputs:
        d = tool_outputs["get_spending_analysis"]
        if isinstance(d, dict) and "total_spending" in d:
            metrics.append(KeyMetric(label="Total Expenses", value=f"₹{d['total_spending']}"))

    if "get_budget_status" in tool_outputs:
        d = tool_outputs["get_budget_status"]
        if isinstance(d, dict) and "overall_utilization" in d:
            metrics.append(KeyMetric(label="Budget Utilization", value=f"{d['overall_utilization']}%"))

    if "get_investment_summary" in tool_outputs:
        d = tool_outputs["get_investment_summary"]
        if isinstance(d, dict):
            if "current_value" in d:
                metrics.append(KeyMetric(label="Portfolio Value", value=f"₹{d['current_value']}"))
            if "pnl_percentage" in d:
                metrics.append(KeyMetric(label="Portfolio Return", value=f"{d['pnl_percentage']}%"))

    if "get_financial_health" in tool_outputs:
        d = tool_outputs["get_financial_health"]
        if isinstance(d, dict) and "score" in d:
            metrics.append(KeyMetric(label="Financial Health Score", value=f"{d['score']}/100"))

    if "get_net_worth" in tool_outputs:
        d = tool_outputs["get_net_worth"]
        if isinstance(d, dict):
            current = d.get("current", d)
            if "net_worth" in current:
                metrics.append(KeyMetric(label="Net Worth", value=f"₹{current['net_worth']}"))

    return metrics[:5]
