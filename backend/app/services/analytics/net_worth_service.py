import datetime
from datetime import date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.account import Account, AccountType
from app.db.models.investment import Investment
from app.db.models.net_worth_snapshot import NetWorthSnapshot
from app.schemas.analytics import (
    AssetLiabilityBreakdown,
    NetWorthSnapshotPoint,
    NetWorthAnalyticsResponse,
)


class NetWorthAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_current_breakdown(self, user_id: str) -> AssetLiabilityBreakdown:
        acc_stmt = select(Account).where(Account.user_id == user_id, Account.is_active == True)
        acc_res = await self.session.execute(acc_stmt)
        accounts = list(acc_res.scalars().all())

        cash = Decimal("0.00")
        bank_accounts = Decimal("0.00")
        investments_val = Decimal("0.00")
        other_assets = Decimal("0.00")

        credit_cards = Decimal("0.00")
        loans = Decimal("0.00")
        other_liabilities = Decimal("0.00")

        for acc in accounts:
            bal = Decimal(str(acc.current_balance))
            t = acc.account_type

            if t in [AccountType.CASH]:
                cash += bal
            elif t in [AccountType.BANK, AccountType.CHECKING, AccountType.SAVINGS]:
                bank_accounts += bal
            elif t == AccountType.INVESTMENT:
                investments_val += bal
            elif t == AccountType.CREDIT_CARD:
                credit_cards += bal
            elif t == AccountType.LOAN:
                loans += bal
            elif t == AccountType.OTHER:
                if bal >= Decimal("0.00"):
                    other_assets += bal
                else:
                    other_liabilities += abs(bal)

        # Also add direct investment positions if any
        inv_stmt = select(Investment).where(Investment.user_id == user_id)
        inv_res = await self.session.execute(inv_stmt)
        for inv in inv_res.scalars().all():
            investments_val += Decimal(str(inv.current_value))

        total_assets = cash + bank_accounts + investments_val + other_assets
        total_liabilities = credit_cards + loans + other_liabilities
        net_worth = total_assets - total_liabilities

        return AssetLiabilityBreakdown(
            cash=cash,
            bank_accounts=bank_accounts,
            investments=investments_val,
            other_assets=other_assets,
            total_assets=total_assets,
            credit_cards=credit_cards,
            loans=loans,
            other_liabilities=other_liabilities,
            total_liabilities=total_liabilities,
            net_worth=net_worth,
        )

    async def get_net_worth_analytics(self, user_id: str) -> NetWorthAnalyticsResponse:
        current = await self.get_current_breakdown(user_id)

        # Load snapshots
        snap_stmt = (
            select(NetWorthSnapshot)
            .where(NetWorthSnapshot.user_id == user_id)
            .order_by(NetWorthSnapshot.snapshot_date.asc())
        )
        snap_res = await self.session.execute(snap_stmt)
        snapshots = list(snap_res.scalars().all())

        history: List[NetWorthSnapshotPoint] = []
        for s in snapshots:
            history.append(
                NetWorthSnapshotPoint(
                    snapshot_date=s.snapshot_date,
                    total_assets=Decimal(str(s.total_assets)),
                    total_liabilities=Decimal(str(s.total_liabilities)),
                    net_worth=Decimal(str(s.net_worth)),
                )
            )

        # Include current point if today not yet saved
        today = date.today()
        if not any(h.snapshot_date == today for h in history):
            history.append(
                NetWorthSnapshotPoint(
                    snapshot_date=today,
                    total_assets=current.total_assets,
                    total_liabilities=current.total_liabilities,
                    net_worth=current.net_worth,
                )
            )

        mom_change = Decimal("0.00")
        mom_pct = Decimal("0.00")
        if len(history) >= 2:
            prev = history[-2].net_worth
            mom_change = current.net_worth - prev
            if prev != Decimal("0.00"):
                mom_pct = round((mom_change / abs(prev)) * Decimal("100.00"), 2)

        return NetWorthAnalyticsResponse(
            current=current,
            history=history,
            mom_change=mom_change,
            mom_change_percent=mom_pct,
        )

    async def record_snapshot(self, user_id: str, snapshot_date: Optional[date] = None) -> NetWorthSnapshotPoint:
        if not snapshot_date:
            snapshot_date = date.today()

        current = await self.get_current_breakdown(user_id)

        # Check existing for date
        existing_stmt = select(NetWorthSnapshot).where(
            NetWorthSnapshot.user_id == user_id,
            NetWorthSnapshot.snapshot_date == snapshot_date,
        )
        res = await self.session.execute(existing_stmt)
        existing = res.scalar_one_or_none()

        if existing:
            existing.total_assets = current.total_assets
            existing.total_liabilities = current.total_liabilities
            existing.net_worth = current.net_worth
        else:
            existing = NetWorthSnapshot(
                user_id=user_id,
                snapshot_date=snapshot_date,
                total_assets=current.total_assets,
                total_liabilities=current.total_liabilities,
                net_worth=current.net_worth,
            )
            self.session.add(existing)

        await self.session.commit()
        await self.session.refresh(existing)

        return NetWorthSnapshotPoint(
            snapshot_date=existing.snapshot_date,
            total_assets=Decimal(str(existing.total_assets)),
            total_liabilities=Decimal(str(existing.total_liabilities)),
            net_worth=Decimal(str(existing.net_worth)),
        )
