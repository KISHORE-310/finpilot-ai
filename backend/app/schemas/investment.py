import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.investment import AssetType
from app.db.models.investment_transaction import InvestmentTxType

class InvestmentTxBase(BaseModel):
    transaction_type: InvestmentTxType
    transaction_date: datetime.date = Field(default_factory=datetime.date.today)
    quantity: Decimal = Field(..., ge=Decimal("0.0000"))
    price_per_unit: Decimal = Field(..., ge=Decimal("0.0000"))
    total_amount: Decimal = Field(..., ge=Decimal("0.00"))
    fees: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    notes: Optional[str] = None

class InvestmentTxCreate(InvestmentTxBase):
    pass

class InvestmentTxResponse(InvestmentTxBase):
    id: str
    user_id: str
    investment_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class InvestmentBase(BaseModel):
    account_id: str
    name: str = Field(..., min_length=1, max_length=255)
    asset_type: AssetType = AssetType.STOCK
    symbol: Optional[str] = Field(None, max_length=50)
    quantity: Decimal = Field(default=Decimal("0.0000"), ge=Decimal("0.0000"))
    average_cost: Decimal = Field(default=Decimal("0.0000"), ge=Decimal("0.0000"))
    current_value: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    currency: str = Field(default="INR", min_length=3, max_length=10)

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentUpdate(BaseModel):
    account_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    asset_type: Optional[AssetType] = None
    symbol: Optional[str] = None
    quantity: Optional[Decimal] = Field(None, ge=Decimal("0.0000"))
    average_cost: Optional[Decimal] = Field(None, ge=Decimal("0.0000"))
    current_value: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    currency: Optional[str] = None

class InvestmentResponse(InvestmentBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
