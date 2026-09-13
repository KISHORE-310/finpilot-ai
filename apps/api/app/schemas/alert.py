from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.db.models.financial_alert import AlertType, AlertSeverity


class AlertBase(BaseModel):
    alert_type: AlertType
    severity: AlertSeverity = AlertSeverity.INFO
    title: str
    message: str
    context_data: Optional[str] = None


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertSummary(BaseModel):
    total_count: int
    unread_count: int
    critical_count: int
