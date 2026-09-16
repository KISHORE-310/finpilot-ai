from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.recurring_transaction import RecurringTransaction
from app.repositories.recurring_repo import RecurringRepository
from app.schemas.recurring import RecurringTxCreate, RecurringTxResponse, RecurringTxUpdate


class RecurringService:
    def __init__(self, session: AsyncSession):
        self.recurr_repo = RecurringRepository(session)

    async def get_recurring(self, user_id: str) -> List[RecurringTxResponse]:
        items = await self.recurr_repo.get_by_user(user_id)
        return [RecurringTxResponse.model_validate(item) for item in items]

    async def get_by_id(self, id: str, user_id: str) -> RecurringTxResponse:
        item = await self.recurr_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Recurring transaction", id)
        return RecurringTxResponse.model_validate(item)

    async def create_recurring(self, user_id: str, recurr_in: RecurringTxCreate) -> RecurringTxResponse:
        r_dict = recurr_in.model_dump()
        r_dict["user_id"] = user_id
        item = await self.recurr_repo.create(r_dict)
        return RecurringTxResponse.model_validate(item)

    async def update_recurring(self, id: str, user_id: str, recurr_in: RecurringTxUpdate) -> RecurringTxResponse:
        item = await self.recurr_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Recurring transaction", id)
        update_data = recurr_in.model_dump(exclude_unset=True)
        updated = await self.recurr_repo.update(item, update_data)
        return RecurringTxResponse.model_validate(updated)

    async def delete_recurring(self, id: str, user_id: str) -> bool:
        item = await self.recurr_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Recurring transaction", id)
        return await self.recurr_repo.delete(item)
