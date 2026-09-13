import datetime
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.transaction import Transaction, TransactionType
from app.db.models.category import Category
from app.db.models.account import Account
from app.db.models.recurring_transaction import RecurringTransaction, Frequency
from app.schemas.analytics import (
    CategorySpendItem,
    SpendingBreakdownResponse,
    MerchantSpendItem,
    MerchantSpendingResponse,
    LargestTransactionItem,
    LargestTransactionsResponse,
    RecurringExpenseItem,
    RecurringAnalysisResponse,
)


class SpendingAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_category_spending(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        prev_start_date: date,
        prev_end_date: date,
    ) -> SpendingBreakdownResponse:
        # 1. Current period transactions
        stmt = (
            select(
                Transaction.category_id,
                Category.name.label("category_name"),
                func.sum(Transaction.amount).label("total_spent"),
                func.count(Transaction.id).label("tx_count"),
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
            .group_by(Transaction.category_id, Category.name)
            .order_by(func.sum(Transaction.amount).desc())
        )
        result = await self.session.execute(stmt)
        current_rows = result.all()

        # 2. Previous period transactions for comparison
        prev_stmt = (
            select(
                Transaction.category_id,
                func.sum(Transaction.amount).label("total_spent"),
            )
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= prev_start_date,
                Transaction.transaction_date <= prev_end_date,
            )
            .group_by(Transaction.category_id)
        )
        prev_result = await self.session.execute(prev_stmt)
        prev_map: Dict[Optional[str], Decimal] = {
            row.category_id: Decimal(str(row.total_spent or 0)) for row in prev_result.all()
        }

        total_spending = sum(Decimal(str(r.total_spent or 0)) for r in current_rows)
        prev_total_spending = sum(prev_map.values(), Decimal("0.00"))

        total_change_percent = Decimal("0.00")
        if prev_total_spending > Decimal("0.00"):
            total_change_percent = round(
                ((total_spending - prev_total_spending) / prev_total_spending) * Decimal("100.00"), 2
            )

        days_count = max(1, (end_date - start_date).days + 1)
        avg_daily = round(total_spending / Decimal(str(days_count)), 2)
        avg_monthly = round(avg_daily * Decimal("30.41"), 2)

        categories: List[CategorySpendItem] = []
        for row in current_rows:
            amt = Decimal(str(row.total_spent or 0))
            pct = Decimal("0.00")
            if total_spending > Decimal("0.00"):
                pct = round((amt / total_spending) * Decimal("100.00"), 2)

            prev_amt = prev_map.get(row.category_id, Decimal("0.00"))
            abs_change = amt - prev_amt
            pct_change = Decimal("0.00")
            if prev_amt > Decimal("0.00"):
                pct_change = round((abs_change / prev_amt) * Decimal("100.00"), 2)

            categories.append(
                CategorySpendItem(
                    category_id=row.category_id,
                    category_name=row.category_name or "Uncategorized",
                    amount=amt,
                    percentage=pct,
                    prev_amount=prev_amt,
                    absolute_change=abs_change,
                    percentage_change=pct_change,
                    transaction_count=row.tx_count,
                )
            )

        return SpendingBreakdownResponse(
            start_date=start_date,
            end_date=end_date,
            total_spending=total_spending,
            prev_total_spending=prev_total_spending,
            total_change_percent=total_change_percent,
            average_daily_spend=avg_daily,
            average_monthly_spend=avg_monthly,
            categories=categories,
        )

    async def get_merchant_spending(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        limit: int = 10,
    ) -> MerchantSpendingResponse:
        stmt = (
            select(
                Transaction.merchant_name,
                func.sum(Transaction.amount).label("total_spent"),
                func.count(Transaction.id).label("tx_count"),
            )
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.merchant_name.isnot(None),
                Transaction.merchant_name != "",
            )
            .group_by(Transaction.merchant_name)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        merchants: List[MerchantSpendItem] = []
        total_tracked = Decimal("0.00")

        for r in rows:
            amt = Decimal(str(r.total_spent or 0))
            cnt = r.tx_count
            avg = round(amt / Decimal(str(cnt)), 2) if cnt > 0 else Decimal("0.00")
            total_tracked += amt
            merchants.append(
                MerchantSpendItem(
                    merchant_name=r.merchant_name,
                    total_spent=amt,
                    transaction_count=cnt,
                    average_transaction=avg,
                )
            )

        return MerchantSpendingResponse(
            total_tracked_spend=total_tracked,
            merchants=merchants,
        )

    async def get_largest_transactions(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        limit: int = 10,
    ) -> LargestTransactionsResponse:
        stmt = (
            select(
                Transaction,
                Category.name.label("category_name"),
                Account.name.label("account_name"),
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .outerjoin(Account, Transaction.account_id == Account.id)
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
            .order_by(Transaction.amount.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        txs: List[LargestTransactionItem] = []
        for r in rows:
            tx = r[0]
            cat_name = r[1] or "Uncategorized"
            acc_name = r[2] or "Account"
            txs.append(
                LargestTransactionItem(
                    id=tx.id,
                    merchant_name=tx.merchant_name,
                    description=tx.description,
                    amount=Decimal(str(tx.amount)),
                    transaction_date=tx.transaction_date,
                    category_name=cat_name,
                    account_name=acc_name,
                )
            )

        return LargestTransactionsResponse(transactions=txs)

    async def get_recurring_analysis(self, user_id: str) -> RecurringAnalysisResponse:
        stmt = (
            select(RecurringTransaction, Account.name.label("account_name"))
            .outerjoin(Account, RecurringTransaction.account_id == Account.id)
            .where(
                RecurringTransaction.user_id == user_id,
                RecurringTransaction.is_active == True,
                RecurringTransaction.transaction_type == TransactionType.EXPENSE,
            )
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        items: List[RecurringExpenseItem] = []
        upcoming: List[RecurringExpenseItem] = []
        monthly_total = Decimal("0.00")
        annual_total = Decimal("0.00")
        today = date.today()
        thirty_days_later = today + timedelta(days=30)

        for r in rows:
            rec = r[0]
            acc_name = r[1] or "Account"
            amt = Decimal(str(rec.amount))
            freq = rec.frequency

            # Convert to annual and monthly
            if freq == Frequency.DAILY:
                annual = amt * Decimal("365.00")
                monthly = round(annual / Decimal("12.00"), 2)
            elif freq == Frequency.WEEKLY:
                annual = amt * Decimal("52.00")
                monthly = round(annual / Decimal("12.00"), 2)
            elif freq == Frequency.BIWEEKLY:
                annual = amt * Decimal("26.00")
                monthly = round(annual / Decimal("12.00"), 2)
            elif freq == Frequency.MONTHLY:
                monthly = amt
                annual = amt * Decimal("12.00")
            elif freq == Frequency.QUARTERLY:
                annual = amt * Decimal("4.00")
                monthly = round(annual / Decimal("12.00"), 2)
            elif freq == Frequency.YEARLY:
                annual = amt
                monthly = round(annual / Decimal("12.00"), 2)
            else:
                monthly = amt
                annual = amt * Decimal("12.00")

            monthly_total += monthly
            annual_total += annual

            item = RecurringExpenseItem(
                id=rec.id,
                name=rec.name,
                amount=amt,
                frequency=freq.value if hasattr(freq, "value") else str(freq),
                annualized_amount=round(annual, 2),
                monthly_equivalent=round(monthly, 2),
                next_occurrence=rec.next_occurrence,
                account_name=acc_name,
            )
            items.append(item)

            if today <= rec.next_occurrence <= thirty_days_later:
                upcoming.append(item)

        return RecurringAnalysisResponse(
            monthly_total=round(monthly_total, 2),
            annual_total=round(annual_total, 2),
            active_count=len(items),
            items=items,
            upcoming_30_days=upcoming,
        )
