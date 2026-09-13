import enum
import uuid
from sqlalchemy import Boolean, Column, Enum, ForeignKey, Index, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class CategoryType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    category_type = Column(Enum(CategoryType, native_enum=False, length=20), nullable=False, default=CategoryType.EXPENSE)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    income_records = relationship("Income", back_populates="category")
    expenses = relationship("Expense", back_populates="category")
    budgets = relationship("Budget", back_populates="category")

    __table_args__ = (
        Index("ix_categories_user_type", "user_id", "category_type"),
    )
