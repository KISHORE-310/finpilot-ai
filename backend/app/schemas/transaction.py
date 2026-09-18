import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.transaction import TransactionType

class TransactionBase(BaseModel):
    account_id: str
    category_id: Optional[str] = None
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    currency: str = Field(default="INR", min_length=3, max_length=10)
    transaction_type: TransactionType
    transaction_date: datetime.date = Field(default_factory=datetime.date.today)
    description: str = Field(..., min_length=1, max_length=500)
    merchant_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    currency: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    transaction_date: Optional[datetime.date] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    merchant_name: Optional[str] = None
    notes: Optional[str] = None

class TransactionFilterParams(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    is_cleared: bool
    import_hash: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
