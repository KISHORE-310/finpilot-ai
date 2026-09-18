import datetime
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models.income import Income, IncomeSource
from app.db.models.transaction import Transaction, TransactionType
from app.schemas.analytics import IncomeSourceItem, IncomeAnalyticsResponse

# Sources considered recurring based on the income category/description.
_RECURRING_SOURCE_KEYWORDS = (
    "salary", "bonus", "dividend", "interest", "pension", "return", "retainer",
)


class IncomeAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_income_analytics(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> IncomeAnalyticsResponse:
        # Single source of truth: the cleared transaction ledger. The Income
        # table only configures source definitions, so counting both would
        # double-report the same money.
        tx_stmt = (
            select(Transaction)
            .options(selectinload(Transaction.category))
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

        for tx in tx_records:
            amt = Decimal(str(tx.amount))
            category = tx.category.name if tx.category and tx.category.name else None
            src = str(category).strip() if category and str(category).strip() else "Other"
            normalized = src.lower()
            is_recurring = any(k in normalized for k in _RECURRING_SOURCE_KEYWORDS)
            source_sums[src] = source_sums.get(src, Decimal("0.00")) + amt
            if is_recurring:
                recurring_income += amt
            else:
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
                    source=src,
                    amount=amt,
                    percentage=pct,
                    is_recurring=any(k in src.lower() for k in _RECURRING_SOURCE_KEYWORDS),
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
