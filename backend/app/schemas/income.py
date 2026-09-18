import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.income import IncomeSource

class IncomeBase(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    source: IncomeSource = IncomeSource.SALARY
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    currency: str = Field(default="INR", min_length=3, max_length=10)
    is_recurring: bool = False
    date: datetime.date = Field(default_factory=datetime.date.today)
    description: Optional[str] = Field(None, max_length=500)

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    source: Optional[IncomeSource] = None
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    currency: Optional[str] = None
    is_recurring: Optional[bool] = None
    date: Optional[datetime.date] = None
    description: Optional[str] = None

class IncomeResponse(IncomeBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
