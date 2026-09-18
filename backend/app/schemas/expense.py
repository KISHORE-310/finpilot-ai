import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ExpenseBase(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    currency: str = Field(default="INR", min_length=3, max_length=10)
    is_recurring: bool = False
    date: datetime.date = Field(default_factory=datetime.date.today)
    description: Optional[str] = Field(None, max_length=500)

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    currency: Optional[str] = None
    is_recurring: Optional[bool] = None
    date: Optional[datetime.date] = None
    description: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
