from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.category import Category, CategoryType
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, session: AsyncSession):
        super().__init__(Category, session)

    async def get_all_for_user(self, user_id: str) -> List[Category]:
        stmt = select(Category).where(
            or_(Category.user_id == user_id, Category.is_system.is_(True))
        ).order_by(Category.name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_name(self, name: str, user_id: str) -> Optional[Category]:
        stmt = select(Category).where(
            Category.name.ilike(name.strip()),
            or_(Category.user_id == user_id, Category.is_system.is_(True))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
