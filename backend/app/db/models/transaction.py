import enum
import hashlib
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    transaction_type = Column(Enum(TransactionType, native_enum=False, length=20), nullable=False)
    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    merchant_name = Column(String(255), nullable=True)
    is_cleared = Column(Boolean, default=True, nullable=False)
    import_hash = Column(String(64), nullable=True, index=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_user_hash", "user_id", "import_hash"),
    )

    @staticmethod
    def generate_hash(account_id: str, tx_date: date, amount: Decimal, desc: str) -> str:
        d_str = tx_date.isoformat() if hasattr(tx_date, "isoformat") else str(tx_date)
        a_str = f"{Decimal(str(amount)):.2f}"
        raw = f"{account_id}:{d_str}:{a_str}:{desc.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
