import json
import re
from datetime import date
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from app.ai.config import ai_settings
from app.ai.models.provider import get_chat_model
from app.ai.tools import get_financial_tools
from app.ai.memory.conversation_memory import ConversationMemoryManager
from app.ai.safety.guardrails import SafetyGuardrails
from app.ai.schemas.chat import (
    AIInsight,
    ChatRequest,
    ChatResponse,
    Citation,
    KeyMetric,
)
from app.ai.rag.retriever import FinancialKnowledgeRetriever


class FinancialAnalystService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.memory_manager = ConversationMemoryManager(session)
        self.knowledge_retriever = FinancialKnowledgeRetriever()

    async def execute_chat(self, user_id: str, request: ChatRequest) -> ChatResponse:
        # 1. Safety Guardrails Check
        is_safe, refusal = SafetyGuardrails.inspect_query(request.message)
        conv = await self.memory_manager.get_or_create_conversation(user_id, request.conversation_id)

        if not is_safe:
            # Persist user query and refusal
            await self.memory_manager.persist_message(conv.id, "user", request.message)
            assistant_msg = await self.memory_manager.persist_message(conv.id, "assistant", refusal or "Query refused.")
            return ChatResponse(
                conversation_id=conv.id,
                message_id=assistant_msg.id,
                answer=refusal or "Query refused by safety guardrails.",
                tools_used=[],
                guardrail_intervened=True,
            )

        # 2. Persist User Message
        await self.memory_manager.persist_message(conv.id, "user", request.message)

        # 3. Update Conversation Title on first turn
        if conv.title == "Financial Analysis Session":
            short_title = request.message[:35] + "..." if len(request.message) > 35 else request.message
            conv.title = short_title.capitalize()
            await self.session.commit()

        # 4. Load Conversation Context & Initialize Model & Tools
        messages = await self.memory_manager.load_conversation_messages(conv.id)
        # Ensure latest user message is in context
        if not messages or messages[-1].content != request.message:
            messages.append(HumanMessage(content=request.message))

        tools = get_financial_tools(self.session, user_id)
        tool_map = {t.name: t for t in tools}

        model = get_chat_model()
        model_with_tools = model.bind_tools(tools)

        tools_used: List[str] = []
        citations: List[Citation] = []
        key_metrics: List[KeyMetric] = []
        insights: List[AIInsight] = []

        # 5. Bounded Tool Execution Loop (max iterations)
        iteration = 0
        final_answer = ""

        while iteration < ai_settings.MAX_TOOL_CALLS_PER_REQUEST:
            iteration += 1
            response = await model_with_tools.ainvoke(messages)
            messages.append(response)

            if not response.tool_calls:
                final_answer = response.content
                break

            # Process tool calls
            for tc in response.tool_calls:
                t_name = tc["name"]
                t_args = tc.get("args", {})
                tools_used.append(t_name)

                if t_name in tool_map:
                    tool_obj = tool_map[t_name]
                    try:
                        tool_out = await tool_obj.ainvoke(t_args)
                    except Exception as e:
                        tool_out = json.dumps({"error": f"Tool execution failed: {str(e)}"})

                    # Extract metrics and citations if present
                    self._extract_structured_elements(t_name, tool_out, key_metrics, citations)

                    tool_msg = ToolMessage(
                        content=str(tool_out),
                        name=t_name,
                        tool_call_id=tc.get("id", f"call_{iteration}"),
                    )
                    messages.append(tool_msg)
                else:
                    tool_msg = ToolMessage(
                        content=json.dumps({"error": f"Tool '{t_name}' not recognized."}),
                        name=t_name,
                        tool_call_id=tc.get("id", f"call_{iteration}"),
                    )
                    messages.append(tool_msg)

        if not final_answer and messages:
            final_answer = messages[-1].content if hasattr(messages[-1], "content") else "Analysis completed."

        # If answer is conceptual, ensure RAG citations are attached
        if "get_financial_overview" in tools_used:
            key_metrics.append(KeyMetric(label="Data Source", value="Verified Cash Ledger"))

        # 6. Persist Assistant Message
        meta = {
            "tools_used": list(set(tools_used)),
            "citations_count": len(citations),
            "metrics_count": len(key_metrics),
        }
        asst_record = await self.memory_manager.persist_message(conv.id, "assistant", final_answer, meta)

        return ChatResponse(
            conversation_id=conv.id,
            message_id=asst_record.id,
            answer=final_answer,
            key_metrics=key_metrics[:5],
            insights=insights[:3],
            citations=citations[:3],
            tools_used=list(set(tools_used)),
        )

    def _extract_structured_elements(
        self,
        tool_name: str,
        tool_out: str,
        key_metrics: List[KeyMetric],
        citations: List[Citation],
    ):
        try:
            data = json.loads(tool_out)
        except Exception:
            return

        if tool_name == "get_financial_overview":
            if "net_worth" in data:
                key_metrics.append(KeyMetric(label="Net Worth", value=f"${data['net_worth']}"))
            if "savings_rate_percentage" in data:
                key_metrics.append(KeyMetric(label="Savings Rate", value=f"{data['savings_rate_percentage']}%"))

        elif tool_name == "get_cash_flow":
            if "net_cash_flow" in data:
                key_metrics.append(KeyMetric(label="Net Cash Flow", value=f"${data['net_cash_flow']}"))
            if "savings_rate" in data:
                key_metrics.append(KeyMetric(label="Savings Rate", value=f"{data['savings_rate']}%"))

        elif tool_name == "get_spending_analysis":
            if "total_spending" in data:
                key_metrics.append(KeyMetric(label="Total Expenses", value=f"${data['total_spending']}"))

        elif tool_name == "get_budget_status":
            if "overall_utilization" in data:
                key_metrics.append(KeyMetric(label="Budget Utilization", value=f"{data['overall_utilization']}%"))

        elif tool_name == "get_investment_summary":
            if "current_value" in data:
                key_metrics.append(KeyMetric(label="Portfolio Value", value=f"${data['current_value']}"))
            if "pnl_percentage" in data:
                key_metrics.append(KeyMetric(label="Portfolio Return", value=f"{data['pnl_percentage']}%"))

        elif tool_name == "query_financial_knowledge_rag":
            c_list = data.get("citations", [])
            for c in c_list:
                citations.append(
                    Citation(
                        topic=c.get("topic", "Financial Education"),
                        title=c.get("title", "Resource Guide"),
                        source=c.get("source", "Educational Source"),
                        source_url=c.get("source_url"),
                        snippet=c.get("snippet"),
                    )
                )
