from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.financial_alert import FinancialAlert, AlertType, AlertSeverity
from app.services.analytics.budget_analytics_service import BudgetAnalyticsService
from app.services.analytics.anomaly_service import AnomalyDetectionService
from app.services.analytics.spending_service import SpendingAnalyticsService
from app.schemas.alert import AlertResponse, AlertSummary


class AlertService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.budget_service = BudgetAnalyticsService(session)
        self.anomaly_service = AnomalyDetectionService(session)
        self.spending_service = SpendingAnalyticsService(session)

    async def get_user_alerts(self, user_id: str, unread_only: bool = False, limit: int = 50) -> List[AlertResponse]:
        stmt = select(FinancialAlert).where(FinancialAlert.user_id == user_id)
        if unread_only:
            stmt = stmt.where(FinancialAlert.is_read == False)
        stmt = stmt.order_by(desc(FinancialAlert.created_at)).limit(limit)
        res = await self.session.execute(stmt)
        return [AlertResponse.model_validate(a) for a in res.scalars().all()]

    async def get_summary(self, user_id: str) -> AlertSummary:
        stmt = select(FinancialAlert).where(FinancialAlert.user_id == user_id)
        res = await self.session.execute(stmt)
        all_alerts = list(res.scalars().all())

        unread = sum(1 for a in all_alerts if not a.is_read)
        critical = sum(1 for a in all_alerts if a.severity == AlertSeverity.CRITICAL and not a.is_read)

        return AlertSummary(
            total_count=len(all_alerts),
            unread_count=unread,
            critical_count=critical,
        )

    async def mark_read(self, user_id: str, alert_id: str) -> Optional[AlertResponse]:
        stmt = select(FinancialAlert).where(
            FinancialAlert.id == alert_id,
            FinancialAlert.user_id == user_id,
        )
        res = await self.session.execute(stmt)
        alert = res.scalar_one_or_none()
        if alert:
            alert.is_read = True
            await self.session.commit()
            await self.session.refresh(alert)
            return AlertResponse.model_validate(alert)
        return None

    async def evaluate_and_generate_alerts(self, user_id: str) -> List[AlertResponse]:
        today = date.today()
        start_30 = today - timedelta(days=30)
        created_alerts: List[FinancialAlert] = []

        # Idempotency guard: skip alerts identical to ones created within the last 24h
        # so repeated evaluations do not duplicate budget/anomaly/recurring alerts.
        cutoff = today - timedelta(days=1)
        existing_stmt = select(FinancialAlert).where(
            FinancialAlert.user_id == user_id,
            FinancialAlert.created_at >= cutoff,
        )
        existing_res = await self.session.execute(existing_stmt)
        existing_keys = {(a.alert_type, a.title) for a in existing_res.scalars().all()}

        def _is_duplicate(alert_type: AlertType, title: str) -> bool:
            return (alert_type, title) in existing_keys

        # 1. Budget checks
        b_res = await self.budget_service.get_budget_analytics(user_id)
        for b in b_res.budgets:
            if b.status.value == "OVER_BUDGET":
                if _is_duplicate(AlertType.BUDGET_EXCEEDED, f"Budget Exceeded: {b.name}"):
                    continue
                al = FinancialAlert(
                    user_id=user_id,
                    alert_type=AlertType.BUDGET_EXCEEDED,
                    severity=AlertSeverity.CRITICAL,
                    title=f"Budget Exceeded: {b.name}",
                    message=f"You have spent ₹{b.actual_spent:.2f} of your ₹{b.allocated_amount:.2f} budget ({b.percentage_used:.1f}% used).",
                )
                self.session.add(al)
                created_alerts.append(al)
                existing_keys.add((al.alert_type, al.title))
            elif b.status.value == "WARNING":
                if _is_duplicate(AlertType.BUDGET_WARNING, f"Budget Warning: {b.name}"):
                    continue
                al = FinancialAlert(
                    user_id=user_id,
                    alert_type=AlertType.BUDGET_WARNING,
                    severity=AlertSeverity.WARNING,
                    title=f"Budget Warning: {b.name}",
                    message=f"You have reached {b.percentage_used:.1f}% of your budget with {b.days_remaining} days remaining.",
                )
                self.session.add(al)
                created_alerts.append(al)
                existing_keys.add((al.alert_type, al.title))

        # 2. Anomaly checks
        anom_res = await self.anomaly_service.get_anomalies(user_id, start_30, today)
        for anom in anom_res.anomalies:
            if _is_duplicate(AlertType.UNUSUAL_TRANSACTION, anom.title):
                continue
            al = FinancialAlert(
                user_id=user_id,
                alert_type=AlertType.UNUSUAL_TRANSACTION,
                severity=AlertSeverity.WARNING,
                title=anom.title,
                message=anom.description,
            )
            self.session.add(al)
            created_alerts.append(al)
            existing_keys.add((al.alert_type, al.title))

        # 3. Recurring upcoming
        rec_res = await self.spending_service.get_recurring_analysis(user_id)
        for up in rec_res.upcoming_30_days[:3]:
            title = f"Upcoming Recurring Bill: {up.name}"
            if _is_duplicate(AlertType.RECURRING_UPCOMING, title):
                continue
            al = FinancialAlert(
                user_id=user_id,
                alert_type=AlertType.RECURRING_UPCOMING,
                severity=AlertSeverity.INFO,
                title=title,
                message=f"₹{up.amount:.2f} due on {up.next_occurrence.isoformat()}.",
            )
            self.session.add(al)
            created_alerts.append(al)
            existing_keys.add((al.alert_type, al.title))

        await self.session.commit()
        return [AlertResponse.model_validate(a) for a in created_alerts]
