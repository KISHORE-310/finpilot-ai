from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.expense import Expense
from app.repositories.base import BaseRepository


class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, session: AsyncSession):
        super().__init__(Expense, session)

    async def get_by_user(self, user_id: str) -> List[Expense]:
        stmt = select(Expense).where(Expense.user_id == user_id).order_by(desc(Expense.date))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, id: str, user_id: str) -> Optional[Expense]:
        stmt = select(Expense).where(Expense.id == id, Expense.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
