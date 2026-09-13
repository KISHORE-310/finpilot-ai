from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models.investment import Investment
from app.db.models.investment_transaction import InvestmentTransaction
from app.repositories.base import BaseRepository


class InvestmentRepository(BaseRepository[Investment]):
    def __init__(self, session: AsyncSession):
        super().__init__(Investment, session)

    async def get_by_user(self, user_id: str) -> List[Investment]:
        stmt = select(Investment).options(
            selectinload(Investment.account),
            selectinload(Investment.transactions)
        ).where(Investment.user_id == user_id).order_by(Investment.name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user(self, id: str, user_id: str) -> Optional[Investment]:
        stmt = select(Investment).options(
            selectinload(Investment.account),
            selectinload(Investment.transactions)
        ).where(Investment.id == id, Investment.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def add_transaction(self, tx_data: dict) -> InvestmentTransaction:
        tx = InvestmentTransaction(**tx_data)
        self.session.add(tx)
        await self.session.flush()
        await self.session.refresh(tx)
        return tx

    async def get_transactions(self, investment_id: str, user_id: str) -> List[InvestmentTransaction]:
        stmt = select(InvestmentTransaction).where(
            InvestmentTransaction.investment_id == investment_id,
            InvestmentTransaction.user_id == user_id
        ).order_by(desc(InvestmentTransaction.transaction_date))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
