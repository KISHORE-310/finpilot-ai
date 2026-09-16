"""
Phase 4: LangGraph financial reasoning graph builder.

Graph topology:
  START -> planner -> [context_router | analyst] -> analyst -> critic
        -> [analyst (REVISE loop, max 5) | final_response] -> END
"""
from __future__ import annotations

import functools
import logging
from typing import Any, List

from langgraph.graph import END, START, StateGraph

from app.ai.graph.edges import critic_decision, should_run_rag
from app.ai.graph.nodes import (
    analyst_node,
    context_router_node,
    critic_node,
    final_response_node,
    planner_node,
)
from app.ai.graph.state import GraphState

logger = logging.getLogger(__name__)


def build_financial_graph(tools: List[Any]):
    """
    Build and compile the Phase 4 multi-agent financial reasoning graph.

    Args:
        tools: List of LangChain BaseTool instances (user-scoped, bound at request time).

    Returns:
        A compiled LangGraph runnable.
    """
    builder = StateGraph(GraphState)

    # Bind tools into the analyst node via functools.partial
    analyst_with_tools = functools.partial(analyst_node, tools=tools)

    # Add nodes
    builder.add_node("planner", planner_node)
    builder.add_node("context_router", context_router_node)
    builder.add_node("analyst", analyst_with_tools)
    builder.add_node("critic", critic_node)
    builder.add_node("final_response", final_response_node)

    # Entry point
    builder.add_edge(START, "planner")

    # Planner -> context_router OR analyst (based on intent)
    builder.add_conditional_edges(
        "planner",
        should_run_rag,
        {
            "context_router": "context_router",
            "analyst": "analyst",
        },
    )

    # context_router always leads to analyst
    builder.add_edge("context_router", "analyst")

    # analyst -> critic
    builder.add_edge("analyst", "critic")

    # critic -> analyst (REVISE) OR final_response (PASS)
    builder.add_conditional_edges(
        "critic",
        critic_decision,
        {
            "analyst": "analyst",
            "final_response": "final_response",
        },
    )

    # final_response -> END
    builder.add_edge("final_response", END)

    compiled = builder.compile()
    logger.info("Phase 4 financial reasoning graph compiled successfully.")
    return compiled
