from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.services.expense_service import ExpenseService
from app.schemas.common import MessageResponse
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=List[ExpenseResponse])
async def get_expenses(sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExpenseService(sp_db)
    return await service.get_expenses(user_id=current_user.id)


@router.get("/{id}", response_model=ExpenseResponse)
async def get_expense(id: str, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExpenseService(sp_db)
    return await service.get_expense(id=id, user_id=current_user.id)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(exp_in: ExpenseCreate, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExpenseService(sp_db)
    return await service.create_expense(user_id=current_user.id, expense_in=exp_in)


@router.patch("/{id}", response_model=ExpenseResponse)
async def update_expense(id: str, exp_in: ExpenseUpdate, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExpenseService(sp_db)
    return await service.update_expense(id=id, user_id=current_user.id, expense_in=exp_in)


@router.delete("/{id}", response_model=MessageResponse)
async def delete_expense(id: str, sp_db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExpenseService(sp_db)
    await service.delete_expense(id=id, user_id=current_user.id)
    return MessageResponse(message="Expense deleted successfully.")
