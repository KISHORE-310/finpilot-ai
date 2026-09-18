import enum
import uuid
from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class AccountType(str, enum.Enum):
    BANK = "bank"
    CHECKING = "checking"
    SAVINGS = "savings"
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    LOAN = "loan"
    INVESTMENT = "investment"
    OTHER = "other"


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    account_type = Column(Enum(AccountType, native_enum=False, length=50), nullable=False, default=AccountType.BANK)
    institution = Column(String(255), nullable=True)
    currency = Column(String(10), nullable=False, default="INR")
    current_balance = Column(Numeric(18, 2), nullable=False, default=0.00)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    investments = relationship("Investment", back_populates="account", cascade="all, delete-orphan")
    income_records = relationship("Income", back_populates="account", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="account", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_accounts_user_active", "user_id", "is_active"),
    )
