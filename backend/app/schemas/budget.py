import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.db.models.budget import BudgetPeriod


class BudgetBase(BaseModel):
    category_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=Decimal("0.00"), description="Budget limit must be strictly positive")
    period: BudgetPeriod = BudgetPeriod.MONTHLY
    start_date: datetime.date = Field(default_factory=datetime.date.today)
    end_date: Optional[datetime.date] = None
    currency: str = Field(default="INR", min_length=3, max_length=10)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_date_range(self) -> "BudgetBase":
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("Budget end_date cannot be earlier than start_date.")
        return self


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    period: Optional[BudgetPeriod] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    currency: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else None

    @model_validator(mode="after")
    def validate_date_range(self) -> "BudgetUpdate":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("Budget end_date cannot be earlier than start_date.")
        return self


class BudgetResponse(BudgetBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    spent_amount: Decimal = Decimal("0.00")
    remaining_amount: Decimal = Decimal("0.00")
    percentage_used: float = 0.0
    model_config = ConfigDict(from_attributes=True)
