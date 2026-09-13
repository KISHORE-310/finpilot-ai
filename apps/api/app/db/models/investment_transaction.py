import enum
import uuid
from sqlalchemy import Column, Date, Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class InvestmentTxType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    DIVIDEND = "dividend"
    SPLIT = "split"


class InvestmentTransaction(Base, TimestampMixin):
    __tablename__ = "investment_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    investment_id = Column(String(36), ForeignKey("investments.id", ondelete="CASCADE"), nullable=False, index=True)

    transaction_type = Column(Enum(InvestmentTxType, native_enum=False, length=20), nullable=False)
    transaction_date = Column(Date, nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)
    price_per_unit = Column(Numeric(18, 4), nullable=False)
    total_amount = Column(Numeric(18, 2), nullable=False)
    fees = Column(Numeric(18, 2), nullable=False, default=0.00)
    notes = Column(Text, nullable=True)

    investment = relationship("Investment", back_populates="transactions")
