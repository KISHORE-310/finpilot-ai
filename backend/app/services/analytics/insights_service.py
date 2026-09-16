from datetime import date
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.analytics.cash_flow_service import CashFlowAnalyticsService
from app.services.analytics.spending_service import SpendingAnalyticsService
from app.services.analytics.financial_health_service import FinancialHealthService
from app.schemas.analytics import FinancialInsightItem, InsightsResponse


class InsightsEngineService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.cash_flow_service = CashFlowAnalyticsService(session)
        self.spending_service = SpendingAnalyticsService(session)
        self.health_service = FinancialHealthService(session)

    async def generate_insights(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        prev_start: date,
        prev_end: date,
    ) -> InsightsResponse:
        insights: List[FinancialInsightItem] = []

        # 1. Spending comparison
        sp = await self.spending_service.get_category_spending(user_id, start_date, end_date, prev_start, prev_end)
        for cat in sp.categories:
            if cat.percentage_change >= 20.0 and cat.amount > 50:
                insights.append(
                    FinancialInsightItem(
                        metric="category_spending_increase",
                        title=f"{cat.category_name} spending increased",
                        description=f"Spending in {cat.category_name} rose by {cat.percentage_change:.1f}% compared to previous period (+${cat.absolute_change:.2f}).",
                        severity="warning",
                        value=f"+{cat.percentage_change:.1f}%",
                    )
                )
            elif cat.percentage_change <= -20.0 and cat.prev_amount > 50:
                insights.append(
                    FinancialInsightItem(
                        metric="category_spending_decrease",
                        title=f"{cat.category_name} spending reduced",
                        description=f"Great job! You decreased spending in {cat.category_name} by {abs(cat.percentage_change):.1f}%.",
                        severity="info",
                        value=f"{cat.percentage_change:.1f}%",
                    )
                )

        # 2. Cash flow & Savings
        cf = await self.cash_flow_service.get_cash_flow(user_id, start_date, end_date, "monthly")
        if cf.savings_rate >= 25.0:
            insights.append(
                FinancialInsightItem(
                    metric="high_savings_rate",
                    title="Exceptional Savings Rate",
                    description=f"Your current savings rate of {cf.savings_rate:.1f}% puts you well ahead of financial targets.",
                    severity="info",
                    value=f"{cf.savings_rate:.1f}%",
                )
            )
        elif cf.net_cash_flow < 0:
            insights.append(
                FinancialInsightItem(
                    metric="negative_cash_flow",
                    title="Deficit Warning",
                    description=f"Expenses exceeded income by ${abs(cf.net_cash_flow):.2f} during this period.",
                    severity="critical",
                    value=f"-${abs(cf.net_cash_flow):.2f}",
                )
            )

        # 3. Financial Health
        fh = await self.health_service.get_financial_health(user_id)
        insights.append(
            FinancialInsightItem(
                metric="financial_health_score",
                title=f"Financial Health: {fh.rating}",
                description=f"Overall score is {fh.overall_score}/100 across 6 deterministic dimensions.",
                severity="info" if fh.overall_score >= 70 else "warning",
                value=f"{fh.overall_score}/100",
            )
        )

        return InsightsResponse(insights=insights)
