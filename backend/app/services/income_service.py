from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.income import Income
from app.repositories.income_repo import IncomeRepository
from app.repositories.account_repo import AccountRepository
from app.schemas.income import IncomeCreate, IncomeResponse, IncomeUpdate


class IncomeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.income_repo = IncomeRepository(session)
        self.account_repo = AccountRepository(session)

    async def get_income_records(self, user_id: str, is_active: Optional[bool] = None) -> List[IncomeResponse]:
        records = await self.income_repo.get_by_user(user_id)
        return [IncomeResponse.model_validate(r) for r in records]

    async def get_income(self, income_id: str, user_id: str) -> IncomeResponse:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)
        return IncomeResponse.model_validate(record)

    async def create_income(self, user_id: str, income_in: IncomeCreate) -> IncomeResponse:
        account = None
        if income_in.account_id:
            account = await self.account_repo.get_by_id(income_in.account_id)
            if not account or account.user_id != user_id:
                raise EntityNotFoundException("Account", income_in.account_id)

        income_dict = income_in.model_dump()
        income_dict["user_id"] = user_id
        record = await self.income_repo.create(income_dict)
        if account:
            account.current_balance = Decimal(str(account.current_balance)) + Decimal(str(record.amount))
            await self.account_repo.update(account, {"current_balance": account.current_balance})
        return IncomeResponse.model_validate(record)

    async def update_income(
        self, income_id: str, user_id: str, income_in: IncomeUpdate
    ) -> IncomeResponse:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)

        old_amount = Decimal(str(record.amount))
        old_account_id = record.account_id

        update_data = income_in.model_dump(exclude_unset=True)

        new_account_id = update_data.get("account_id", old_account_id)
        if "account_id" in update_data and new_account_id:
            new_acc_obj = await self.account_repo.get_by_id(new_account_id)
            if not new_acc_obj or new_acc_obj.user_id != user_id:
                raise EntityNotFoundException("Account", new_account_id)

        updated = await self.income_repo.update(record, update_data)

        # Re-sync account balances when amount or account changed
        if "amount" in update_data or "account_id" in update_data:
            if old_account_id:
                old_acc = await self.account_repo.get_by_id(old_account_id)
                if old_acc:
                    old_acc.current_balance = Decimal(str(old_acc.current_balance)) - old_amount
            if new_account_id:
                new_acc = await self.account_repo.get_by_id(new_account_id)
                if new_acc:
                    new_acc.current_balance = Decimal(str(new_acc.current_balance)) + Decimal(str(updated.amount))

        return IncomeResponse.model_validate(updated)

    async def delete_income(self, income_id: str, user_id: str) -> bool:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)
        if record.account_id:
            account = await self.account_repo.get_by_id(record.account_id)
            if account:
                account.current_balance = Decimal(str(account.current_balance)) - Decimal(str(record.amount))
        return await self.income_repo.delete(record)
