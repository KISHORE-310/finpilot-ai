from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.account import Account
from app.repositories.base import BaseRepository


class AccountRepository(BaseRepository[Account]):
    def __init__(self, session: AsyncSession):
        super().__init__(Account, session)

    async def get_by_user(self, user_id: str, active_only: bool = False) -> List[Account]:
        stmt = select(Account).where(Account.user_id == user_id)
        if active_only:
            stmt = stmt.where(Account.is_active.is_(True))
        stmt = stmt.order_by(Account.name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, account_id: str, user_id: str) -> Optional[Account]:
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
