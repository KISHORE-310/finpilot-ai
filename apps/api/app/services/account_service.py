from decimal import Decimal
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException, ForbiddenException
from app.db.models.account import Account, AccountType
from app.repositories.account_repo import AccountRepository
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate, NetWorthSummary


class AccountService:
    def __init__(self, session: AsyncSession):
        self.account_repo = AccountRepository(session)

    async def get_accounts(self, user_id: str, active_only: bool = False) -> List[AccountResponse]:
        accounts = await self.account_repo.get_by_user(user_id=user_id, active_only=active_only)
        return [AccountResponse.model_validate(a) for a in accounts]

    async def get_net_worth_summary(self, user_id: str) -> NetWorthSummary:
        accounts = await self.account_repo.get_by_user(user_id=user_id, active_only=True)
        total_assets = Decimal("0.00")
        total_liabilities = Decimal("0.00")

        for acc in accounts:
            bal = Decimal(str(acc.current_balance))
            if acc.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
                total_liabilities += bal
            else:
                total_assets += bal

        net_worth = total_assets - total_liabilities
        return NetWorthSummary(
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            net_worth=net_worth,
            currency="USD",
            account_count=len(accounts),
        )

    async def get_account_by_id(self, account_id: str, user_id: str) -> AccountResponse:
        account = await self.account_repo.get_by_id(account_id)
        if not account or account.user_id != user_id:
            raise EntityNotFoundException("Account", account_id)
        return AccountResponse.model_validate(account)

    async def create_account(self, user_id: str, account_in: AccountCreate) -> AccountResponse:
        account_dict = account_in.model_dump()
        account_dict["user_id"] = user_id
        account = await self.account_repo.create(account_dict)
        return AccountResponse.model_validate(account)

    async def update_account(
        self, account_id: str, user_id: str, account_in: AccountUpdate
    ) -> AccountResponse:
        account = await self.account_repo.get_by_id(account_id)
        if not account or account.user_id != user_id:
            raise EntityNotFoundException("Account", account_id)
        update_data = account_in.model_dump(exclude_unset=True)
        updated = await self.account_repo.update(account, update_data)
        return AccountResponse.model_validate(updated)

    async def delete_account(self, account_id: str, user_id: str) -> bool:
        account = await self.account_repo.get_by_id(account_id)
        if not account or account.user_id != user_id:
            raise EntityNotFoundException("Account", account_id)
        return await self.account_repo.delete(account)
