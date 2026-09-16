import enum
import uuid
from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class AlertType(str, enum.Enum):
    BUDGET_EXCEEDED = "budget_exceeded"
    BUDGET_WARNING = "budget_warning"
    UNUSUAL_TRANSACTION = "unusual_transaction"
    GOAL_BEHIND = "goal_behind"
    LOW_SAVINGS_RATE = "low_savings_rate"
    RECURRING_UPCOMING = "recurring_upcoming"
    NEGATIVE_CASHFLOW = "negative_cashflow"
    LARGE_EXPENSE = "large_expense"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class FinancialAlert(Base, TimestampMixin):
    __tablename__ = "financial_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    alert_type = Column(Enum(AlertType, native_enum=False, length=50), nullable=False)
    severity = Column(Enum(AlertSeverity, native_enum=False, length=20), nullable=False, default=AlertSeverity.INFO)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    context_data = Column(Text, nullable=True)  # JSON-encoded metadata string

    user = relationship("User", back_populates="financial_alerts")

    __table_args__ = (
        Index("ix_financial_alerts_user_read", "user_id", "is_read"),
    )
