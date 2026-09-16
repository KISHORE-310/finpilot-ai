"""
Phase 4: LangGraph GraphState TypedDict.
Carries all information through the multi-agent graph.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage

from app.ai.schemas.chat import Citation, KeyMetric, AIInsight


class GraphState(TypedDict, total=False):
    # ── Input ──────────────────────────────────────────────────────────────
    user_query: str
    user_id: str
    conversation_id: Optional[str]
    include_rag: bool

    # ── Planner outputs ────────────────────────────────────────────────────
    intent: str          # e.g. "financial_data", "educational", "hybrid"
    plan: str            # free-text reasoning plan from planner node
    tools_plan: List[str]  # list of tool names planner wants to call

    # ── Context Router outputs ─────────────────────────────────────────────
    rag_context: str
    rag_citations: List[Citation]

    # ── Analyst outputs ────────────────────────────────────────────────────
    messages: List[BaseMessage]
    tools_used: List[str]
    tool_outputs: Dict[str, Any]
    analyst_draft: str

    # ── Critic outputs ────────────────────────────────────────────────────
    critic_verdict: str   # "PASS" | "REVISE"
    critic_feedback: str
    iteration: int

    # ── Final response fields ──────────────────────────────────────────────
    final_response: str
    key_metrics: List[KeyMetric]
    insights: List[AIInsight]
    citations: List[Citation]
    guardrail_intervened: bool
