import datetime
from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.goal import FinancialGoal, GoalStatus
from app.schemas.analytics import (
    GoalAnalyticsItem,
    GoalAnalyticsResponse,
    GoalStatusEnum,
)


class GoalAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_goal_analytics(self, user_id: str) -> GoalAnalyticsResponse:
        today = date.today()
        stmt = (
            select(FinancialGoal)
            .where(
                FinancialGoal.user_id == user_id,
                FinancialGoal.is_active == True,
            )
        )
        result = await self.session.execute(stmt)
        goals = list(result.scalars().all())

        total_target = Decimal("0.00")
        total_saved = Decimal("0.00")
        completed_count = 0
        in_progress_count = 0
        goal_items: List[GoalAnalyticsItem] = []

        for g in goals:
            target = Decimal(str(g.target_amount))
            current = Decimal(str(g.current_amount))
            total_target += target
            total_saved += current

            remaining = max(Decimal("0.00"), target - current)
            pct = Decimal("0.00")
            if target > Decimal("0.00"):
                pct = round(min(Decimal("100.00"), (current / target) * Decimal("100.00")), 2)

            months_remaining = None
            req_monthly = Decimal("0.00")
            cur_pace = Decimal("0.00")
            gap = Decimal("0.00")

            if g.target_date:
                days_left = (g.target_date - today).days
                if days_left > 0:
                    months_remaining = max(1, int(days_left / 30.4))
                    req_monthly = round(remaining / Decimal(str(months_remaining)), 2)
                else:
                    months_remaining = 0

            # Deterministic status classification
            if current >= target or g.status in [GoalStatus.ACHIEVED, GoalStatus.COMPLETED]:
                status = GoalStatusEnum.COMPLETED
                completed_count += 1
            elif g.target_date and g.target_date < today and remaining > Decimal("0.00"):
                status = GoalStatusEnum.BEHIND
                in_progress_count += 1
            elif pct >= Decimal("50.00") or (months_remaining and months_remaining >= 3):
                status = GoalStatusEnum.ON_TRACK
                in_progress_count += 1
            elif pct >= Decimal("25.00"):
                status = GoalStatusEnum.AT_RISK
                in_progress_count += 1
            else:
                status = GoalStatusEnum.BEHIND
                in_progress_count += 1

            goal_items.append(
                GoalAnalyticsItem(
                    id=g.id,
                    name=g.name,
                    target_amount=target,
                    current_amount=current,
                    remaining_amount=remaining,
                    completion_percentage=pct,
                    target_date=g.target_date,
                    months_remaining=months_remaining,
                    required_monthly_contribution=req_monthly,
                    current_monthly_pace=cur_pace,
                    contribution_gap=gap,
                    status=status,
                )
            )

        overall_progress = Decimal("0.00")
        if total_target > Decimal("0.00"):
            overall_progress = round((total_saved / total_target) * Decimal("100.00"), 2)

        return GoalAnalyticsResponse(
            total_target=total_target,
            total_saved=total_saved,
            overall_progress=overall_progress,
            completed_count=completed_count,
            in_progress_count=in_progress_count,
            goals=goal_items,
        )
