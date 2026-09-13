import enum
import uuid
from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class IncomeSource(str, enum.Enum):
    SALARY = "salary"
    BUSINESS = "business"
    FREELANCE = "freelance"
    INVESTMENTS = "investments"
    RENTAL = "rental"
    OTHER = "other"


class Income(Base, TimestampMixin):
    __tablename__ = "income"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    source = Column(Enum(IncomeSource, native_enum=False, length=50), nullable=False, default=IncomeSource.SALARY)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    is_recurring = Column(Boolean, default=False, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String(500), nullable=True)

    user = relationship("User", back_populates="income_records")
    account = relationship("Account", back_populates="income_records")
    category = relationship("Category", back_populates="income_records")
