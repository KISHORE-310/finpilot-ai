import math
from datetime import date, timedelta
from decimal import Decimal
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.transaction import Transaction, TransactionType
from app.db.models.category import Category
from app.schemas.analytics import AnomalyItem, AnomalyResponse


class AnomalyDetectionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_anomalies(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> AnomalyResponse:
        # 1. Fetch 90 days of expense transactions for statistical baseline
        lookback_start = end_date - timedelta(days=90)
        stmt = (
            select(Transaction, Category.name.label("category_name"))
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= lookback_start,
                Transaction.transaction_date <= end_date,
            )
            .order_by(Transaction.transaction_date.desc())
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        if not rows:
            return AnomalyResponse(total_anomalies=0, anomalies=[])

        amounts = [float(r[0].amount) for r in rows]
        mean_amt = sum(amounts) / len(amounts)
        variance = sum((x - mean_amt) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance) if variance > 0 else 0.0

        # Outlier threshold: mean + 2.5 * std_dev (minimum $100)
        outlier_thresh = max(100.0, mean_amt + (2.5 * std_dev))

        anomalies: List[AnomalyItem] = []

        # Check transactions within current queried window
        for r in rows:
            tx = r[0]
            cat_name = r[1] or "General"
            if not (start_date <= tx.transaction_date <= end_date):
                continue

            amt_float = float(tx.amount)
            amt_dec = Decimal(str(tx.amount))

            if amt_float > outlier_thresh:
                dev_factor = round(Decimal(str(amt_float / max(1.0, mean_amt))), 1)
                anomalies.append(
                    AnomalyItem(
                        id=tx.id,
                        type="unusual_amount",
                        severity="warning" if amt_float < outlier_thresh * 1.5 else "critical",
                        title=f"Unusual expense of ${amt_dec:.2f}",
                        description=(
                            f"${amt_dec:.2f} spent at {tx.merchant_name or tx.description}. "
                            f"This is {dev_factor}x your historical average transaction (${mean_amt:.2f})."
                        ),
                        amount=amt_dec,
                        typical_amount=Decimal(str(round(mean_amt, 2))),
                        deviation_factor=dev_factor,
                        date=tx.transaction_date,
                        category_name=cat_name,
                        merchant_name=tx.merchant_name,
                    )
                )

        return AnomalyResponse(
            total_anomalies=len(anomalies),
            anomalies=anomalies[:10],
        )
