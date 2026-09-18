import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.budget import BudgetPeriod

class BudgetBase(BaseModel):
    category_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    period: BudgetPeriod = BudgetPeriod.MONTHLY
    start_date: datetime.date = Field(default_factory=datetime.date.today)
    end_date: Optional[datetime.date] = None
    currency: str = Field(default="INR", min_length=3, max_length=10)

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

class BudgetResponse(BudgetBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    spent_amount: Decimal = Decimal("0.00")
    remaining_amount: Decimal = Decimal("0.00")
    percentage_used: float = 0.0
    model_config = ConfigDict(from_attributes=True)
