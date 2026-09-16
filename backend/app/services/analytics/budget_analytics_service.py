import calendar
import datetime
from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.budget import Budget, BudgetPeriod
from app.db.models.category import Category
from app.db.models.transaction import Transaction, TransactionType
from app.schemas.analytics import (
    BudgetAnalyticsItem,
    BudgetAnalyticsResponse,
    BudgetStatusEnum,
)


class BudgetAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_budget_analytics(self, user_id: str) -> BudgetAnalyticsResponse:
        today = date.today()
        # Query user budgets
        b_stmt = (
            select(Budget, Category.name.label("category_name"))
            .outerjoin(Category, Budget.category_id == Category.id)
            .where(Budget.user_id == user_id)
        )
        b_res = await self.session.execute(b_stmt)
        rows = b_res.all()

        total_budget = Decimal("0.00")
        total_spent = Decimal("0.00")
        on_track = 0
        warning = 0
        over_budget = 0
        budget_items: List[BudgetAnalyticsItem] = []

        for r in rows:
            b = r[0]
            cat_name = r[1] or "All Categories"
            allocated = Decimal(str(b.amount))
            total_budget += allocated

            # Compute period range for this budget
            # default monthly
            start_d = date(today.year, today.month, 1)
            _, last_d_num = calendar.monthrange(today.year, today.month)
            end_d = date(today.year, today.month, last_d_num)
            days_in_period = last_d_num
            days_elapsed = max(1, today.day)
            days_remaining = max(0, days_in_period - days_elapsed)

            # Query actual spent in category for this month
            spend_stmt = (
                select(func.sum(Transaction.amount))
                .where(
                    Transaction.user_id == user_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.transaction_date >= start_d,
                    Transaction.transaction_date <= end_d,
                )
            )
            if b.category_id:
                spend_stmt = spend_stmt.where(Transaction.category_id == b.category_id)

            spend_res = await self.session.execute(spend_stmt)
            spent = Decimal(str(spend_res.scalar() or 0.00))
            total_spent += spent

            remaining = allocated - spent
            pct_used = Decimal("0.00")
            if allocated > Decimal("0.00"):
                pct_used = round((spent / allocated) * Decimal("100.00"), 2)

            # Deterministic projection: (spent / days_elapsed) * days_in_period
            projected = Decimal("0.00")
            if days_elapsed > 0:
                projected = round((spent / Decimal(str(days_elapsed))) * Decimal(str(days_in_period)), 2)

            # Determine deterministic status:
            # ON_TRACK: <= 80% or projected <= budget
            # WARNING: 80% <= pct < 100% or projected > budget
            # OVER_BUDGET: pct >= 100%
            if pct_used >= Decimal("100.00"):
                status = BudgetStatusEnum.OVER_BUDGET
                over_budget += 1
            elif pct_used >= Decimal("80.00") or (projected > allocated and days_elapsed > 5):
                status = BudgetStatusEnum.WARNING
                warning += 1
            else:
                status = BudgetStatusEnum.ON_TRACK
                on_track += 1

            budget_items.append(
                BudgetAnalyticsItem(
                    id=b.id,
                    name=b.name,
                    category_name=cat_name,
                    allocated_amount=allocated,
                    actual_spent=spent,
                    remaining_amount=remaining,
                    percentage_used=pct_used,
                    days_in_period=days_in_period,
                    days_elapsed=days_elapsed,
                    days_remaining=days_remaining,
                    projected_spend=projected,
                    status=status,
                )
            )

        total_rem = total_budget - total_spent
        overall_util = Decimal("0.00")
        if total_budget > Decimal("0.00"):
            overall_util = round((total_spent / total_budget) * Decimal("100.00"), 2)

        return BudgetAnalyticsResponse(
            total_budget=total_budget,
            total_spent=total_spent,
            total_remaining=total_rem,
            overall_utilization=overall_util,
            on_track_count=on_track,
            warning_count=warning,
            over_budget_count=over_budget,
            budgets=budget_items,
        )
