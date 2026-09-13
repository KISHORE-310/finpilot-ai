from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.income import Income
from app.repositories.base import BaseRepository


class IncomeRepository(BaseRepository[Income]):
    def __init__(self, session: AsyncSession):
        super().__init__(Income, session)

    async def get_by_user(self, user_id: str) -> List[Income]:
        stmt = select(Income).where(Income.user_id == user_id).order_by(desc(Income.date))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, id: str, user_id: str) -> Optional[Income]:
        stmt = select(Income).where(Income.id == id, Income.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
