import enum
import uuid
from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class GoalType(str, enum.Enum):
    SAVINGS = "savings"
    DEBT_PAYOFF = "debt_payoff"
    INVESTMENT = "investment"
    PURCHASE = "purchase"
    EMERGENCY_FUND = "emergency_fund"
    RETIREMENT = "retirement"
    VACATION = "vacation"
    EDUCATION = "education"
    WEDDING = "wedding"
    OTHER = "other"


class GoalStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    ACHIEVED = "achieved"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class FinancialGoal(Base, TimestampMixin):
    __tablename__ = "financial_goals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    goal_type = Column(Enum(GoalType, native_enum=False, length=50), nullable=False, default=GoalType.SAVINGS)
    target_amount = Column(Numeric(18, 2), nullable=False)
    current_amount = Column(Numeric(18, 2), nullable=False, default=0.00)
    target_date = Column(Date, nullable=True)
    status = Column(Enum(GoalStatus, native_enum=False, length=20), nullable=False, default=GoalStatus.IN_PROGRESS)
    currency = Column(String(10), nullable=False, default="INR")
    color = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="goals")
