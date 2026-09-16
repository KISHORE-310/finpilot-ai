from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException, ForbiddenException
from app.db.models.category import Category, CategoryType
from app.repositories.category_repo import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate


class CategoryService:
    def __init__(self, session: AsyncSession):
        self.category_repo = CategoryRepository(session)

    async def get_categories(self, user_id: str) -> List[CategoryResponse]:
        cats = await self.category_repo.get_all_for_user(user_id)
        return [CategoryResponse.model_validate(c) for c in cats]

    async def create_category(self, user_id: str, cat_in: CategoryCreate) -> CategoryResponse:
        cat_dict = cat_in.model_dump()
        cat_dict["user_id"] = user_id
        cat_dict["is_system"] = False
        cat = await self.category_repo.create(cat_dict)
        return CategoryResponse.model_validate(cat)

    async def update_category(
        self, cat_id: str, user_id: str, cat_in: CategoryUpdate
    ) -> CategoryResponse:
        cat = await self.category_repo.get_by_id(cat_id)
        if not cat or (cat.user_id != user_id and not cat.is_system):
            raise EntityNotFoundException("Category", cat_id)
        if cat.is_system:
            raise ForbiddenException("System default categories cannot be modified.")
        update_data = cat_in.model_dump(exclude_unset=True)
        updated = await self.category_repo.update(cat, update_data)
        return CategoryResponse.model_validate(updated)

    async def delete_category(self, cat_id: str, user_id: str) -> bool:
        cat = await self.category_repo.get_by_id(cat_id)
        if not cat or (cat.user_id != user_id and not cat.is_system):
            raise EntityNotFoundException("Category", cat_id)
        if cat.is_system:
            raise ForbiddenException("System default categories cannot be deleted.")
        return await self.category_repo.delete(cat)
