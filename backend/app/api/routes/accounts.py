from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.services.account_service import AccountService
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate, NetWorthSummary
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=List[AccountResponse])
async def get_accounts(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AccountService(db)
    return await service.get_accounts(user_id=current_user.id, active_only=active_only)


@router.get("/net-worth-summary", response_model=NetWorthSummary)
async def get_net_worth_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AccountService(db)
    return await service.get_net_worth_summary(user_id=current_user.id)


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_in: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AccountService(db)
    return await service.create_account(user_id=current_user.id, account_in=account_in)


@router.get("/{id}", response_model=AccountResponse)
async def get_account_by_id(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AccountService(db)
    return await service.get_account_by_id(account_id=id, user_id=current_user.id)


@router.patch("/{id}", response_model=AccountResponse)
async def update_account(
    id: str,
    account_in: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AccountService(db)
    return await service.update_account(account_id=id, user_id=current_user.id, account_in=account_in)


@router.delete("/{id}", response_model=MessageResponse)
async def delete_account(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AccountService(db)
    await service.delete_account(account_id=id, user_id=current_user.id)
    return MessageResponse(message="Account deleted successfully.")
