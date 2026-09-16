from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.expense import Expense
from app.repositories.account_repo import AccountRepository
from app.repositories.expense_repo import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate


class ExpenseService:
    def __init__(self, session: AsyncSession):
        self.expense_repo = ExpenseRepository(session)
        self.account_repo = AccountRepository(session)

    async def get_expenses(self, user_id: str) -> List[ExpenseResponse]:
        records = await self.expense_repo.get_by_user(user_id)
        return [ExpenseResponse.model_validate(r) for r in records]

    async def get_expense(self, id: str, user_id: str) -> ExpenseResponse:
        exp = await self.expense_repo.get_by_id_and_user(id, user_id)
        if not exp:
            raise EntityNotFoundException("Expense", id)
        return ExpenseResponse.model_validate(exp)

    async def create_expense(self, user_id: str, expense_in: ExpenseCreate) -> ExpenseResponse:
        account = None
        if expense_in.account_id:
            account = await self.account_repo.get_by_id(expense_in.account_id)
            if not account or account.user_id != user_id:
                raise EntityNotFoundException("Account", expense_in.account_id)

        exp_dict = expense_in.model_dump()
        exp_dict["user_id"] = user_id
        exp = await self.expense_repo.create(exp_dict)
        if account:
            account.current_balance = Decimal(str(account.current_balance)) - Decimal(str(exp.amount))
            await self.account_repo.update(account, {"current_balance": account.current_balance})
        return ExpenseResponse.model_validate(exp)

    async def update_expense(self, id: str, user_id: str, expense_in: ExpenseUpdate) -> ExpenseResponse:
        exp = await self.expense_repo.get_by_id_and_user(id, user_id)
        if not exp:
            raise EntityNotFoundException("Expense", id)

        update_data = expense_in.model_dump(exclude_unset=True)
        updated = await self.expense_repo.update(exp, update_data)
        return ExpenseResponse.model_validate(updated)

    async def delete_expense(self, id: str, user_id: str) -> bool:
        exp = await self.expense_repo.get_by_id_and_user(id, user_id)
        if not exp:
            raise EntityNotFoundException("Expense", id)
        if exp.account_id:
            account = await self.account_repo.get_by_id(exp.account_id)
            if account:
                account.current_balance = Decimal(str(account.current_balance)) + Decimal(str(exp.amount))
                await self.account_repo.update(account, {"current_balance": account.current_balance})
        return await self.expense_repo.delete(exp)
