from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.transaction import TransactionType
from app.db.models.user import User
from app.db.session import get_db
from app.services.transaction_service import TransactionService
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilterParams,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=PaginatedResponse[TransactionResponse])
async def get_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    transaction_type: Optional[TransactionType] = None,
    search: Optional[str] = None,
    min_amount: Optional[Decimal] = None,
    max_amount: Optional[Decimal] = None,
    sort_by: str = "transaction_date",
    sort_order: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TransactionService(db)
    params = TransactionFilterParams(
        start_date=start_date,
        end_date=end_date,
        account_id=account_id,
        category_id=category_id,
        transaction_type=transaction_type,
        search=search,
        page=page,
        page_size=page_size,
    )
    return await service.get_transactions(user_id=current_user.id, filters=params)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    tx_in: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TransactionService(db)
    return await service.create_transaction(user_id=current_user.id, tx_in=tx_in)


@router.post("/backfill", response_model=dict)
async def backfill_ledger(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Safely backfill canonical Transactions for existing Income and Expense records."""
    from app.services.income_service import IncomeService
    from app.services.expense_service import ExpenseService
    inc_service = IncomeService(db)
    exp_service = ExpenseService(db)
    inc_count = await inc_service.backfill_canonical_transactions(user_id=str(current_user.id))
    exp_count = await exp_service.backfill_canonical_transactions(user_id=str(current_user.id))
    await db.commit()
    return {
        "status": "success",
        "backfilled_income": inc_count,
        "backfilled_expenses": exp_count,
        "total_backfilled": inc_count + exp_count,
    }


@router.get("/{id}", response_model=TransactionResponse)
async def get_transaction(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TransactionService(db)
    return await service.get_transaction(tx_id=id, user_id=current_user.id)


@router.put("/{id}", response_model=TransactionResponse)
@router.patch("/{id}", response_model=TransactionResponse)
async def update_transaction(
    id: str,
    tx_in: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TransactionService(db)
    return await service.update_transaction(tx_id=id, user_id=current_user.id, tx_in=tx_in)


@router.delete("/{id}", response_model=MessageResponse)
async def delete_transaction(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TransactionService(db)
    await service.delete_transaction(tx_id=id, user_id=current_user.id)
    return MessageResponse(message="Transaction deleted successfully.")
