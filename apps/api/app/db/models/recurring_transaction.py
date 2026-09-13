import enum
import uuid
from datetime import date
from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
from app.db.models.transaction import TransactionType


class Frequency(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class RecurringTransaction(Base, TimestampMixin):
    __tablename__ = "recurring_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    
    name = Column(String(255), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    transaction_type = Column(Enum(TransactionType, native_enum=False, length=50), nullable=False, default=TransactionType.EXPENSE)
    frequency = Column(Enum(Frequency, native_enum=False, length=50), nullable=False, default=Frequency.MONTHLY)
    next_occurrence = Column(Date, nullable=False, default=date.today)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="recurring_transactions")
