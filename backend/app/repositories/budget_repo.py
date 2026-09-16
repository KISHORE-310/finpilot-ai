from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models.budget import Budget
from app.repositories.base import BaseRepository


class BudgetRepository(BaseRepository[Budget]):
    def __init__(self, session: AsyncSession):
        super().__init__(Budget, session)

    async def get_by_user(self, user_id: str) -> List[Budget]:
        stmt = select(Budget).options(
            selectinload(Budget.category)
        ).where(Budget.user_id == user_id).order_by(desc(Budget.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, id: str, user_id: str) -> Optional[Budget]:
        stmt = select(Budget).options(
            selectinload(Budget.category)
        ).where(Budget.id == id, Budget.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
