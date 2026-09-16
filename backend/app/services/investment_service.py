from decimal import Decimal
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.investment import Investment
from app.db.models.investment_transaction import InvestmentTransaction, InvestmentTxType
from app.repositories.investment_repo import InvestmentRepository
from app.schemas.investment import (
    InvestmentCreate,
    InvestmentResponse,
    InvestmentTxCreate,
    InvestmentTxResponse,
    InvestmentUpdate,
)


class InvestmentService:
    def __init__(self, session: AsyncSession):
        self.inv_repo = InvestmentRepository(session)

    async def get_investments(self, user_id: str) -> List[InvestmentResponse]:
        items = await self.inv_repo.get_by_user(user_id)
        return [InvestmentResponse.model_validate(item) for item in items]

    async def get_by_id(self, id: str, user_id: str) -> InvestmentResponse:
        item = await self.inv_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Investment", id)
        return InvestmentResponse.model_validate(item)

    async def create_investment(self, user_id: str, inv_in: InvestmentCreate) -> InvestmentResponse:
        inv_dict = inv_in.model_dump()
        inv_dict["user_id"] = user_id
        item = await self.inv_repo.create(inv_dict)
        return InvestmentResponse.model_validate(item)

    async def update_investment(self, id: str, user_id: str, inv_in: InvestmentUpdate) -> InvestmentResponse:
        item = await self.inv_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Investment", id)
        update_data = inv_in.model_dump(exclude_unset=True)
        updated = await self.inv_repo.update(item, update_data)
        return InvestmentResponse.model_validate(updated)

    async def delete_investment(self, id: str, user_id: str) -> bool:
        item = await self.inv_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Investment", id)
        return await self.inv_repo.delete(item)

    async def add_transaction(self, id: str, user_id: str, tx_in: InvestmentTxCreate) -> InvestmentTxResponse:
        item = await self.inv_repo.get_by_id_and_user(id, user_id)
        if not item:
            raise EntityNotFoundException("Investment", id)
        tx_dict = tx_in.model_dump()
        tx_dict["user_id"] = user_id
        tx_dict["investment_id"] = id
        tx = await self.inv_repo.add_transaction(tx_dict)

        current_qty = Decimal(str(item.quantity))
        if tx.transaction_type == InvestmentTxType.BUY:
            item.quantity = current_qty + Decimal(str(tx.quantity))
            item.current_value = item.quantity * Decimal(str(tx.price_per_unit))
        elif tx.transaction_type == InvestmentTxType.SELL:
            item.quantity = max(Decimal("0"), current_qty - Decimal(str(tx.quantity)))
            item.current_value = item.quantity * Decimal(str(tx.price_per_unit))
        await self.inv_repo.update(item, {"quantity": item.quantity, "current_value": item.current_value})
        return InvestmentTxResponse.model_validate(tx)
