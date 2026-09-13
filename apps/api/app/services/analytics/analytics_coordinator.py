from datetime import date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.analytics.date_range_helper import get_period_dates
from app.services.analytics.cash_flow_service import CashFlowAnalyticsService
from app.services.analytics.spending_service import SpendingAnalyticsService
from app.services.analytics.income_service import IncomeAnalyticsService
from app.services.analytics.budget_analytics_service import BudgetAnalyticsService
from app.services.analytics.goal_analytics_service import GoalAnalyticsService
from app.services.analytics.investment_analytics_service import InvestmentAnalyticsService
from app.services.analytics.net_worth_service import NetWorthAnalyticsService
from app.services.analytics.anomaly_service import AnomalyDetectionService
from app.services.analytics.financial_health_service import FinancialHealthService
from app.services.analytics.alert_service import AlertService
from app.services.analytics.insights_service import InsightsEngineService
from app.schemas.analytics import AnalyticsOverviewResponse


class AnalyticsCoordinatorService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.cash_flow = CashFlowAnalyticsService(session)
        self.spending = SpendingAnalyticsService(session)
        self.income = IncomeAnalyticsService(session)
        self.budgets = BudgetAnalyticsService(session)
        self.goals = GoalAnalyticsService(session)
        self.investments = InvestmentAnalyticsService(session)
        self.net_worth = NetWorthAnalyticsService(session)
        self.anomalies = AnomalyDetectionService(session)
        self.health = FinancialHealthService(session)
        self.alerts = AlertService(session)
        self.insights = InsightsEngineService(session)

    async def get_overview(
        self,
        user_id: str,
        period: str = "this_month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
    ) -> AnalyticsOverviewResponse:
        start_d, end_d, prev_s, prev_e = get_period_dates(period, custom_start, custom_end)

        nw_current = await self.net_worth.get_current_breakdown(user_id)
        cf = await self.cash_flow.get_cash_flow(user_id, start_d, end_d, "monthly")
        sp = await self.spending.get_category_spending(user_id, start_d, end_d, prev_s, prev_e)
        b_summary = await self.budgets.get_budget_analytics(user_id)
        g_summary = await self.goals.get_goal_analytics(user_id)
        inv_summary = await self.investments.get_investment_analytics(user_id)
        fh = await self.health.get_financial_health(user_id)
        top_alerts = await self.alerts.get_user_alerts(user_id, unread_only=True, limit=5)

        return AnalyticsOverviewResponse(
            period=period,
            start_date=start_d,
            end_date=end_d,
            net_worth=nw_current,
            cash_flow=cf,
            spending=sp,
            budget_summary=b_summary,
            goal_summary=g_summary,
            investment_summary=inv_summary,
            financial_health=fh,
            top_alerts=top_alerts,
        )
