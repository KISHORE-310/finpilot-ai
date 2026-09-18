import datetime
import math
from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException, ForbiddenException
from app.db.models.transaction import Transaction, TransactionType
from app.db.models.account import Account
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.account_repo import AccountRepository
from app.schemas.common import PaginatedResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilterParams,
    TransactionResponse,
    TransactionUpdate,
)


class TransactionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tx_repo = TransactionRepository(session)
        self.account_repo = AccountRepository(session)

    async def get_transactions(
        self, user_id: str, filters: TransactionFilterParams
    ) -> PaginatedResponse[TransactionResponse]:
        items, total = await self.tx_repo.filter_transactions(
            user_id=user_id,
            account_id=filters.account_id,
            category_id=filters.category_id,
            transaction_type=filters.transaction_type,
            start_date=filters.start_date,
            end_date=filters.end_date,
            search=filters.search,
            page=filters.page,
            page_size=filters.page_size,
        )
        return PaginatedResponse(
            items=[TransactionResponse.model_validate(tx) for tx in items],
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            total_pages=math.ceil(total / filters.page_size),
        )

    async def get_transaction(self, tx_id: str, user_id: str) -> TransactionResponse:
        tx = await self.tx_repo.get_by_id(tx_id)
        if not tx or tx.user_id != user_id:
            raise EntityNotFoundException("Transaction", tx_id)
        return TransactionResponse.model_validate(tx)

    async def get_by_id(self, tx_id: str, user_id: str) -> TransactionResponse:
        return await self.get_transaction(tx_id=tx_id, user_id=user_id)

    async def create_transaction(
        self, user_id: str, tx_in: TransactionCreate
    ) -> TransactionResponse:
        account = await self.account_repo.get_by_id(tx_in.account_id)
        if not account or account.user_id != user_id:
            raise EntityNotFoundException("Account", tx_in.account_id)

        tx_dict = tx_in.model_dump()
        tx_dict["user_id"] = user_id
        
        # Calculate hash for duplicate prevention
        tx_dict["import_hash"] = Transaction.generate_hash(
            account_id=tx_in.account_id,
            tx_date=tx_in.transaction_date,
            amount=tx_in.amount,
            desc=tx_in.description
        )

        tx = await self.tx_repo.create(tx_dict)

        # Update account balance (Ledger source of truth)
        if tx.transaction_type == TransactionType.INCOME:
            account.current_balance = Decimal(str(account.current_balance)) + Decimal(str(tx.amount))
        elif tx.transaction_type == TransactionType.EXPENSE:
            account.current_balance = Decimal(str(account.current_balance)) - Decimal(str(tx.amount))
        await self.session.commit()
        await self.session.refresh(tx)

        return TransactionResponse.model_validate(tx)

    async def update_transaction(
        self, tx_id: str, user_id: str, tx_in: TransactionUpdate
    ) -> TransactionResponse:
        tx = await self.tx_repo.get_by_id(tx_id)
        if not tx or tx.user_id != user_id:
            raise EntityNotFoundException("Transaction", tx_id)

        old_amount = Decimal(str(tx.amount))
        old_type = tx.transaction_type
        old_account_id = tx.account_id

        update_data = tx_in.model_dump(exclude_unset=True)
        updated = await self.tx_repo.update(tx, update_data)

        # Re-adjust account balances
        if "amount" in update_data or "transaction_type" in update_data or "account_id" in update_data:
            old_acc = await self.account_repo.get_by_id(old_account_id)
            if old_acc:
                if old_type == TransactionType.INCOME:
                    old_acc.current_balance = Decimal(str(old_acc.current_balance)) - old_amount
                elif old_type == TransactionType.EXPENSE:
                    old_acc.current_balance = Decimal(str(old_acc.current_balance)) + old_amount

            new_acc = await self.account_repo.get_by_id(updated.account_id)
            if new_acc:
                if updated.transaction_type == TransactionType.INCOME:
                    new_acc.current_balance = Decimal(str(new_acc.current_balance)) + Decimal(str(updated.amount))
                elif updated.transaction_type == TransactionType.EXPENSE:
                    new_acc.current_balance = Decimal(str(new_acc.current_balance)) - Decimal(str(updated.amount))

        await self.session.commit()
        await self.session.refresh(updated)
        return TransactionResponse.model_validate(updated)

    async def delete_transaction(self, tx_id: str, user_id: str) -> bool:
        tx = await self.tx_repo.get_by_id(tx_id)
        if not tx or tx.user_id != user_id:
            raise EntityNotFoundException("Transaction", tx_id)

        account = await self.account_repo.get_by_id(tx.account_id)
        if account:
            if tx.transaction_type == TransactionType.INCOME:
                account.current_balance = Decimal(str(account.current_balance)) - Decimal(str(tx.amount))
            elif tx.transaction_type == TransactionType.EXPENSE:
                account.current_balance = Decimal(str(account.current_balance)) + Decimal(str(tx.amount))

        await self.tx_repo.delete(tx)
        await self.session.commit()
        return True
