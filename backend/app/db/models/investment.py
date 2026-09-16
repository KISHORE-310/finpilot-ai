import enum
import uuid
from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class AssetType(str, enum.Enum):
    STOCK = "stock"
    ETF = "etf"
    CRYPTO = "crypto"
    MUTUAL_FUND = "mutual_fund"
    BOND = "bond"
    REAL_ESTATE = "real_estate"
    CASH = "cash"
    OTHER = "other"


class Investment(Base, TimestampMixin):
    __tablename__ = "investments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    asset_type = Column(Enum(AssetType, native_enum=False, length=50), nullable=False, default=AssetType.STOCK)
    symbol = Column(String(50), nullable=True, index=True)
    quantity = Column(Numeric(18, 4), nullable=False, default=0.0000)
    average_cost = Column(Numeric(18, 4), nullable=False, default=0.0000)
    current_value = Column(Numeric(18, 2), nullable=False, default=0.00)
    currency = Column(String(10), nullable=False, default="USD")

    user = relationship("User", back_populates="investments")
    account = relationship("Account", back_populates="investments")
    transactions = relationship("InvestmentTransaction", back_populates="investment", cascade="all, delete-orphan")
