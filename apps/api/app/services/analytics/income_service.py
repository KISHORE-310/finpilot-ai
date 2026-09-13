import datetime
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.income import Income, IncomeSource
from app.db.models.transaction import Transaction, TransactionType
from app.schemas.analytics import IncomeSourceItem, IncomeAnalyticsResponse


class IncomeAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_income_analytics(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> IncomeAnalyticsResponse:
        # Query Income table
        inc_stmt = (
            select(Income)
            .where(
                Income.user_id == user_id,
                Income.date >= start_date,
                Income.date <= end_date,
            )
        )
        inc_res = await self.session.execute(inc_stmt)
        income_records = list(inc_res.scalars().all())

        # Also fallback/check Transaction table for income
        tx_stmt = (
            select(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.INCOME,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
        )
        tx_res = await self.session.execute(tx_stmt)
        tx_records = list(tx_res.scalars().all())

        source_sums: Dict[str, Decimal] = {}
        recurring_income = Decimal("0.00")
        non_recurring_income = Decimal("0.00")

        if income_records:
            for rec in income_records:
                amt = Decimal(str(rec.amount))
                src = rec.source.value if hasattr(rec.source, "value") else str(rec.source)
                source_sums[src] = source_sums.get(src, Decimal("0.00")) + amt
                if rec.is_recurring:
                    recurring_income += amt
                else:
                    non_recurring_income += amt
        else:
            # Fallback to transactions
            for tx in tx_records:
                amt = Decimal(str(tx.amount))
                src = "salary"  # generic primary
                source_sums[src] = source_sums.get(src, Decimal("0.00")) + amt
                non_recurring_income += amt

        total_income = sum(source_sums.values(), Decimal("0.00"))
        recurring_pct = Decimal("0.00")
        if total_income > Decimal("0.00"):
            recurring_pct = round((recurring_income / total_income) * Decimal("100.00"), 2)

        sources: List[IncomeSourceItem] = []
        for src, amt in sorted(source_sums.items(), key=lambda x: x[1], reverse=True):
            pct = Decimal("0.00")
            if total_income > Decimal("0.00"):
                pct = round((amt / total_income) * Decimal("100.00"), 2)
            sources.append(
                IncomeSourceItem(
                    source=src.capitalize(),
                    amount=amt,
                    percentage=pct,
                    is_recurring=(amt == recurring_income and recurring_income > 0),
                )
            )

        # Deterministic stability index (0 - 100)
        # Factors: recurring share (up to 50 pts), diversification of sources (up to 30 pts), baseline income (20 pts)
        stability_score = Decimal("0.00")
        if total_income > Decimal("0.00"):
            stability_score += min(Decimal("50.00"), (recurring_pct * Decimal("0.5")))
            source_count = len(sources)
            if source_count >= 3:
                stability_score += Decimal("30.00")
            elif source_count == 2:
                stability_score += Decimal("20.00")
            else:
                stability_score += Decimal("10.00")
            stability_score += Decimal("20.00")  # baseline active income

        stability_score = min(Decimal("100.00"), stability_score)
        if stability_score >= Decimal("75.00"):
            rating = "High Stability"
        elif stability_score >= Decimal("45.00"):
            rating = "Moderate Stability"
        else:
            rating = "Variable"

        return IncomeAnalyticsResponse(
            total_income=total_income,
            recurring_income=recurring_income,
            non_recurring_income=non_recurring_income,
            recurring_percentage=recurring_pct,
            stability_index=round(stability_score, 1),
            stability_rating=rating,
            sources=sources,
        )
