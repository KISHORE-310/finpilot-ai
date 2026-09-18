import enum
import uuid
from sqlalchemy import Column, Date, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class BudgetPeriod(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    period = Column(Enum(BudgetPeriod, native_enum=False, length=20), nullable=False, default=BudgetPeriod.MONTHLY)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    currency = Column(String(10), nullable=False, default="INR")

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
