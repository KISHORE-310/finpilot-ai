from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.recurring_transaction import Frequency
from app.db.models.transaction import TransactionType


class RecurringTxBase(BaseModel):
    account_id: str
    category_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    transaction_type: TransactionType = TransactionType.EXPENSE
    frequency: Frequency = Frequency.MONTHLY
    next_occurrence: date = Field(default_factory=date.today)
    is_active: bool = True
    notes: Optional[str] = None


class RecurringTxCreate(RecurringTxBase):
    pass


class RecurringTxUpdate(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    transaction_type: Optional[TransactionType] = None
    frequency: Optional[Frequency] = None
    next_occurrence: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class RecurringTxResponse(RecurringTxBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
