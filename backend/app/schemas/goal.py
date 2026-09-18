import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.goal import GoalStatus, GoalType

class GoalBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    goal_type: GoalType = GoalType.SAVINGS
    target_amount: Decimal = Field(..., gt=Decimal("0.00"))
    current_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    target_date: Optional[datetime.date] = None
    status: GoalStatus = GoalStatus.IN_PROGRESS
    currency: str = Field(default="INR", min_length=3, max_length=10)
    color: Optional[str] = Field(None, max_length=20)

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    goal_type: Optional[GoalType] = None
    target_amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    current_amount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    target_date: Optional[datetime.date] = None
    status: Optional[GoalStatus] = None
    currency: Optional[str] = None
    color: Optional[str] = None

class GoalResponse(GoalBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    progress_percentage: float = 0.0
    model_config = ConfigDict(from_attributes=True)
