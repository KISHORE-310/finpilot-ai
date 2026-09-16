from datetime import date, timedelta
from decimal import Decimal
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.analytics.cash_flow_service import CashFlowAnalyticsService
from app.services.analytics.budget_analytics_service import BudgetAnalyticsService
from app.services.analytics.goal_analytics_service import GoalAnalyticsService
from app.services.analytics.net_worth_service import NetWorthAnalyticsService
from app.services.analytics.investment_analytics_service import InvestmentAnalyticsService
from app.schemas.analytics import FinancialHealthResponse, HealthScoreDimension


class FinancialHealthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.cash_flow_service = CashFlowAnalyticsService(session)
        self.budget_service = BudgetAnalyticsService(session)
        self.goal_service = GoalAnalyticsService(session)
        self.net_worth_service = NetWorthAnalyticsService(session)
        self.investment_service = InvestmentAnalyticsService(session)

    async def get_financial_health(self, user_id: str) -> FinancialHealthResponse:
        today = date.today()
        start_90 = today - timedelta(days=90)

        # 1. Cash flow & Savings Rate
        cf = await self.cash_flow_service.get_cash_flow(user_id, start_90, today, "monthly")
        sr = cf.savings_rate

        savings_score = 50
        if sr >= Decimal("30.00"):
            savings_score = 100
        elif sr >= Decimal("20.00"):
            savings_score = 85
        elif sr >= Decimal("10.00"):
            savings_score = 70
        elif sr >= Decimal("0.00"):
            savings_score = 50
        else:
            savings_score = 25

        # 2. Budget adherence
        b_res = await self.budget_service.get_budget_analytics(user_id)
        if b_res.budgets:
            total_b = len(b_res.budgets)
            adherence = (b_res.on_track_count * 100 + b_res.warning_count * 60) / total_b
            budget_score = int(adherence)
        else:
            budget_score = 80  # neutral

        # 3. Emergency fund progress & Liquidity
        nw = await self.net_worth_service.get_current_breakdown(user_id)
        avg_monthly_exp = Decimal(str(cf.total_expenses)) / Decimal("3.0") if cf.total_expenses > Decimal("0.00") else Decimal("1000.00")
        liquid_assets = nw.cash + nw.bank_accounts
        months_covered = liquid_assets / avg_monthly_exp if avg_monthly_exp > Decimal("0.00") else Decimal("0.00")

        if months_covered >= Decimal("6.0"):
            emergency_score = 100
        elif months_covered >= Decimal("3.0"):
            emergency_score = 80
        elif months_covered >= Decimal("1.0"):
            emergency_score = 60
        else:
            emergency_score = 30

        # 4. Debt burden
        if nw.total_assets > Decimal("0.00"):
            debt_ratio = (nw.total_liabilities / nw.total_assets) * Decimal("100.00")
            if debt_ratio == Decimal("0.00"):
                debt_score = 100
            elif debt_ratio <= Decimal("20.00"):
                debt_score = 85
            elif debt_ratio <= Decimal("50.00"):
                debt_score = 65
            else:
                debt_score = 35
        else:
            debt_score = 70 if nw.total_liabilities == Decimal("0.00") else 30

        # 5. Goal Progress
        goals_res = await self.goal_service.get_goal_analytics(user_id)
        if goals_res.goals:
            goal_score = int(goals_res.overall_progress)
        else:
            goal_score = 75

        # 6. Investment Presence
        inv_res = await self.investment_service.get_investment_analytics(user_id)
        if inv_res.total_invested > Decimal("0.00"):
            inv_score = 85 if inv_res.total_pnl >= Decimal("0.00") else 70
        else:
            inv_score = 60

        dimensions = [
            HealthScoreDimension(
                name="Savings & Cash Flow",
                score=savings_score,
                weight=Decimal("0.25"),
                status="Strong" if savings_score >= 70 else "Needs Attention",
                description=f"Savings rate is {sr:.1f}% over the last 90 days.",
            ),
            HealthScoreDimension(
                name="Budget Adherence",
                score=budget_score,
                weight=Decimal("0.20"),
                status="Strong" if budget_score >= 70 else "Needs Attention",
                description=f"{b_res.on_track_count} on-track, {b_res.over_budget_count} exceeded.",
            ),
            HealthScoreDimension(
                name="Emergency Liquidity",
                score=emergency_score,
                weight=Decimal("0.15"),
                status="Strong" if emergency_score >= 70 else "Needs Attention",
                description=f"{months_covered:.1f} months of expenses covered in liquid savings.",
            ),
            HealthScoreDimension(
                name="Debt Burden",
                score=debt_score,
                weight=Decimal("0.15"),
                status="Strong" if debt_score >= 70 else "Needs Attention",
                description="Liabilities are well controlled relative to assets." if debt_score >= 70 else "Debt balance requires reduction.",
            ),
            HealthScoreDimension(
                name="Goal Progress",
                score=goal_score,
                weight=Decimal("0.15"),
                status="Strong" if goal_score >= 70 else "Needs Attention",
                description=f"Overall financial goals completion is {goals_res.overall_progress:.1f}%.",
            ),
            HealthScoreDimension(
                name="Investments & Growth",
                score=inv_score,
                weight=Decimal("0.10"),
                status="Strong" if inv_score >= 70 else "Needs Attention",
                description=f"{inv_res.positions_count} active investment holdings tracked.",
            ),
        ]

        overall = sum(int(d.score * float(d.weight)) for d in dimensions)
        overall = min(100, max(0, overall))

        if overall >= 85:
            rating = "Excellent"
        elif overall >= 70:
            rating = "Strong"
        elif overall >= 50:
            rating = "Moderate"
        else:
            rating = "Needs Attention"

        strengths: List[str] = []
        improvements: List[str] = []

        if savings_score >= 75:
            strengths.append(f"Strong savings rate of {sr:.1f}% exceeds typical healthy benchmarks.")
        else:
            improvements.append(f"Savings rate ({sr:.1f}%) is low; prioritize cutting discretionary spending.")

        if emergency_score >= 80:
            strengths.append(f"Liquid emergency reserves cover {months_covered:.1f} months of expenses.")
        else:
            improvements.append("Build an emergency fund reserve covering at least 3 months of expenses.")

        if budget_score >= 80:
            strengths.append("Budgets are closely monitored with minimal category overruns.")
        elif b_res.over_budget_count > 0:
            improvements.append(f"{b_res.over_budget_count} budget categories are currently exceeded.")

        if debt_score >= 85:
            strengths.append("Low debt-to-asset profile maintains financial flexibility.")

        return FinancialHealthResponse(
            overall_score=overall,
            rating=rating,
            dimensions=dimensions,
            strengths=strengths,
            areas_to_improve=improvements,
        )
