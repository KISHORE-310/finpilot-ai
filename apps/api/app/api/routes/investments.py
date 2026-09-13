from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.investment import (
    InvestmentCreate,
    InvestmentResponse,
    InvestmentTxCreate,
    InvestmentTxResponse,
    InvestmentUpdate,
)
from app.services.investment_service import InvestmentService

router = APIRouter(prefix="/investments", tags=["Investments"])


@router.get("", response_model=List[InvestmentResponse])
async def get_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentService(db)
    return await service.get_investments(user_id=current_user.id)


@router.get("/{investment_id}", response_model=InvestmentResponse)
async def get_investment(
    investment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentService(db)
    return await service.get_by_id(investment_id, current_user.id)


@router.post("", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
async def create_investment(
    data: InvestmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentService(db)
    return await service.create_investment(current_user.id, data)


@router.patch("/{investment_id}", response_model=InvestmentResponse)
async def update_investment(
    investment_id: str,
    data: InvestmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentService(db)
    return await service.update_investment(investment_id, current_user.id, data)


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investment(
    investment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentService(db)
    await service.delete_investment(investment_id, current_user.id)


@router.post("/{investment_id}/transactions", response_model=InvestmentTxResponse, status_code=status.HTTP_201_CREATED)
async def add_investment_transaction(
    investment_id: str,
    data: InvestmentTxCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentService(db)
    return await service.add_transaction(investment_id, current_user.id, data)
