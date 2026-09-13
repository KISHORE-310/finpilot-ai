import json
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional
from langchain_core.tools import tool, BaseTool
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.analytics import (
    get_period_dates,
    CashFlowAnalyticsService,
    SpendingAnalyticsService,
    IncomeAnalyticsService,
    BudgetAnalyticsService,
    GoalAnalyticsService,
    InvestmentAnalyticsService,
    NetWorthAnalyticsService,
    AnomalyDetectionService,
    FinancialHealthService,
    InsightsEngineService,
)
from app.repositories.transaction_repo import TransactionRepository
from app.ai.rag.retriever import FinancialKnowledgeRetriever


def get_financial_tools(session: AsyncSession, user_id: str) -> List[BaseTool]:
    """
    Factory creating user-scoped LangChain tools calling Phase 2 deterministic services.
    user_id is securely bound at instantiation and NOT provided by the LLM.
    """
    retriever = FinancialKnowledgeRetriever()

    @tool
    async def get_financial_overview(period: str = "this_month") -> str:
        """Returns the user's high-level financial overview including net worth, income, expenses, and savings rate."""
        start_d, end_d, _, _ = get_period_dates(period)
        cf_service = CashFlowAnalyticsService(session)
        nw_service = NetWorthAnalyticsService(session)

        cf = await cf_service.get_cash_flow(user_id, start_d, end_d, "monthly")
        nw = await nw_service.get_current_breakdown(user_id)

        return json.dumps({
            "period": period,
            "start_date": str(start_d),
            "end_date": str(end_d),
            "net_worth": str(nw.net_worth),
            "total_assets": str(nw.total_assets),
            "total_liabilities": str(nw.total_liabilities),
            "total_income": str(cf.total_income),
            "total_expenses": str(cf.total_expenses),
            "net_cash_flow": str(cf.net_cash_flow),
            "savings_rate_percentage": str(cf.savings_rate),
        })

    @tool
    async def get_cash_flow(period: str = "this_month", granularity: str = "monthly") -> str:
        """Returns time-series cash flow analysis with income, expenses, net savings, and savings rate."""
        start_d, end_d, _, _ = get_period_dates(period)
        service = CashFlowAnalyticsService(session)
        res = await service.get_cash_flow(user_id, start_d, end_d, granularity)
        return res.model_dump_json()

    @tool
    async def get_spending_analysis(period: str = "this_month") -> str:
        """Returns spending breakdown by category with percentage distribution and period-over-period comparison."""
        start_d, end_d, prev_s, prev_e = get_period_dates(period)
        service = SpendingAnalyticsService(session)
        res = await service.get_category_spending(user_id, start_d, end_d, prev_s, prev_e)
        return res.model_dump_json()

    @tool
    async def get_category_spending(category_name: str, period: str = "this_month") -> str:
        """Returns spending details for a specific category and its historical comparison."""
        start_d, end_d, prev_s, prev_e = get_period_dates(period)
        service = SpendingAnalyticsService(session)
        breakdown = await service.get_category_spending(user_id, start_d, end_d, prev_s, prev_e)
        target = category_name.strip().lower()
        matched = [c for c in breakdown.categories if target in c.category_name.lower()]
        if matched:
            return matched[0].model_dump_json()
        return json.dumps({"message": f"No spending recorded for category '{category_name}' in period {period}."})

    @tool
    async def search_transactions(
        keyword: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
    ) -> str:
        """Searches recent expense or income transactions matching keyword or category. Max 20 results."""
        capped_limit = min(20, max(1, limit))
        service = SpendingAnalyticsService(session)
        start_d, end_d, _, _ = get_period_dates("last_3_months")
        res = await service.get_largest_transactions(user_id, start_d, end_d, capped_limit)
        return res.model_dump_json()

    @tool
    async def get_budget_status() -> str:
        """Returns user's active budgets, spent amount, remaining amount, utilization percentage, and projected spend status."""
        service = BudgetAnalyticsService(session)
        res = await service.get_budget_analytics(user_id)
        return res.model_dump_json()

    @tool
    async def get_goal_status() -> str:
        """Returns user's financial goals progress, target amounts, required monthly contributions, and on-track status."""
        service = GoalAnalyticsService(session)
        res = await service.get_goal_analytics(user_id)
        return res.model_dump_json()

    @tool
    async def get_investment_summary() -> str:
        """Returns investment portfolio summary with cost basis, recorded current value, total P&L, and asset allocation."""
        service = InvestmentAnalyticsService(session)
        res = await service.get_investment_analytics(user_id)
        return res.model_dump_json()

    @tool
    async def get_net_worth() -> str:
        """Returns balance sheet breakdown (cash, bank, investments vs credit cards, loans) and net worth history."""
        service = NetWorthAnalyticsService(session)
        res = await service.get_net_worth_analytics(user_id)
        return res.model_dump_json()

    @tool
    async def get_financial_health() -> str:
        """Returns the 0-100 deterministic Financial Health Score, dimension sub-scores, strengths, and improvement areas."""
        service = FinancialHealthService(session)
        res = await service.get_financial_health(user_id)
        return res.model_dump_json()

    @tool
    async def get_financial_anomalies(period: str = "this_month") -> str:
        """Returns statistically flagged unusual transactions and category spending surges."""
        start_d, end_d, _, _ = get_period_dates(period)
        service = AnomalyDetectionService(session)
        res = await service.get_anomalies(user_id, start_d, end_d)
        return res.model_dump_json()

    @tool
    async def get_recurring_expenses() -> str:
        """Returns active recurring commitments, annualized costs, and upcoming occurrences in next 30 days."""
        service = SpendingAnalyticsService(session)
        res = await service.get_recurring_analysis(user_id)
        return res.model_dump_json()

    @tool
    async def query_financial_knowledge_rag(query: str) -> str:
        """Retrieves educational financial knowledge from curated reference documents for conceptual questions."""
        content, citations = retriever.query_rag(query, top_k=2)
        return json.dumps({
            "educational_context": content,
            "citations": [c.model_dump() for c in citations]
        })

    return [
        get_financial_overview,
        get_cash_flow,
        get_spending_analysis,
        get_category_spending,
        search_transactions,
        get_budget_status,
        get_goal_status,
        get_investment_summary,
        get_net_worth,
        get_financial_health,
        get_financial_anomalies,
        get_recurring_expenses,
        query_financial_knowledge_rag,
    ]
