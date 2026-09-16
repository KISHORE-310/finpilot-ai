"""
Phase 4: FinancialAnalystService — LangGraph multi-agent orchestration.

Replaces the Phase 3 single-agent tool loop with a compiled LangGraph graph.
Public interface (`execute_chat`) is unchanged for full backward compatibility.
"""
import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import HumanMessage

from app.ai.config import ai_settings
from app.ai.graph.graph import build_financial_graph
from app.ai.graph.state import GraphState
from app.ai.memory.conversation_memory import ConversationMemoryManager
from app.ai.safety.guardrails import SafetyGuardrails
from app.ai.schemas.chat import (
    AIInsight,
    ChatRequest,
    ChatResponse,
    Citation,
    KeyMetric,
)
from app.ai.tools import get_financial_tools

logger = logging.getLogger(__name__)


class FinancialAnalystService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.memory_manager = ConversationMemoryManager(session)

    async def execute_chat(self, user_id: str, request: ChatRequest) -> ChatResponse:
        # ── 1. Safety Guardrails (always runs before graph) ──────────────────
        is_safe, refusal = SafetyGuardrails.inspect_query(request.message)
        conv = await self.memory_manager.get_or_create_conversation(
            user_id, request.conversation_id
        )

        if not is_safe:
            await self.memory_manager.persist_message(conv.id, "user", request.message)
            asst_record = await self.memory_manager.persist_message(
                conv.id, "assistant", refusal or "Query refused."
            )
            return ChatResponse(
                conversation_id=conv.id,
                message_id=asst_record.id,
                response=refusal or "Query refused by safety guardrails.",
                tools_used=[],
                guardrail_intervened=True,
            )

        # ── 2. Persist user message ───────────────────────────────────────────
        await self.memory_manager.persist_message(conv.id, "user", request.message)

        # ── 3. Update title on first turn ─────────────────────────────────────
        if conv.title == "Financial Analysis Session":
            short_title = (
                request.message[:35] + "..."
                if len(request.message) > 35
                else request.message
            )
            conv.title = short_title.capitalize()
            await self.session.commit()

        # ── 4. Load conversation context ──────────────────────────────────────
        messages = await self.memory_manager.load_conversation_messages(conv.id)
        if not messages or (
            hasattr(messages[-1], "content") and messages[-1].content != request.message
        ):
            messages.append(HumanMessage(content=request.message))

        # ── 5. Build tools and graph ──────────────────────────────────────────
        tools = get_financial_tools(self.session, user_id)
        graph = build_financial_graph(tools)

        # ── 6. Configure optional LangSmith tracing ───────────────────────────
        run_config: Dict[str, Any] = {}
        if ai_settings.langsmith_enabled:
            try:
                import os
                os.environ["LANGCHAIN_TRACING_V2"] = "true"
                os.environ["LANGCHAIN_API_KEY"] = ai_settings.LANGSMITH_API_KEY or ""
                os.environ["LANGCHAIN_PROJECT"] = ai_settings.LANGSMITH_PROJECT
                os.environ["LANGCHAIN_ENDPOINT"] = ai_settings.LANGSMITH_ENDPOINT
                run_config = {
                    "metadata": {
                        "user_id": user_id,
                        "conversation_id": conv.id,
                    }
                }
                logger.debug("LangSmith tracing enabled for this request.")
            except Exception as exc:
                logger.warning(f"LangSmith setup failed (non-fatal): {exc}")

        # ── 7. Initialize graph state ─────────────────────────────────────────
        initial_state = GraphState(
            user_query=request.message,
            user_id=user_id,
            conversation_id=conv.id,
            include_rag=getattr(request, "include_rag", True),
            messages=messages,
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

        # ── 8. Run the LangGraph ──────────────────────────────────────────────
        try:
            final_state: GraphState = await graph.ainvoke(initial_state, config=run_config)
        except Exception as exc:
            logger.error(f"Graph execution failed: {exc}", exc_info=True)
            # Graceful degradation: return a safe fallback response
            fallback_msg = (
                "I encountered an issue while analyzing your finances. "
                "Please try again or rephrase your question."
            )
            asst_record = await self.memory_manager.persist_message(
                conv.id, "assistant", fallback_msg
            )
            return ChatResponse(
                conversation_id=conv.id,
                message_id=asst_record.id,
                response=fallback_msg,
                tools_used=[],
            )

        # ── 9. Extract results from final state ───────────────────────────────
        final_answer = final_state.get("final_response") or final_state.get("analyst_draft") or "Analysis completed."
        tools_used = final_state.get("tools_used", [])
        key_metrics = final_state.get("key_metrics", [])
        citations = final_state.get("citations", [])
        insights = final_state.get("insights", [])

        # Append data source metric if financial tools were used
        if any(
            t in tools_used
            for t in ("get_financial_overview", "get_cash_flow", "get_net_worth")
        ):
            existing_labels = {m.label for m in key_metrics}
            if "Data Source" not in existing_labels:
                key_metrics.append(KeyMetric(label="Data Source", value="Verified Cash Ledger"))

        # ── 10. Persist assistant response ────────────────────────────────────
        meta = {
            "tools_used": list(set(tools_used)),
            "citations_count": len(citations),
            "metrics_count": len(key_metrics),
            "graph_iterations": final_state.get("iteration", 0),
        }
        asst_record = await self.memory_manager.persist_message(
            conv.id, "assistant", final_answer, meta
        )

        return ChatResponse(
            conversation_id=conv.id,
            message_id=asst_record.id,
            response=final_answer,
            key_metrics=key_metrics[:5],
            insights=insights[:3],
            citations=citations[:3],
            tools_used=list(set(tools_used)),
        )
