import hashlib
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.income import Income
from app.db.models.transaction import Transaction, TransactionType
from app.repositories.income_repo import IncomeRepository
from app.repositories.account_repo import AccountRepository
from app.schemas.income import IncomeCreate, IncomeResponse, IncomeUpdate


def _income_hash(income_id: str) -> str:
    """Deterministic hash used to link Income records to canonical Transactions."""
    return hashlib.sha256(f"income:{income_id}".encode("utf-8")).hexdigest()


class IncomeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.income_repo = IncomeRepository(session)
        self.account_repo = AccountRepository(session)

    async def get_income_records(self, user_id: str, is_active: Optional[bool] = None) -> List[IncomeResponse]:
        records = await self.income_repo.get_by_user(user_id)
        return [IncomeResponse.model_validate(r) for r in records]

    async def get_income(self, income_id: str, user_id: str) -> IncomeResponse:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)
        return IncomeResponse.model_validate(record)

    async def create_income(self, user_id: str, income_in: IncomeCreate) -> IncomeResponse:
        account = None
        if income_in.account_id:
            account = await self.account_repo.get_by_id(income_in.account_id)
            if not account or account.user_id != user_id:
                raise EntityNotFoundException("Account", income_in.account_id)

        income_dict = income_in.model_dump()
        income_dict["user_id"] = user_id
        record = await self.income_repo.create(income_dict)

        if account:
            # Atomic balance update on target account
            amt = Decimal(str(record.amount))
            account.current_balance = Decimal(str(account.current_balance)) + amt
            await self.account_repo.update(account, {"current_balance": account.current_balance})

            # Create canonical double-entry ledger Transaction record
            src_val = record.source.value if hasattr(record.source, "value") else str(record.source)
            desc = record.description or f"Income: {src_val.title()}"
            tx = Transaction(
                user_id=user_id,
                account_id=account.id,
                category_id=record.category_id,
                amount=amt,
                currency=record.currency or account.currency or "INR",
                transaction_type=TransactionType.INCOME,
                transaction_date=record.date,
                description=desc,
                is_cleared=True,
                import_hash=_income_hash(record.id),
                notes=f"Auto-synced from Income record {record.id}",
            )
            self.session.add(tx)
            await self.session.flush()

        return IncomeResponse.model_validate(record)

    async def update_income(
        self, income_id: str, user_id: str, income_in: IncomeUpdate
    ) -> IncomeResponse:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)

        old_amount = Decimal(str(record.amount))
        old_account_id = record.account_id

        update_data = income_in.model_dump(exclude_unset=True)

        new_account_id = update_data.get("account_id", old_account_id)
        if "account_id" in update_data and new_account_id:
            new_acc_obj = await self.account_repo.get_by_id(new_account_id)
            if not new_acc_obj or new_acc_obj.user_id != user_id:
                raise EntityNotFoundException("Account", new_account_id)

        updated = await self.income_repo.update(record, update_data)
        new_amount = Decimal(str(updated.amount))

        # Re-sync account balances when amount or account changed
        if "amount" in update_data or "account_id" in update_data:
            if old_account_id:
                old_acc = await self.account_repo.get_by_id(old_account_id)
                if old_acc:
                    old_acc.current_balance = Decimal(str(old_acc.current_balance)) - old_amount
                    await self.account_repo.update(old_acc, {"current_balance": old_acc.current_balance})
            if new_account_id:
                new_acc = await self.account_repo.get_by_id(new_account_id)
                if new_acc:
                    new_acc.current_balance = Decimal(str(new_acc.current_balance)) + new_amount
                    await self.account_repo.update(new_acc, {"current_balance": new_acc.current_balance})

        # Re-sync linked canonical Transaction
        tx_hash = _income_hash(income_id)
        stmt = select(Transaction).where(Transaction.user_id == user_id, Transaction.import_hash == tx_hash)
        tx_res = await self.session.execute(stmt)
        linked_tx = tx_res.scalar_one_or_none()

        src_val = updated.source.value if hasattr(updated.source, "value") else str(updated.source)
        desc = updated.description or f"Income: {src_val.title()}"

        if new_account_id:
            if linked_tx:
                linked_tx.account_id = new_account_id
                linked_tx.amount = new_amount
                linked_tx.transaction_date = updated.date
                linked_tx.category_id = updated.category_id
                linked_tx.description = desc
                linked_tx.currency = updated.currency or linked_tx.currency
            else:
                linked_tx = Transaction(
                    user_id=user_id,
                    account_id=new_account_id,
                    category_id=updated.category_id,
                    amount=new_amount,
                    currency=updated.currency or "INR",
                    transaction_type=TransactionType.INCOME,
                    transaction_date=updated.date,
                    description=desc,
                    is_cleared=True,
                    import_hash=tx_hash,
                    notes=f"Auto-synced from Income record {updated.id}",
                )
                self.session.add(linked_tx)
        else:
            if linked_tx:
                await self.session.delete(linked_tx)

        await self.session.flush()
        return IncomeResponse.model_validate(updated)

    async def delete_income(self, income_id: str, user_id: str) -> bool:
        record = await self.income_repo.get_by_id(income_id)
        if not record or record.user_id != user_id:
            raise EntityNotFoundException("Income", income_id)

        # Remove linked canonical Transaction
        tx_hash = _income_hash(income_id)
        stmt = select(Transaction).where(Transaction.user_id == user_id, Transaction.import_hash == tx_hash)
        tx_res = await self.session.execute(stmt)
        linked_tx = tx_res.scalar_one_or_none()
        if linked_tx:
            await self.session.delete(linked_tx)

        if record.account_id:
            account = await self.account_repo.get_by_id(record.account_id)
            if account:
                account.current_balance = Decimal(str(account.current_balance)) - Decimal(str(record.amount))
                await self.account_repo.update(account, {"current_balance": account.current_balance})

        res = await self.income_repo.delete(record)
        await self.session.flush()
        return res

    async def backfill_canonical_transactions(self, user_id: Optional[str] = None) -> int:
        """
        Safely and idempotently backfill canonical Transactions for existing Income records
        WITHOUT reapplying historical balance effects to the accounts.
        """
        if user_id:
            records = await self.income_repo.get_by_user(user_id)
        else:
            stmt = select(Income)
            res = await self.session.execute(stmt)
            records = list(res.scalars().all())

        backfilled_count = 0
        for record in records:
            if not record.account_id:
                continue
            account = await self.account_repo.get_by_id(record.account_id)
            if not account or account.user_id != record.user_id:
                continue
            tx_hash = _income_hash(record.id)
            existing_stmt = select(Transaction).where(
                Transaction.user_id == record.user_id,
                Transaction.import_hash == tx_hash
            )
            existing_res = await self.session.execute(existing_stmt)
            if existing_res.scalar_one_or_none() is not None:
                continue

            src_val = record.source.value if hasattr(record.source, "value") else str(record.source)
            desc = record.description or f"Income: {src_val.title()}"
            tx = Transaction(
                user_id=record.user_id,
                account_id=record.account_id,
                category_id=record.category_id,
                amount=Decimal(str(record.amount)),
                currency=record.currency or account.currency or "INR",
                transaction_type=TransactionType.INCOME,
                transaction_date=record.date,
                description=desc,
                is_cleared=True,
                import_hash=tx_hash,
                notes=f"Backfilled from Income record {record.id}",
            )
            self.session.add(tx)
            backfilled_count += 1

        if backfilled_count > 0:
            await self.session.flush()
        return backfilled_count
