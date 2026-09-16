import datetime
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.account import Account, AccountType
from app.db.models.category import Category
from app.db.models.transaction import Transaction, TransactionType
from app.db.models.goal import FinancialGoal, GoalStatus
from app.schemas.account import NetWorthSummary
from app.schemas.goal import GoalResponse
from app.schemas.transaction import TransactionResponse
from app.schemas.dashboard import DashboardOverview


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_overview(self, user_id: str, days: int = 30) -> DashboardOverview:
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=days)

        # 1. Net worth
        acc_stmt = select(Account).where(Account.user_id == user_id, Account.is_active == True)
        acc_result = await self.session.execute(acc_stmt)
        accounts = list(acc_result.scalars().all())

        total_assets = Decimal("0.00")
        total_liabilities = Decimal("0.00")
        for acc in accounts:
            bal = Decimal(str(acc.current_balance))
            if acc.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
                total_liabilities += bal
            else:
                total_assets += bal

        net_worth = total_assets - total_liabilities
        net_worth_summary = NetWorthSummary(
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            net_worth=net_worth,
            currency="USD",
            account_count=len(accounts),
        )

        # 2. Period income and expenses
        tx_stmt = select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        tx_result = await self.session.execute(tx_stmt)
        period_txs = list(tx_result.scalars().all())

        total_income = Decimal("0.00")
        total_expenses = Decimal("0.00")
        for tx in period_txs:
            amt = Decimal(str(tx.amount))
            if tx.transaction_type == TransactionType.INCOME:
                total_income += amt
            elif tx.transaction_type == TransactionType.EXPENSE:
                total_expenses += amt

        net_savings = total_income - total_expenses
        savings_rate = Decimal("0.00")
        if total_income > Decimal("0.00"):
            savings_rate = round((net_savings / total_income) * Decimal("100.00"), 2)

        # 3. Cashflow Trend (Group by day)
        daily_map: Dict[str, Dict[str, Decimal]] = {}
        curr = start_date
        while curr <= end_date:
            daily_map[curr.isoformat()] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}
            curr += datetime.timedelta(days=1)

        for tx in period_txs:
            d_str = tx.transaction_date.isoformat()
            if d_str in daily_map:
                amt = Decimal(str(tx.amount))
                if tx.transaction_type == TransactionType.INCOME:
                    daily_map[d_str]["income"] += amt
                elif tx.transaction_type == TransactionType.EXPENSE:
                    daily_map[d_str]["expense"] += amt

        cashflow_trend = [
            {
                "date": d,
                "income": str(v["income"]),
                "expense": str(v["expense"]),
                "net": str(v["income"] - v["expense"]),
            }
            for d, v in sorted(daily_map.items())
        ]

        # 4. Category spend breakdown
        cat_stmt = (
            select(
                Transaction.category_id,
                Category.name.label("category_name"),
                func.sum(Transaction.amount).label("total_spent"),
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
        cat_result = await self.session.execute(cat_stmt)
        cat_rows = cat_result.all()

        category_spend = []
        for row in cat_rows:
            c_spent = Decimal(str(row.total_spent or 0))
            pct = round((c_spent / total_expenses * Decimal("100.00")), 2) if total_expenses > Decimal("0.00") else Decimal("0.00")
            category_spend.append({
                "category_id": row.category_id,
                "category_name": row.category_name or "Uncategorized",
                "total_spent": str(c_spent),
                "percentage": str(pct),
            })

        # 5. Active goals
        goals_stmt = (
            select(FinancialGoal)
            .where(FinancialGoal.user_id == user_id, FinancialGoal.is_active == True)
            .limit(5)
        )
        goals_result = await self.session.execute(goals_stmt)
        raw_goals = list(goals_result.scalars().all())
        active_goals = [GoalResponse.model_validate(g) for g in raw_goals]

        # 6. Recent transactions
        recent_stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
            .limit(10)
        )
        recent_result = await self.session.execute(recent_stmt)
        raw_recent = list(recent_result.scalars().all())
        recent_txs = [TransactionResponse.model_validate(t) for t in raw_recent]

        return DashboardOverview(
            net_worth=net_worth_summary,
            total_income_period=str(total_income),
            total_expenses_period=str(total_expenses),
            net_savings_period=str(net_savings),
            savings_rate_percent=str(savings_rate),
            period_days=days,
            cashflow_trend=cashflow_trend,
            category_spend=category_spend,
            active_goals=active_goals,
            recent_transactions=recent_txs,
        )
