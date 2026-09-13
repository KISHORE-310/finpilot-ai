import json
from typing import Any, Dict, List, Optional, Tuple
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from app.ai.config import ai_settings


class DeterministicMockFinancialLLM(BaseChatModel):
    """
    High-fidelity deterministic ChatModel used for automated testing, offline verification,
    and when external LLM API keys are not provided.
    Implements tool calling and grounded response synthesis based on user financial queries.
    """
    tools_list: List[Any] = []

    @property
    def _llm_type(self) -> str:
        return "finpilot_deterministic_mock"

    def bind_tools(self, tools: List[Any], **kwargs: Any) -> "DeterministicMockFinancialLLM":
        self.tools_list = tools
        return self

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        last_msg = messages[-1] if messages else HumanMessage(content="")

        # 1. If previous step was a ToolMessage, summarize the tool result into a grounded answer
        if isinstance(last_msg, ToolMessage):
            tool_name = last_msg.name or "tool"
            try:
                data = json.loads(last_msg.content)
            except Exception:
                data = {"raw": last_msg.content}

            answer = self._synthesize_tool_answer(tool_name, data, messages)
            gen = ChatGeneration(message=AIMessage(content=answer))
            return ChatResult(generations=[gen])

        # 2. If it's a HumanMessage, route to appropriate tool call
        query = last_msg.content.lower() if isinstance(last_msg, HumanMessage) else ""

        tool_to_call, tool_args = self._determine_tool(query)
        if tool_to_call:
            # Return an AIMessage with tool_calls
            tool_call_dict = {
                "name": tool_to_call,
                "args": tool_args,
                "id": "call_deterministic_001",
                "type": "tool_call",
            }
            ai_msg = AIMessage(
                content="",
                tool_calls=[tool_call_dict],
            )
            return ChatResult(generations=[ChatGeneration(message=ai_msg)])

        # 3. Direct general response if no specific financial tool needed
        gen = ChatGeneration(message=AIMessage(content="I am FinPilot AI, your personal financial analyst. Ask me about your cash flow, budgets, investments, net worth, or general financial concepts."))
        return ChatResult(generations=[gen])

    def _determine_tool(self, query: str) -> Tuple[Optional[str], Dict[str, Any]]:
        if "overview" in query or "financial position" in query:
            return "get_financial_overview", {"period": "this_month"}
        if "cash flow" in query or "savings rate" in query or "save" in query or "saving" in query:
            return "get_cash_flow", {"period": "this_month", "granularity": "monthly"}
        if "budget" in query:
            return "get_budget_status", {}
        if "goal" in query or "emergency fund" in query and "how much" in query:
            return "get_goal_status", {}
        if "invest" in query or "portfolio" in query or "p&l" in query or "return" in query:
            return "get_investment_summary", {}
        if "net worth" in query or "asset" in query or "liability" in query:
            return "get_net_worth", {}
        if "unusual" in query or "anomal" in query or "spike" in query:
            return "get_financial_anomalies", {"period": "this_month"}
        if "recurring" in query or "subscription" in query:
            return "get_recurring_expenses", {}
        if "spend" in query or "expense" in query or "food" in query or "dining" in query or "category" in query:
            if "food" in query:
                return "get_category_spending", {"category_name": "food", "period": "this_month"}
            return "get_spending_analysis", {"period": "this_month"}
        if "what is" in query or "how to" in query or "concept" in query or "explain" in query:
            return "query_financial_knowledge_rag", {"query": query}

        # Default fallback to overview
        return "get_financial_overview", {"period": "this_month"}

    def _synthesize_tool_answer(self, tool_name: str, data: Dict[str, Any], messages: List[BaseMessage]) -> str:
        if tool_name == "get_cash_flow":
            inc = data.get("total_income", "0.00")
            exp = data.get("total_expenses", "0.00")
            net = data.get("net_cash_flow", "0.00")
            sr = data.get("savings_rate", "0.00")
            return f"Based on your recorded ledger, you had total income of ${inc} and expenses of ${exp}, resulting in a net cash flow of ${net} with a savings rate of {sr}%."

        elif tool_name == "get_spending_analysis" or tool_name == "get_category_spending":
            if "total_spending" in data:
                tot = data.get("total_spending", "0.00")
                cats = data.get("categories", [])
                top_cat = cats[0]["category_name"] if cats else "Uncategorized"
                return f"Your total recorded spending for this period is ${tot}. Your highest expenditure category is {top_cat}."
            elif "amount" in data:
                cname = data.get("category_name", "category")
                amt = data.get("amount", "0.00")
                pct = data.get("percentage", "0.00")
                return f"You have spent ${amt} on {cname} during this period, which accounts for {pct}% of your total expenses."
            elif "message" in data:
                return data["message"]

        elif tool_name == "get_budget_status":
            tot_b = data.get("total_budget", "0.00")
            tot_s = data.get("total_spent", "0.00")
            util = data.get("overall_utilization", "0.00")
            return f"You have budgeted ${tot_b} and spent ${tot_s} so far ({util}% overall utilization)."

        elif tool_name == "get_goal_status":
            tot_t = data.get("total_target", "0.00")
            tot_s = data.get("total_saved", "0.00")
            prog = data.get("overall_progress", "0.00")
            return f"Your total goal target is ${tot_t}, with ${tot_s} saved so far ({prog}% complete)."

        elif tool_name == "get_investment_summary":
            c_val = data.get("current_value", "0.00")
            pnl = data.get("total_pnl", "0.00")
            pct = data.get("pnl_percentage", "0.00")
            return f"Your investment portfolio is valued at ${c_val}, with a recorded P&L of ${pnl} ({pct}% return)."

        elif tool_name == "get_net_worth":
            current = data.get("current", {})
            nw = current.get("net_worth", "0.00")
            assets = current.get("total_assets", "0.00")
            liab = current.get("total_liabilities", "0.00")
            return f"Your current net worth is ${nw}, consisting of ${assets} in total assets and ${liab} in liabilities."

        elif tool_name == "query_financial_knowledge_rag":
            ctx = data.get("educational_context", "")
            return f"According to financial education guidelines:\n\n{ctx[:600]}..."

        return f"Financial analysis completed with recorded figures: {json.dumps(data)}"


def get_chat_model() -> BaseChatModel:
    """Factory returning configured LLM or DeterministicMockFinancialLLM."""
    if ai_settings.LLM_PROVIDER == "openai" and ai_settings.LLM_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=ai_settings.LLM_MODEL,
                api_key=ai_settings.LLM_API_KEY,
                temperature=ai_settings.LLM_TEMPERATURE,
                max_tokens=ai_settings.LLM_MAX_TOKENS,
            )
        except Exception:
            return DeterministicMockFinancialLLM()
    return DeterministicMockFinancialLLM()
