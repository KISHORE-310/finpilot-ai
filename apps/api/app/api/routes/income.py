from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.services.income_service import IncomeService
from app.schemas.common import MessageResponse
from app.schemas.income import IncomeCreate, IncomeResponse, IncomeUpdate

router = APIRouter(prefix="/income", tags=["Income"])


@router.get("", response_model=List[IncomeResponse])
async def get_income_records(sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncomeService(sp_db)
    return await service.get_income_records(user_id=current_user.id)


@router.get("/{id}", response_model=IncomeResponse)
async def get_income(id: str, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncomeService(sp_db)
    return await service.get_income(income_id=id, user_id=current_user.id)


@router.post("", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
async def create_income(income_in: IncomeCreate, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncomeService(sp_db)
    return await service.create_income(user_id=current_user.id, income_in=income_in)


@router.patch("/{id}", response_model=IncomeResponse)
async def update_income(id: str, income_in: IncomeUpdate, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncomeService(sp_db)
    return await service.update_income(income_id=id, user_id=current_user.id, income_in=income_in)


@router.delete("/{id}", response_model=MessageResponse)
async def delete_income(id: str, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = IncomeService(sp_db)
    await service.delete_income(income_id=id, user_id=current_user.id)
    return MessageResponse(message="Income record deleted successfully.")
