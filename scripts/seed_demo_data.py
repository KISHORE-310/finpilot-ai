import asyncio
import datetime
import random
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.models.user import User
from app.db.models.account import Account, AccountType
from app.db.models.category import Category, CategoryType
from app.db.models.transaction import Transaction, TransactionType
from app.db.models.income import Income, IncomeSource
from app.db.models.expense import Expense
from app.db.models.investment import Investment, AssetType
from app.db.models.investment_transaction import InvestmentTransaction, InvestmentTxType
from app.db.models.goal import FinancialGoal, GoalStatus, GoalType
from app.db.models.budget import Budget, BudgetPeriod
from app.db.models.recurring_transaction import RecurringTransaction, Frequency


async def seed_data():
    print(f"Connecting to database: {settings.DATABASE_URL}...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    # Create all tables directly if not using alembic
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Database schema ensured.")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # 1. Check or create demo user
        stmt = select(User).where(User.email == "demo@finpilot.ai")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            print("Creating demo user: demo@finpilot.ai / Password123!")
            user = User(
                email="demo@finpilot.ai",
                password_hash=get_password_hash("Password123!"),
                name="Aarav Sharma",
                is_active=True,
            )
            db.add(user)
            await db.flush()
        else:
            print(f"Demo user already exists: {user.email}")

        user_id = user.id

        # 2. Check or create default categories
        categories_data = [
            ("Salary", CategoryType.INCOME, "Briefcase", "#10B981"),
            ("Bonus & Incentives", CategoryType.INCOME, "Sparkles", "#059669"),
            ("Investment Returns", CategoryType.INCOME, "TrendingUp", "#34D399"),
            ("Freelance & Consulting", CategoryType.INCOME, "Laptop", "#6EE7B7"),
            ("Housing & Rent", CategoryType.EXPENSE, "Home", "#EF4444"),
            ("Groceries & Food", CategoryType.EXPENSE, "ShoppingCart", "#F97316"),
            ("Dining & Restaurants", CategoryType.EXPENSE, "Utensils", "#F59E0B"),
            ("Transportation & Auto", CategoryType.EXPENSE, "Car", "#84CC16"),
            ("Utilities & Internet", CategoryType.EXPENSE, "Zap", "#06B6D4"),
            ("Healthcare & Medical", CategoryType.EXPENSE, "HeartPulse", "#3B82F6"),
            ("Entertainment & Leisure", CategoryType.EXPENSE, "Film", "#8B5CF6"),
            ("Shopping & Electronics", CategoryType.EXPENSE, "ShoppingBag", "#EC4899"),
            ("Travel & Vacations", CategoryType.EXPENSE, "Plane", "#14B8A6"),
            ("Investments & Wealth", CategoryType.TRANSFER, "PiggyBank", "#6366F1"),
        ]

        cat_map = {}
        for name, c_type, icon, color in categories_data:
            stmt = select(Category).where(
                Category.user_id == user_id,
                Category.name == name
            )
            res = await db.execute(stmt)
            cat = res.scalar_one_or_none()
            if not cat:
                cat = Category(
                    user_id=user_id,
                    name=name,
                    category_type=c_type,
                    icon=icon,
                    color=color,
                    is_system=True
                )
                db.add(cat)
                await db.flush()
            cat_map[name] = cat

        # 3. Create Accounts
        accounts_data = [
            ("Primary Savings & Salary", AccountType.CHECKING, "HDFC Bank", "INR", Decimal("212500.00")),
            ("Money Market Savings", AccountType.SAVINGS, "State Bank of India", "INR", Decimal("412000.00")),
            ("Brokerage Demat", AccountType.INVESTMENT, "Zerodha", "INR", Decimal("845000.00")),
            ("Titan Credit Card", AccountType.CREDIT_CARD, "ICICI Bank", "INR", Decimal("-41250.50")),
            ("Cash Wallet", AccountType.CASH, "Physical Cash", "INR", Decimal("8500.00")),
        ]

        acc_map = {}
        for name, acc_type, inst, curr, bal in accounts_data:
            stmt = select(Account).where(
                Account.user_id == user_id,
                Account.name == name
            )
            res = await db.execute(stmt)
            acc = res.scalar_one_or_none()
            if not acc:
                acc = Account(
                    user_id=user_id,
                    name=name,
                    account_type=acc_type,
                    institution=inst,
                    currency=curr,
                    current_balance=bal,
                    is_active=True
                )
                db.add(acc)
                await db.flush()
            acc_map[name] = acc

        # 4. Create Income sources
        today = datetime.date.today()
        income_sources = [
            ("Senior Software Engineer", IncomeSource.SALARY, Decimal("250000.00"), True),
            ("Freelance Consulting Retainer", IncomeSource.FREELANCE, Decimal("45000.00"), True),
            ("Monthly Dividend Payout", IncomeSource.INVESTMENTS, Decimal("8000.00"), True),
        ]
        for name, source, amount, is_recurring in income_sources:
            stmt = select(Income).where(Income.user_id == user_id, Income.description == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                inc = Income(
                    user_id=user_id,
                    source=source,
                    amount=amount,
                    currency="INR",
                    is_recurring=is_recurring,
                    date=today.replace(day=1),
                    description=name,
                    category_id=cat_map["Salary"].id,
                    account_id=acc_map["Primary Savings & Salary"].id,
                )
                db.add(inc)

        # 5. Create Fixed Expenses
        fixed_expenses = [
            ("2BHK Apartment Rent", Decimal("45000.00"), cat_map["Housing & Rent"].id),
            ("Fiber Broadband + IPTV", Decimal("1500.00"), cat_map["Utilities & Internet"].id),
            ("Electricity & Water Bill", Decimal("3800.00"), cat_map["Utilities & Internet"].id),
            ("Family Health Insurance", Decimal("8000.00"), cat_map["Healthcare & Medical"].id),
            ("Cloud & OTT Subscriptions", Decimal("2000.00"), cat_map["Shopping & Electronics"].id),
        ]
        for name, amount, cat_id in fixed_expenses:
            stmt = select(Expense).where(Expense.user_id == user_id, Expense.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                exp = Expense(
                    user_id=user_id,
                    name=name,
                    amount=amount,
                    currency="INR",
                    is_recurring=True,
                    date=today.replace(day=1),
                    description=name,
                    category_id=cat_id,
                )
                db.add(exp)

        # 6. Create Historical Transactions (last 90 days)
        tx_templates = [
            ("BigBasket Weekly Groceries", Decimal("2450.00"), TransactionType.EXPENSE, "Groceries & Food", "Titan Credit Card"),
            ("Swiggy Weekend Kitchen", Decimal("820.00"), TransactionType.EXPENSE, "Dining & Restaurants", "Titan Credit Card"),
            ("Zomato Lunch", Decimal("460.00"), TransactionType.EXPENSE, "Dining & Restaurants", "Titan Credit Card"),
            ("Amazon India Gadgets", Decimal("4750.00"), TransactionType.EXPENSE, "Shopping & Electronics", "Titan Credit Card"),
            ("Reliance Digital", Decimal("18990.00"), TransactionType.EXPENSE, "Shopping & Electronics", "Titan Credit Card"),
            ("Indian Oil Petrol", Decimal("1800.00"), TransactionType.EXPENSE, "Transportation & Auto", "Titan Credit Card"),
            ("Uber Ride", Decimal("340.00"), TransactionType.EXPENSE, "Transportation & Auto", "Titan Credit Card"),
            ("Netflix & Spotify India", Decimal("899.00"), TransactionType.EXPENSE, "Entertainment & Leisure", "Titan Credit Card"),
            ("IMAX Movie Night", Decimal("1250.00"), TransactionType.EXPENSE, "Entertainment & Leisure", "Titan Credit Card"),
            ("MakeMyTrip Flight", Decimal("14800.00"), TransactionType.EXPENSE, "Travel & Vacations", "Titan Credit Card"),
            ("OYO Stay", Decimal("4600.00"), TransactionType.EXPENSE, "Travel & Vacations", "Titan Credit Card"),
        ]

        # Salary credits via NEFT / UPI
        stmt = select(Transaction).where(Transaction.user_id == user_id)
        existing_txs = (await db.execute(stmt)).scalars().all()
        if len(existing_txs) < 20:
            print("Generating 60+ realistic transactions over the last 90 days...")
            for day_offset in range(90, 0, -3):
                tx_date = today - datetime.timedelta(days=day_offset)

                # Monthly salary credit
                if tx_date.day == 1:
                    tx = Transaction(
                        user_id=user_id,
                        account_id=acc_map["Primary Savings & Salary"].id,
                        category_id=cat_map["Salary"].id,
                        amount=Decimal("250000.00"),
                        currency="INR",
                        transaction_type=TransactionType.INCOME,
                        transaction_date=tx_date,
                        description="Acme India Pvt Ltd Salary Credit",
                        merchant_name="Acme India Pvt Ltd",
                        is_cleared=True,
                    )
                    db.add(tx)

                # Monthly rent
                if tx_date.day == 3:
                    tx = Transaction(
                        user_id=user_id,
                        account_id=acc_map["Primary Savings & Salary"].id,
                        category_id=cat_map["Housing & Rent"].id,
                        amount=Decimal("45000.00"),
                        currency="INR",
                        transaction_type=TransactionType.EXPENSE,
                        transaction_date=tx_date,
                        description="Monthly House Rent",
                        merchant_name="DLF Residential",
                        is_cleared=True,
                    )
                    db.add(tx)

                # 2-3 random expenses via UPI / Cards
                for _ in range(random.randint(1, 3)):
                    desc, base_amt, ttype, cname, aname = random.choice(tx_templates)
                    amt_variation = base_amt * Decimal(str(round(random.uniform(0.85, 1.25), 2)))
                    tx = Transaction(
                        user_id=user_id,
                        account_id=acc_map[aname].id,
                        category_id=cat_map[cname].id,
                        amount=round(amt_variation, 2),
                        currency="INR",
                        transaction_type=ttype,
                        transaction_date=tx_date,
                        description=f"{desc} #{random.randint(100, 999)}",
                        merchant_name=desc.split()[0],
                        is_cleared=True,
                    )
                    db.add(tx)

        # 7. Create Investments & Holdings
        investments_data = [
            ("NIFTY 50 Index Fund (Direct)", "NIFTY50", AssetType.ETF, Decimal("120.0000"), Decimal("2450.00"), Decimal("3485.50")),
            ("SENSEX Index Fund", "SENSEX", AssetType.ETF, Decimal("65.0000"), Decimal("64250.00"), Decimal("88940.00")),
            ("Reliance Industries Ltd.", "RELIANCE", AssetType.STOCK, Decimal("50.0000"), Decimal("2450.00"), Decimal("3120.85")),
            ("Tata Consultancy Services", "TCS", AssetType.STOCK, Decimal("40.0000"), Decimal("3450.00"), Decimal("4250.10")),
            ("Bitcoin", "BTC", AssetType.CRYPTO, Decimal("0.0825"), Decimal("4200000.00"), Decimal("5250000.00")),
            ("Ethereum", "ETH", AssetType.CRYPTO, Decimal("1.2000"), Decimal("220000.00"), Decimal("285000.00")),
        ]

        for name, ticker, aclass, qty, cost, price in investments_data:
            stmt = select(Investment).where(Investment.user_id == user_id, Investment.symbol == ticker)
            res = await db.execute(stmt)
            inv = res.scalar_one_or_none()
            if not inv:
                inv = Investment(
                    user_id=user_id,
                    account_id=acc_map["Brokerage Demat"].id,
                    symbol=ticker,
                    name=name,
                    asset_type=aclass,
                    quantity=qty,
                    average_cost=cost,
                    current_value=price,
                    currency="INR",
                )
                db.add(inv)
                await db.flush()

                # Add buy transaction
                itx = InvestmentTransaction(
                    investment_id=inv.id,
                    user_id=user_id,
                    transaction_type=InvestmentTxType.BUY,
                    quantity=qty,
                    price_per_unit=cost,
                    total_amount=qty * cost,
                    transaction_date=datetime.date(2024, 6, 15),
                    notes="Initial SIP and lumpsum allocation",
                )
                db.add(itx)

        # 8. Create Financial Goals
        goals_data = [
            ("Emergency Fund 6-Months", GoalType.EMERGENCY_FUND, Decimal("450000.00"), Decimal("412000.00"), datetime.date(2025, 12, 31), GoalStatus.IN_PROGRESS, "#10B981"),
            ("Creta EV Down Payment", GoalType.PURCHASE, Decimal("250000.00"), Decimal("182000.00"), datetime.date(2026, 6, 30), GoalStatus.IN_PROGRESS, "#3B82F6"),
            ("International Vacation - Switzerland", GoalType.SAVINGS, Decimal("600000.00"), Decimal("285000.00"), datetime.date(2026, 8, 1), GoalStatus.IN_PROGRESS, "#F59E0B"),
            ("Home Down Payment", GoalType.PURCHASE, Decimal("2000000.00"), Decimal("845000.00"), datetime.date(2027, 12, 31), GoalStatus.IN_PROGRESS, "#8B5CF6"),
        ]

        for name, gtype, target, curr, target_dt, gstatus, color in goals_data:
            stmt = select(FinancialGoal).where(FinancialGoal.user_id == user_id, FinancialGoal.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                goal = FinancialGoal(
                    user_id=user_id,
                    name=name,
                    goal_type=gtype,
                    target_amount=target,
                    current_amount=curr,
                    currency="INR",
                    target_date=target_dt,
                    status=gstatus,
                    color=color,
                    is_active=True,
                )
                db.add(goal)

        # 9. Create Budgets
        budgets_data = [
            ("Monthly Groceries & Kirana", cat_map["Groceries & Food"], Decimal("12000.00")),
            ("Dining & Swiggy Budget", cat_map["Dining & Restaurants"], Decimal("8000.00")),
            ("Shopping & Electronics", cat_map["Shopping & Electronics"], Decimal("15000.00")),
            ("Entertainment (OTT & Movies)", cat_map["Entertainment & Leisure"], Decimal("5000.00")),
            ("Petrol & Commute", cat_map["Transportation & Auto"], Decimal("6000.00")),
        ]

        for name, cat, amount in budgets_data:
            stmt = select(Budget).where(Budget.user_id == user_id, Budget.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                b = Budget(
                    user_id=user_id,
                    category_id=cat.id,
                    name=name,
                    amount=amount,
                    period=BudgetPeriod.MONTHLY,
                    currency="INR",
                    start_date=datetime.date(today.year, today.month, 1),
                )
                db.add(b)

        # 10. Create Recurring Transaction Rules
        recurring_data = [
            ("Monthly Rent Auto-Debit", acc_map["Primary Savings & Salary"], cat_map["Housing & Rent"], Decimal("45000.00"), TransactionType.EXPENSE, Frequency.MONTHLY),
            ("Monthly Salary Credit", acc_map["Primary Savings & Salary"], cat_map["Salary"], Decimal("250000.00"), TransactionType.INCOME, Frequency.MONTHLY),
            ("Broadband + IPTV", acc_map["Primary Savings & Salary"], cat_map["Utilities & Internet"], Decimal("1500.00"), TransactionType.EXPENSE, Frequency.MONTHLY),
        ]

        for name, acc, cat, amt, ttype, freq in recurring_data:
            stmt = select(RecurringTransaction).where(RecurringTransaction.user_id == user_id, RecurringTransaction.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                rec = RecurringTransaction(
                    user_id=user_id,
                    account_id=acc.id,
                    category_id=cat.id,
                    name=name,
                    amount=amt,
                    transaction_type=ttype,
                    frequency=freq,
                    next_occurrence=today.replace(day=1),
                    is_active=True,
                )
                db.add(rec)

        await db.commit()
        print("Demo seed data successfully created!")
        print("Demo Login: demo@finpilot.ai / Password123!")


if __name__ == "__main__":
    asyncio.run(seed_data())