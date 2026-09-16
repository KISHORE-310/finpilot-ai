from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.services.analytics.alert_service import AlertService
from app.schemas.alert import AlertResponse, AlertSummary

router = APIRouter(prefix="/alerts", tags=["Financial Alerts"])


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertService(db)
    return await service.get_user_alerts(
        user_id=str(current_user.id),
        unread_only=unread_only,
        limit=limit,
    )


@router.get("/summary", response_model=AlertSummary)
async def get_alerts_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertService(db)
    return await service.get_summary(user_id=str(current_user.id))


@router.patch("/{alert_id}/read", response_model=AlertResponse)
async def mark_alert_read(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertService(db)
    alert = await service.mark_read(user_id=str(current_user.id), alert_id=alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.post("/evaluate", response_model=List[AlertResponse])
async def evaluate_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AlertService(db)
    return await service.evaluate_and_generate_alerts(user_id=str(current_user.id))
