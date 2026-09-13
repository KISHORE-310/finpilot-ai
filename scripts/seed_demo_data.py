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
from app.db.models.income import Income, IncomeFrequency
from app.db.models.expense import Expense, ExpenseFrequency
from app.db.models.investment import Investment, InvestmentTransaction, AssetClass, InvestmentTxType
from app.db.models.goal import FinancialGoal, GoalStatus
from app.db.models.budget import Budget, BudgetPeriod
from app.db.models.recurring import RecurringTransaction, RecurrenceInterval

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
                hashed_password=get_password_hash("Password123!"),
                full_name="Alex Morgan",
                currency_preference="USD",
                is_active=True,
                is_verified=True,
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
            ("Primary Checking", AccountType.CHECKING, "Chase Bank", "USD", Decimal("8450.00"), "1001"),
            ("High Yield Savings", AccountType.SAVINGS, "Marcus by Goldman Sachs", "USD", Decimal("35200.00"), "2045"),
            ("Brokerage Portfolio", AccountType.INVESTMENT, "Vanguard", "USD", Decimal("78500.00"), "8891"),
            ("Sapphire Credit Card", AccountType.CREDIT_CARD, "Chase Bank", "USD", Decimal("1240.50"), "4412"),
            ("Cash Wallet", AccountType.CASH, "Physical Cash", "USD", Decimal("350.00"), None),
        ]

        acc_map = {}
        for name, acc_type, inst, curr, bal, num in accounts_data:
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
                    institution_name=inst,
                    currency=curr,
                    current_balance=bal,
                    account_number_mask=num,
                    is_active=True
                )
                db.add(acc)
                await db.flush()
            acc_map[name] = acc

        # 4. Create Income sources
        income_sources = [
            ("Senior Software Architect", Decimal("9500.00"), IncomeFrequency.MONTHLY, acc_map["Primary Checking"], cat_map["Salary"]),
            ("Cloud Consulting Retainer", Decimal("2200.00"), IncomeFrequency.MONTHLY, acc_map["Primary Checking"], cat_map["Freelance & Consulting"]),
            ("Quarterly Portfolio Dividends", Decimal("850.00"), IncomeFrequency.QUARTERLY, acc_map["Brokerage Portfolio"], cat_map["Investment Returns"]),
        ]
        for name, amount, freq, acc, cat in income_sources:
            stmt = select(Income).where(Income.user_id == user_id, Income.source_name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                inc = Income(
                    user_id=user_id,
                    source_name=name,
                    amount=amount,
                    currency="USD",
                    frequency=freq,
                    category_id=cat.id if cat else None,
                    account_id=acc.id if acc else None,
                    start_date=datetime.date(2025, 1, 1),
                    is_active=True
                )
                db.add(inc)

        # 5. Create Fixed Expenses
        fixed_expenses = [
            ("Luxury Apartment Rent", Decimal("2450.00"), ExpenseFrequency.MONTHLY, acc_map["Primary Checking"], cat_map["Housing & Rent"], datetime.date(2025, 1, 1)),
            ("High Speed Fiber Internet", Decimal("85.00"), ExpenseFrequency.MONTHLY, acc_map["Primary Checking"], cat_map["Utilities & Internet"], datetime.date(2025, 1, 5)),
            ("Electricity & Water", Decimal("165.00"), ExpenseFrequency.MONTHLY, acc_map["Primary Checking"], cat_map["Utilities & Internet"], datetime.date(2025, 1, 12)),
            ("Comprehensive Health & Dental", Decimal("320.00"), ExpenseFrequency.MONTHLY, acc_map["Primary Checking"], cat_map["Healthcare & Medical"], datetime.date(2025, 1, 15)),
            ("Cloud Server Subscriptions", Decimal("60.00"), ExpenseFrequency.MONTHLY, acc_map["Sapphire Credit Card"], cat_map["Shopping & Electronics"], datetime.date(2025, 1, 20)),
        ]
        for name, amount, freq, acc, cat, s_date in fixed_expenses:
            stmt = select(Expense).where(Expense.user_id == user_id, Expense.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                exp = Expense(
                    user_id=user_id,
                    name=name,
                    amount=amount,
                    currency="USD",
                    frequency=freq,
                    category_id=cat.id if cat else None,
                    account_id=acc.id if acc else None,
                    due_date=s_date,
                    is_active=True
                )
                db.add(exp)

        # 6. Create Historical Transactions (last 90 days)
        today = datetime.date.today()
        tx_templates = [
            ("Whole Foods Market", Decimal("142.50"), TransactionType.EXPENSE, "Groceries & Food", "Sapphire Credit Card"),
            ("Trader Joe's", Decimal("88.20"), TransactionType.EXPENSE, "Groceries & Food", "Sapphire Credit Card"),
            ("Blue Bottle Coffee", Decimal("7.50"), TransactionType.EXPENSE, "Dining & Restaurants", "Sapphire Credit Card"),
            ("Sweetgreen Lunch", Decimal("18.40"), TransactionType.EXPENSE, "Dining & Restaurants", "Sapphire Credit Card"),
            ("Uber Trip", Decimal("26.80"), TransactionType.EXPENSE, "Transportation & Auto", "Sapphire Credit Card"),
            ("Chevron Gas", Decimal("55.00"), TransactionType.EXPENSE, "Transportation & Auto", "Sapphire Credit Card"),
            ("Netflix & Spotify", Decimal("32.98"), TransactionType.EXPENSE, "Entertainment & Leisure", "Sapphire Credit Card"),
            ("Amazon Marketplace", Decimal("114.20"), TransactionType.EXPENSE, "Shopping & Electronics", "Sapphire Credit Card"),
            ("Apple Store", Decimal("199.00"), TransactionType.EXPENSE, "Shopping & Electronics", "Sapphire Credit Card"),
            ("Delta Air Lines Flight", Decimal("420.00"), TransactionType.EXPENSE, "Travel & Vacations", "Sapphire Credit Card"),
            ("Airbnb Stay", Decimal("340.00"), TransactionType.EXPENSE, "Travel & Vacations", "Sapphire Credit Card"),
            ("Salary Bi-Weekly Direct Deposit", Decimal("4750.00"), TransactionType.INCOME, "Salary", "Primary Checking"),
        ]

        stmt = select(Transaction).where(Transaction.user_id == user_id)
        existing_txs = (await db.execute(stmt)).scalars().all()
        if len(existing_txs) < 20:
            print("Generating 60+ realistic transactions over the last 90 days...")
            for day_offset in range(90, 0, -3):
                tx_date = today - datetime.timedelta(days=day_offset)
                # Biweekly salary
                if day_offset % 14 == 0:
                    tx = Transaction(
                        user_id=user_id,
                        account_id=acc_map["Primary Checking"].id,
                        category_id=cat_map["Salary"].id,
                        amount=Decimal("4750.00"),
                        currency="USD",
                        transaction_type=TransactionType.INCOME,
                        transaction_date=tx_date,
                        description="Acme Corp Bi-Weekly Salary Direct Deposit",
                        merchant_name="Acme Corp",
                        is_cleared=True
                    )
                    db.add(tx)

                # Monthly rent
                if tx_date.day == 1:
                    tx = Transaction(
                        user_id=user_id,
                        account_id=acc_map["Primary Checking"].id,
                        category_id=cat_map["Housing & Rent"].id,
                        amount=Decimal("2450.00"),
                        currency="USD",
                        transaction_type=TransactionType.EXPENSE,
                        transaction_date=tx_date,
                        description="Monthly Apartment Rent",
                        merchant_name="Avalon Properties",
                        is_cleared=True
                    )
                    db.add(tx)

                # 2-3 random expenses
                for _ in range(random.randint(1, 3)):
                    desc, base_amt, ttype, cname, aname = random.choice(tx_templates[:-1])
                    amt_variation = base_amt * Decimal(str(round(random.uniform(0.85, 1.25), 2)))
                    tx = Transaction(
                        user_id=user_id,
                        account_id=acc_map[aname].id,
                        category_id=cat_map[cname].id,
                        amount=round(amt_variation, 2),
                        currency="USD",
                        transaction_type=ttype,
                        transaction_date=tx_date,
                        description=f"{desc} #{random.randint(100, 999)}",
                        merchant_name=desc.split()[0],
                        is_cleared=True
                    )
                    db.add(tx)

        # 7. Create Investments & Holdings
        investments_data = [
            ("Vanguard Total Stock Market ETF", "VTI", AssetClass.ETF, Decimal("120.0000"), Decimal("240.50"), Decimal("275.80"), acc_map["Brokerage Portfolio"]),
            ("Vanguard S&P 500 ETF", "VOO", AssetClass.ETF, Decimal("65.0000"), Decimal("450.00"), Decimal("512.40"), acc_map["Brokerage Portfolio"]),
            ("Apple Inc.", "AAPL", AssetClass.STOCK, Decimal("50.0000"), Decimal("175.20"), Decimal("228.50"), acc_map["Brokerage Portfolio"]),
            ("Microsoft Corp.", "MSFT", AssetClass.STOCK, Decimal("40.0000"), Decimal("380.00"), Decimal("445.10"), acc_map["Brokerage Portfolio"]),
            ("Bitcoin", "BTC", AssetClass.CRYPTO, Decimal("0.3500"), Decimal("58000.00"), Decimal("64200.00"), acc_map["Brokerage Portfolio"]),
            ("Ethereum", "ETH", AssetClass.CRYPTO, Decimal("3.2000"), Decimal("2900.00"), Decimal("3450.00"), acc_map["Brokerage Portfolio"]),
        ]

        for name, ticker, aclass, qty, cost, price, acc in investments_data:
            stmt = select(Investment).where(Investment.user_id == user_id, Investment.symbol == ticker)
            res = await db.execute(stmt)
            inv = res.scalar_one_or_none()
            if not inv:
                inv = Investment(
                    user_id=user_id,
                    account_id=acc.id if acc else None,
                    symbol=ticker,
                    name=name,
                    asset_class=aclass,
                    quantity=qty,
                    cost_basis=cost,
                    current_price=price,
                    currency="USD",
                    is_active=True
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
                    notes="Initial portfolio allocation"
                )
                db.add(itx)

        # 8. Create Financial Goals
        goals_data = [
            ("Emergency Fund 6-Months", Decimal("35000.00"), Decimal("35200.00"), datetime.date(2025, 12, 31), GoalStatus.COMPLETED, "#10B981"),
            ("Tesla Model Y / EV Down Payment", Decimal("15000.00"), Decimal("11400.00"), datetime.date(2026, 6, 30), GoalStatus.IN_PROGRESS, "#3B82F6"),
            ("European Summer Vacation", Decimal("6000.00"), Decimal("3850.00"), datetime.date(2026, 8, 1), GoalStatus.IN_PROGRESS, "#F59E0B"),
            ("Real Estate Down Payment", Decimal("100000.00"), Decimal("42000.00"), datetime.date(2027, 12, 31), GoalStatus.IN_PROGRESS, "#8B5CF6"),
        ]

        for name, target, curr, target_dt, gstatus, color in goals_data:
            stmt = select(FinancialGoal).where(FinancialGoal.user_id == user_id, FinancialGoal.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                goal = FinancialGoal(
                    user_id=user_id,
                    name=name,
                    target_amount=target,
                    current_amount=curr,
                    currency="USD",
                    target_date=target_dt,
                    status=gstatus,
                    color=color,
                    is_active=True
                )
                db.add(goal)

        # 9. Create Budgets
        budgets_data = [
            ("Monthly Groceries Budget", cat_map["Groceries & Food"], Decimal("700.00"), BudgetPeriod.MONTHLY),
            ("Dining & Coffee Budget", cat_map["Dining & Restaurants"], Decimal("450.00"), BudgetPeriod.MONTHLY),
            ("Shopping & Tech Budget", cat_map["Shopping & Electronics"], Decimal("400.00"), BudgetPeriod.MONTHLY),
            ("Entertainment Budget", cat_map["Entertainment & Leisure"], Decimal("250.00"), BudgetPeriod.MONTHLY),
            ("Transportation Budget", cat_map["Transportation & Auto"], Decimal("300.00"), BudgetPeriod.MONTHLY),
        ]

        for name, cat, amount, period in budgets_data:
            stmt = select(Budget).where(Budget.user_id == user_id, Budget.name == name)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                b = Budget(
                    user_id=user_id,
                    category_id=cat.id if cat else None,
                    name=name,
                    amount_limit=amount,
                    period=period,
                    currency="USD",
                    start_date=datetime.date(today.year, today.month, 1),
                    is_active=True
                )
                db.add(b)

        # 10. Create Recurring Transaction Rules
        recurring_data = [
            ("Monthly Rent Auto-Debit", acc_map["Primary Checking"], cat_map["Housing & Rent"], Decimal("2450.00"), TransactionType.EXPENSE, RecurrenceInterval.MONTHLY, datetime.date(2025, 1, 1), 1),
            ("Bi-Weekly Salary", acc_map["Primary Checking"], cat_map["Salary"], Decimal("4750.00"), TransactionType.INCOME, RecurrenceInterval.BIWEEKLY, datetime.date(2025, 1, 10), None),
            ("Internet Bill", acc_map["Primary Checking"], cat_map["Utilities & Internet"], Decimal("85.00"), TransactionType.EXPENSE, RecurrenceInterval.MONTHLY, datetime.date(2025, 1, 5), 5),
        ]

        for desc, acc, cat, amt, ttype, interval, s_date, day_m in recurring_data:
            stmt = select(RecurringTransaction).where(RecurringTransaction.user_id == user_id, RecurringTransaction.description == desc)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                rec = RecurringTransaction(
                    user_id=user_id,
                    account_id=acc.id if acc else None,
                    category_id=cat.id if cat else None,
                    amount=amt,
                    currency="USD",
                    transaction_type=ttype,
                    description=desc,
                    interval=interval,
                    start_date=s_date,
                    day_of_month=day_m,
                    is_active=True
                )
                db.add(rec)

        await db.commit()
        print("Demo seed data successfully created!")
        print("Demo Login: demo@finpilot.ai / Password123!")

if __name__ == "__main__":
    asyncio.run(seed_data())
