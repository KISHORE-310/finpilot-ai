from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.goal import FinancialGoal
from app.repositories.base import BaseRepository


class GoalRepository(BaseRepository[FinancialGoal]):
    def __init__(self, session: AsyncSession):
        super().__init__(FinancialGoal, session)

    async def get_by_user(self, user_id: str) -> List[FinancialGoal]:
        stmt = select(FinancialGoal).where(
            FinancialGoal.user_id == user_id
        ).order_by(desc(FinancialGoal.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, id: str, user_id: str) -> Optional[FinancialGoal]:
        stmt = select(FinancialGoal).where(
            FinancialGoal.id == id,
            FinancialGoal.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
