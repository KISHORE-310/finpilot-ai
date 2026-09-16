"""
Phase 4: LangGraph edge condition functions.
"""
from __future__ import annotations

from app.ai.config import ai_settings
from app.ai.graph.state import GraphState


def should_run_rag(state: GraphState) -> str:
    """Route after planner: educational/hybrid queries go to context_router, others skip."""
    intent = state.get("intent", "financial_data")
    if intent in ("educational", "hybrid"):
        return "context_router"
    return "analyst"


def critic_decision(state: GraphState) -> str:
    """Route after critic: REVISE loops back to analyst, PASS goes to final_response."""
    verdict = state.get("critic_verdict", "PASS")
    iteration = state.get("iteration", 0)

    if verdict == "REVISE" and iteration < ai_settings.MAX_GRAPH_ITERATIONS:
        return "analyst"
    return "final_response"
