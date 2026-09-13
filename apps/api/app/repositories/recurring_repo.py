from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.recurring_transaction import RecurringTransaction
from app.repositories.base import BaseRepository


class RecurringRepository(BaseRepository[RecurringTransaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(RecurringTransaction, session)

    async def get_by_user(self, user_id: str) -> List[RecurringTransaction]:
        stmt = select(RecurringTransaction).where(
            RecurringTransaction.user_id == user_id
        ).order_by(desc(RecurringTransaction.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, id: str, user_id: str) -> Optional[RecurringTransaction]:
        stmt = select(RecurringTransaction).where(
            RecurringTransaction.id == id,
            RecurringTransaction.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
