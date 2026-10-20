import hashlib
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.expense import Expense
from app.db.models.transaction import Transaction, TransactionType
from app.repositories.account_repo import AccountRepository
from app.repositories.expense_repo import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate


def _expense_hash(expense_id: str) -> str:
    """Deterministic hash used to link Expense records to canonical Transactions."""
    return hashlib.sha256(f"expense:{expense_id}".encode("utf-8")).hexdigest()


class ExpenseService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.expense_repo = ExpenseRepository(session)
        self.account_repo = AccountRepository(session)

    async def get_expenses(self, user_id: str) -> List[ExpenseResponse]:
        records = await self.expense_repo.get_by_user(user_id)
        return [ExpenseResponse.model_validate(r) for r in records]

    async def get_expense(self, id: str, user_id: str) -> ExpenseResponse:
        exp = await self.expense_repo.get_by_id_and_user(id, user_id)
        if not exp:
            raise EntityNotFoundException("Expense", id)
        return ExpenseResponse.model_validate(exp)

    async def create_expense(self, user_id: str, expense_in: ExpenseCreate) -> ExpenseResponse:
        account = None
        if expense_in.account_id:
            account = await self.account_repo.get_by_id(expense_in.account_id)
            if not account or account.user_id != user_id:
                raise EntityNotFoundException("Account", expense_in.account_id)

        exp_dict = expense_in.model_dump()
        exp_dict["user_id"] = user_id
        exp = await self.expense_repo.create(exp_dict)

        if account:
            # Atomic balance update on source account
            amt = Decimal(str(exp.amount))
            account.current_balance = Decimal(str(account.current_balance)) - amt
            await self.account_repo.update(account, {"current_balance": account.current_balance})

            # Create canonical double-entry ledger Transaction record
            desc = exp.name or exp.description or "Expense"
            tx = Transaction(
                user_id=user_id,
                account_id=account.id,
                category_id=exp.category_id,
                amount=amt,
                currency=exp.currency or account.currency or "INR",
                transaction_type=TransactionType.EXPENSE,
                transaction_date=exp.date,
                description=desc,
                is_cleared=True,
                import_hash=_expense_hash(exp.id),
                notes=f"Auto-synced from Expense record {exp.id}",
            )
            self.session.add(tx)
            await self.session.flush()

        return ExpenseResponse.model_validate(exp)

    async def update_expense(self, id: str, user_id: str, expense_in: ExpenseUpdate) -> ExpenseResponse:
        exp = await self.expense_repo.get_by_id_and_user(id, user_id)
        if not exp:
            raise EntityNotFoundException("Expense", id)

        old_amount = Decimal(str(exp.amount))
        old_account_id = exp.account_id

        update_data = expense_in.model_dump(exclude_unset=True)

        new_account_id = update_data.get("account_id", old_account_id)
        if "account_id" in update_data and new_account_id:
            new_acc_obj = await self.account_repo.get_by_id(new_account_id)
            if not new_acc_obj or new_acc_obj.user_id != user_id:
                raise EntityNotFoundException("Account", new_account_id)

        updated = await self.expense_repo.update(exp, update_data)
        new_amount = Decimal(str(updated.amount))

        # Re-sync account balances when amount or account changed
        if "amount" in update_data or "account_id" in update_data:
            if old_account_id:
                old_acc = await self.account_repo.get_by_id(old_account_id)
                if old_acc:
                    old_acc.current_balance = Decimal(str(old_acc.current_balance)) + old_amount
                    await self.account_repo.update(old_acc, {"current_balance": old_acc.current_balance})
            if new_account_id:
                new_acc = await self.account_repo.get_by_id(new_account_id)
                if new_acc:
                    new_acc.current_balance = Decimal(str(new_acc.current_balance)) - new_amount
                    await self.account_repo.update(new_acc, {"current_balance": new_acc.current_balance})

        # Re-sync linked canonical Transaction
        tx_hash = _expense_hash(id)
        stmt = select(Transaction).where(Transaction.user_id == user_id, Transaction.import_hash == tx_hash)
        tx_res = await self.session.execute(stmt)
        linked_tx = tx_res.scalar_one_or_none()

        desc = updated.name or updated.description or "Expense"

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
                    transaction_type=TransactionType.EXPENSE,
                    transaction_date=updated.date,
                    description=desc,
                    is_cleared=True,
                    import_hash=tx_hash,
                    notes=f"Auto-synced from Expense record {updated.id}",
                )
                self.session.add(linked_tx)
        else:
            if linked_tx:
                await self.session.delete(linked_tx)

        await self.session.flush()
        return ExpenseResponse.model_validate(updated)

    async def delete_expense(self, id: str, user_id: str) -> bool:
        exp = await self.expense_repo.get_by_id_and_user(id, user_id)
        if not exp:
            raise EntityNotFoundException("Expense", id)

        # Remove linked canonical Transaction
        tx_hash = _expense_hash(id)
        stmt = select(Transaction).where(Transaction.user_id == user_id, Transaction.import_hash == tx_hash)
        tx_res = await self.session.execute(stmt)
        linked_tx = tx_res.scalar_one_or_none()
        if linked_tx:
            await self.session.delete(linked_tx)

        if exp.account_id:
            account = await self.account_repo.get_by_id(exp.account_id)
            if account:
                account.current_balance = Decimal(str(account.current_balance)) + Decimal(str(exp.amount))
                await self.account_repo.update(account, {"current_balance": account.current_balance})

        res = await self.expense_repo.delete(exp)
        await self.session.flush()
        return res

    async def backfill_canonical_transactions(self, user_id: Optional[str] = None) -> int:
        """
        Safely and idempotently backfill canonical Transactions for existing Expense records
        WITHOUT reapplying historical balance effects to the accounts.
        """
        if user_id:
            records = await self.expense_repo.get_by_user(user_id)
        else:
            stmt = select(Expense)
            res = await self.session.execute(stmt)
            records = list(res.scalars().all())

        backfilled_count = 0
        for record in records:
            if not record.account_id:
                continue
            account = await self.account_repo.get_by_id(record.account_id)
            if not account or account.user_id != record.user_id:
                continue
            tx_hash = _expense_hash(record.id)
            existing_stmt = select(Transaction).where(
                Transaction.user_id == record.user_id,
                Transaction.import_hash == tx_hash
            )
            existing_res = await self.session.execute(existing_stmt)
            if existing_res.scalar_one_or_none() is not None:
                continue

            desc = record.name or record.description or "Expense"
            tx = Transaction(
                user_id=record.user_id,
                account_id=record.account_id,
                category_id=record.category_id,
                amount=Decimal(str(record.amount)),
                currency=record.currency or account.currency or "INR",
                transaction_type=TransactionType.EXPENSE,
                transaction_date=record.date,
                description=desc,
                is_cleared=True,
                import_hash=tx_hash,
                notes=f"Backfilled from Expense record {record.id}",
            )
            self.session.add(tx)
            backfilled_count += 1

        if backfilled_count > 0:
            await self.session.flush()
        return backfilled_count
