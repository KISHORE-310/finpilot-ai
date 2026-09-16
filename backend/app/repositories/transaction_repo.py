from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import and_, desc, asc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models.transaction import Transaction, TransactionType
from app.repositories.base import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(Transaction, session)

    async def get_by_id_and_user(self, tx_id: str, user_id: str) -> Optional[Transaction]:
        stmt = select(Transaction).options(
            selectinload(Transaction.account),
            selectinload(Transaction.category)
        ).where(Transaction.id == tx_id, Transaction.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def filter_transactions(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        account_id: Optional[str] = None,
        category_id: Optional[str] = None,
        transaction_type: Optional[TransactionType] = None,
        search: Optional[str] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        sort_by: str = "transaction_date",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Transaction], int]:
        filters = [Transaction.user_id == user_id]

        if start_date:
            filters.append(Transaction.transaction_date >= start_date)
        if end_date:
            filters.append(Transaction.transaction_date <= end_date)
        if account_id:
            filters.append(Transaction.account_id == account_id)
        if category_id:
            filters.append(Transaction.category_id == category_id)
        if transaction_type:
            filters.append(Transaction.transaction_type == transaction_type)
        if min_amount:
            filters.append(Transaction.amount >= min_amount)
        if max_amount:
            filters.append(Transaction.amount <= max_amount)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(or_(
                Transaction.description.ilike(pattern),
                Transaction.merchant.ilike(pattern),
                Transaction.notes.ilike(pattern)
            ))

        count_stmt = select(func.count(Transaction.id)).where(and_(*filters))
        total = (await self.session.execute(count_stmt)).scalar() or 0

        sort_col = getattr(Transaction, sort_by, Transaction.transaction_date)
        order_clause = desc(sort_col) if sort_order.lower() == "desc" else asc(sort_col)

        stmt = select(Transaction).options(
            selectinload(Transaction.account),
            selectinload(Transaction.category)
        ).where(and_(*filters)).order_by(order_clause, desc(Transaction.created_at)).offset(
            (page - 1) * page_size
        ).limit(page_size)

        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def exists_by_hash(self, user_id: str, import_hash: str) -> bool:
        stmt = select(Transaction.id).where(
            Transaction.user_id == user_id,
            Transaction.import_hash == import_hash
        ).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None
