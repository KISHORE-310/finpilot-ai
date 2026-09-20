import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.db.models.transaction import TransactionType


class TransactionBase(BaseModel):
    account_id: str
    transfer_account_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Decimal = Field(..., gt=Decimal("0.00"), description="Transaction amount must be strictly positive")
    currency: str = Field(default="INR", min_length=3, max_length=10)
    transaction_type: TransactionType
    transaction_date: datetime.date = Field(default_factory=datetime.date.today)
    description: str = Field(..., min_length=1, max_length=500)
    merchant_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: str) -> str:
        return v.strip().upper()


class TransactionCreate(TransactionBase):
    @model_validator(mode="after")
    def validate_transfer_fields(self) -> "TransactionCreate":
        if self.transaction_type == TransactionType.TRANSFER:
            if not self.transfer_account_id:
                raise ValueError("transfer_account_id is required for transfer transactions.")
            if self.transfer_account_id == self.account_id:
                raise ValueError("Source account and destination transfer account cannot be the same.")
        return self


class TransactionUpdate(BaseModel):
    account_id: Optional[str] = None
    transfer_account_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    currency: Optional[str] = Field(None, min_length=3, max_length=10)
    transaction_type: Optional[TransactionType] = None
    transaction_date: Optional[datetime.date] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    merchant_name: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else None

    @model_validator(mode="after")
    def validate_distinct_transfer_accounts(self) -> "TransactionUpdate":
        if self.account_id and self.transfer_account_id and self.account_id == self.transfer_account_id:
            raise ValueError("Source account and destination transfer account cannot be the same.")
        return self


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
