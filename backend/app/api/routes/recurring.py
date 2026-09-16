from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.recurring import RecurringTxCreate, RecurringTxResponse, RecurringTxUpdate
from app.services.recurring_service import RecurringService

router = APIRouter(prefix="/recurring", tags=["Recurring Transactions"])


@router.get("", response_model=List[RecurringTxResponse])
async def get_recurring_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RecurringService(db)
    return await service.get_recurring(user_id=current_user.id)


@router.get("/{recurring_id}", response_model=RecurringTxResponse)
async def get_recurring_transaction(
    recurring_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RecurringService(db)
    return await service.get_by_id(recurring_id, current_user.id)


@router.post("", response_model=RecurringTxResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_transaction(
    data: RecurringTxCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RecurringService(db)
    return await service.create_recurring(current_user.id, data)


@router.patch("/{recurring_id}", response_model=RecurringTxResponse)
async def update_recurring_transaction(
    recurring_id: str,
    data: RecurringTxUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RecurringService(db)
    return await service.update_recurring(recurring_id, current_user.id, data)


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_transaction(
    recurring_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RecurringService(db)
    await service.delete_recurring(recurring_id, current_user.id)
