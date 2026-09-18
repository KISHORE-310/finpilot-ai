import uuid
from sqlalchemy import Boolean, Column, Date, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(255), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    is_recurring = Column(Boolean, default=False, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String(500), nullable=True)

    user = relationship("User", back_populates="expenses")
    account = relationship("Account", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
