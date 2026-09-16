import calendar
import datetime
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.transaction import Transaction, TransactionType
from app.schemas.analytics import CashFlowPoint, CashFlowResponse


class CashFlowAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_cash_flow(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        granularity: str = "monthly",
    ) -> CashFlowResponse:
        stmt = (
            select(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
            .order_by(Transaction.transaction_date.asc())
        )
        result = await self.session.execute(stmt)
        transactions = list(result.scalars().all())

        total_income = Decimal("0.00")
        total_expenses = Decimal("0.00")

        # Grouping container
        buckets: Dict[str, Dict[str, Decimal]] = {}

        # Pre-populate buckets based on granularity
        if granularity == "daily":
            curr = start_date
            while curr <= end_date:
                buckets[curr.isoformat()] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}
                curr += timedelta(days=1)
        elif granularity == "weekly":
            curr = start_date
            while curr <= end_date:
                year, week, _ = curr.isocalendar()
                bucket_key = f"{year}-W{week:02d}"
                if bucket_key not in buckets:
                    buckets[bucket_key] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}
                curr += timedelta(days=1)
        else:  # monthly
            curr = date(start_date.year, start_date.month, 1)
            end_month = date(end_date.year, end_date.month, 1)
            while curr <= end_month:
                bucket_key = curr.strftime("%Y-%m")
                buckets[bucket_key] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}
                # next month
                if curr.month == 12:
                    curr = date(curr.year + 1, 1, 1)
                else:
                    curr = date(curr.year, curr.month + 1, 1)

        for tx in transactions:
            amt = Decimal(str(tx.amount))
            tx_date = tx.transaction_date

            if tx.transaction_type == TransactionType.INCOME:
                total_income += amt
            elif tx.transaction_type == TransactionType.EXPENSE:
                total_expenses += amt

            # Bucket key
            if granularity == "daily":
                k = tx_date.isoformat()
            elif granularity == "weekly":
                y, w, _ = tx_date.isocalendar()
                k = f"{y}-W{w:02d}"
            else:
                k = tx_date.strftime("%Y-%m")

            if k not in buckets:
                buckets[k] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}

            if tx.transaction_type == TransactionType.INCOME:
                buckets[k]["income"] += amt
            elif tx.transaction_type == TransactionType.EXPENSE:
                buckets[k]["expense"] += amt

        # Format points
        points: List[CashFlowPoint] = []
        for k in sorted(buckets.keys()):
            inc = buckets[k]["income"]
            exp = buckets[k]["expense"]
            net = inc - exp
            sr = Decimal("0.00")
            if inc > Decimal("0.00"):
                sr = round((net / inc) * Decimal("100.00"), 2)
            points.append(
                CashFlowPoint(
                    date=k,
                    income=inc,
                    expenses=exp,
                    net=net,
                    savings_rate=sr,
                )
            )

        net_cash_flow = total_income - total_expenses
        savings_rate = Decimal("0.00")
        if total_income > Decimal("0.00"):
            savings_rate = round((net_cash_flow / total_income) * Decimal("100.00"), 2)

        # Historical savings stats across all monthly points
        best_month: Optional[str] = None
        worst_month: Optional[str] = None
        highest_rate = Decimal("-1000.00")
        lowest_rate = Decimal("1000.00")
        rates_sum = Decimal("0.00")
        valid_months_count = 0

        for pt in points:
            if pt.income > Decimal("0.00"):
                valid_months_count += 1
                rates_sum += pt.savings_rate
                if pt.savings_rate > highest_rate:
                    highest_rate = pt.savings_rate
                    best_month = pt.date
                if pt.savings_rate < lowest_rate:
                    lowest_rate = pt.savings_rate
                    worst_month = pt.date

        hist_avg = Decimal("0.00")
        if valid_months_count > 0:
            hist_avg = round(rates_sum / Decimal(str(valid_months_count)), 2)

        return CashFlowResponse(
            start_date=start_date,
            end_date=end_date,
            granularity=granularity,
            total_income=total_income,
            total_expenses=total_expenses,
            net_cash_flow=net_cash_flow,
            savings_rate=savings_rate,
            historical_avg_savings_rate=hist_avg,
            best_month=best_month,
            worst_month=worst_month,
            points=points,
        )
