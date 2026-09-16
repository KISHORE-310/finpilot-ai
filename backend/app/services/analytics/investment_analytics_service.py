from decimal import Decimal
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.investment import Investment, AssetType
from app.schemas.analytics import (
    AssetAllocationItem,
    InvestmentAnalyticsResponse,
)


class InvestmentAnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_investment_analytics(self, user_id: str) -> InvestmentAnalyticsResponse:
        stmt = (
            select(Investment)
            .where(Investment.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        investments = list(result.scalars().all())

        total_invested = Decimal("0.00")
        current_value = Decimal("0.00")
        allocation_sums: Dict[str, Decimal] = {}

        for inv in investments:
            qty = Decimal(str(inv.quantity))
            avg_cost = Decimal(str(inv.average_cost))
            c_val = Decimal(str(inv.current_value))

            cost_basis = qty * avg_cost
            total_invested += cost_basis
            current_value += c_val

            asset_name = inv.asset_type.value if hasattr(inv.asset_type, "value") else str(inv.asset_type)
            allocation_sums[asset_name] = allocation_sums.get(asset_name, Decimal("0.00")) + c_val

        total_pnl = current_value - total_invested
        pnl_pct = Decimal("0.00")
        if total_invested > Decimal("0.00"):
            pnl_pct = round((total_pnl / total_invested) * Decimal("100.00"), 2)

        allocations: List[AssetAllocationItem] = []
        for asset, val in sorted(allocation_sums.items(), key=lambda x: x[1], reverse=True):
            pct = Decimal("0.00")
            if current_value > Decimal("0.00"):
                pct = round((val / current_value) * Decimal("100.00"), 2)
            allocations.append(
                AssetAllocationItem(
                    asset_type=asset.replace("_", " ").title(),
                    current_value=val,
                    percentage=pct,
                )
            )

        return InvestmentAnalyticsResponse(
            total_invested=total_invested,
            current_value=current_value,
            total_pnl=total_pnl,
            pnl_percentage=pnl_pct,
            positions_count=len(investments),
            allocations=allocations,
            disclaimer="Investment valuations reflect recorded user balances and do not include real-time market feeds.",
        )
