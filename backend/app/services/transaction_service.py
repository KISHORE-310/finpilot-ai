import datetime
import math
from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException, ForbiddenException, ValidationException
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
        # Validate source account ownership
        account = await self.account_repo.get_by_id(tx_in.account_id)
        if not account or account.user_id != user_id:
            raise EntityNotFoundException("Account", tx_in.account_id)

        # Validate transfer destination account and ownership
        dest_account = None
        if tx_in.transaction_type == TransactionType.TRANSFER:
            if not tx_in.transfer_account_id:
                raise ValidationException("transfer_account_id is required for transfer transactions.")
            if tx_in.transfer_account_id == tx_in.account_id:
                raise ValidationException("Source account and destination transfer account cannot be the same.")
            dest_account = await self.account_repo.get_by_id(tx_in.transfer_account_id)
            if not dest_account or dest_account.user_id != user_id:
                raise EntityNotFoundException("Destination Account", tx_in.transfer_account_id)

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

        # Double-entry ledger balance updates
        amt = Decimal(str(tx.amount))
        if tx.transaction_type == TransactionType.INCOME:
            account.current_balance = Decimal(str(account.current_balance)) + amt
        elif tx.transaction_type == TransactionType.EXPENSE:
            account.current_balance = Decimal(str(account.current_balance)) - amt
        elif tx.transaction_type == TransactionType.TRANSFER and dest_account is not None:
            account.current_balance = Decimal(str(account.current_balance)) - amt
            dest_account.current_balance = Decimal(str(dest_account.current_balance)) + amt

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
        old_transfer_account_id = tx.transfer_account_id

        update_data = tx_in.model_dump(exclude_unset=True)

        # Determine new values
        new_type = update_data.get("transaction_type", old_type)
        new_account_id = update_data.get("account_id", old_account_id)
        new_transfer_account_id = (
            update_data.get("transfer_account_id", old_transfer_account_id)
            if new_type == TransactionType.TRANSFER
            else None
        )
        new_amount = Decimal(str(update_data.get("amount", old_amount)))

        # Validate new source account
        new_source = await self.account_repo.get_by_id(new_account_id)
        if not new_source or new_source.user_id != user_id:
            raise EntityNotFoundException("Account", new_account_id)

        # Validate new transfer destination account if transfer
        new_dest = None
        if new_type == TransactionType.TRANSFER:
            if not new_transfer_account_id:
                raise ValidationException("transfer_account_id is required for transfer transactions.")
            if new_transfer_account_id == new_account_id:
                raise ValidationException("Source account and destination transfer account cannot be the same.")
            new_dest = await self.account_repo.get_by_id(new_transfer_account_id)
            if not new_dest or new_dest.user_id != user_id:
                raise EntityNotFoundException("Destination Account", new_transfer_account_id)

        # 1. Reverse old ledger balance effect
        if old_type == TransactionType.INCOME:
            old_acc = await self.account_repo.get_by_id(old_account_id)
            if old_acc:
                old_acc.current_balance = Decimal(str(old_acc.current_balance)) - old_amount
        elif old_type == TransactionType.EXPENSE:
            old_acc = await self.account_repo.get_by_id(old_account_id)
            if old_acc:
                old_acc.current_balance = Decimal(str(old_acc.current_balance)) + old_amount
        elif old_type == TransactionType.TRANSFER:
            old_src = await self.account_repo.get_by_id(old_account_id)
            if old_src:
                old_src.current_balance = Decimal(str(old_src.current_balance)) + old_amount
            if old_transfer_account_id:
                old_dst = await self.account_repo.get_by_id(old_transfer_account_id)
                if old_dst:
                    old_dst.current_balance = Decimal(str(old_dst.current_balance)) - old_amount

        # 2. Apply new ledger balance effect
        if new_type == TransactionType.INCOME:
            new_source.current_balance = Decimal(str(new_source.current_balance)) + new_amount
        elif new_type == TransactionType.EXPENSE:
            new_source.current_balance = Decimal(str(new_source.current_balance)) - new_amount
        elif new_type == TransactionType.TRANSFER and new_dest is not None:
            new_source.current_balance = Decimal(str(new_source.current_balance)) - new_amount
            new_dest.current_balance = Decimal(str(new_dest.current_balance)) + new_amount

        # If switching away from transfer, clear transfer_account_id
        if new_type != TransactionType.TRANSFER:
            update_data["transfer_account_id"] = None

        updated = await self.tx_repo.update(tx, update_data)
        await self.session.commit()
        await self.session.refresh(updated)
        return TransactionResponse.model_validate(updated)

    async def delete_transaction(self, tx_id: str, user_id: str) -> bool:
        tx = await self.tx_repo.get_by_id(tx_id)
        if not tx or tx.user_id != user_id:
            raise EntityNotFoundException("Transaction", tx_id)

        amt = Decimal(str(tx.amount))
        account = await self.account_repo.get_by_id(tx.account_id)
        if account:
            if tx.transaction_type == TransactionType.INCOME:
                account.current_balance = Decimal(str(account.current_balance)) - amt
            elif tx.transaction_type == TransactionType.EXPENSE:
                account.current_balance = Decimal(str(account.current_balance)) + amt
            elif tx.transaction_type == TransactionType.TRANSFER:
                account.current_balance = Decimal(str(account.current_balance)) + amt
                if tx.transfer_account_id:
                    dest_acc = await self.account_repo.get_by_id(tx.transfer_account_id)
                    if dest_acc:
                        dest_acc.current_balance = Decimal(str(dest_acc.current_balance)) - amt

        await self.tx_repo.delete(tx)
        await self.session.commit()
        return True
