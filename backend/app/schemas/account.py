from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.account import AccountType

class NetWorthSummary(BaseModel):
    total_assets: Decimal
    total_liabilities: Decimal
    net_worth: Decimal
    currency: str = "USD"
    account_count: int

class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    account_type: AccountType = AccountType.BANK
    institution: Optional[str] = Field(None, max_length=255)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    current_balance: Decimal = Field(default=Decimal("0.00"))
    is_active: bool = True

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    account_type: Optional[AccountType] = None
    institution: Optional[str] = None
    current_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
