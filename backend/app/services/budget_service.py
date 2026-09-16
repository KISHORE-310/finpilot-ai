from decimal import Decimal
from typing import List
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.budget import Budget
from app.db.models.transaction import Transaction, TransactionType
from app.repositories.budget_repo import BudgetRepository
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate


class BudgetService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.budget_repo = BudgetRepository(session)

    async def _populate_budget_metrics(self, budget: Budget, user_id: str) -> BudgetResponse:
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.category_id == budget.category_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.transaction_date >= budget.start_date,
        )
        if budget.end_date:
            stmt = stmt.where(Transaction.transaction_date <= budget.end_date)
        spent = (await self.session.execute(stmt)).scalar() or Decimal("0.00")
        spent_dec = Decimal(str(spent))
        amount_dec = Decimal(str(budget.amount))
        remaining = max(Decimal("0.00"), amount_dec - spent_dec)
        pct = float(min(Decimal("100.0"), (spent_dec / amount_dec * Decimal("100.0")))) if amount_dec > 0 else 0.0

        resp = BudgetResponse.model_validate(budget)
        resp.spent_amount = spent_dec
        resp.remaining_amount = remaining
        resp.percentage_used = round(pct, 1)
        return resp

    async def get_budgets(self, user_id: str) -> List[BudgetResponse]:
        budgets = await self.budget_repo.get_by_user(user_id)
        return [await self._populate_budget_metrics(b, user_id) for b in budgets]

    async def create_budget(self, user_id: str, budget_in: BudgetCreate) -> BudgetResponse:
        b_dict = budget_in.model_dump()
        b_dict["user_id"] = user_id
        budget = await self.budget_repo.create(b_dict)
        reloaded = await self.budget_repo.get_by_id_and_user(budget.id, user_id)
        return await self._populate_budget_metrics(reloaded or budget, user_id)


    async def update_budget(self, id: str, user_id: str, budget_in: BudgetUpdate) -> BudgetResponse:
        budget = await self.budget_repo.get_by_id_and_user(id, user_id)
        if not budget:
            raise EntityNotFoundException("Budget", id)
        update_data = budget_in.model_dump(exclude_unset=True)
        updated = await self.budget_repo.update(budget, update_data)
        reloaded = await self.budget_repo.get_by_id_and_user(updated.id, user_id)
        return await self._populate_budget_metrics(reloaded or updated, user_id)


    async def delete_budget(self, id: str, user_id: str) -> bool:
        budget = await self.budget_repo.get_by_id_and_user(id, user_id)
        if not budget:
            raise EntityNotFoundException("Budget", id)
        return await self.budget_repo.delete(budget)
