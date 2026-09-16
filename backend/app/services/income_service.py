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
        update_data = income_in.model_dump(exclude_unset=True)
        updated = await self.income_repo.update(record, update_data)
        return IncomeResponse.model_validate(updated)

    async def delete_income(self, income_id: str, user_id: str) -> bool:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)
        return await self.income_repo.delete(record)
