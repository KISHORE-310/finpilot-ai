from app.api.routes.auth import router as auth_router
from app.api.routes.accounts import router as accounts_router
from app.api.routes.categories import router as categories_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.income import router as income_router
from app.api.routes.expenses import router as expenses_router
from app.api.routes.investments import router as investments_router
from app.api.routes.goals import router as goals_router
from app.api.routes.budgets import router as budgets_router
from app.api.routes.recurring import router as recurring_router
from app.api.routes.imports import router as imports_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.ai import router as ai_router
from app.api.routes.calculators import router as calculators_router

__all__ = [
    "auth_router",
    "accounts_router",
    "categories_router",
    "transactions_router",
    "income_router",
    "expenses_router",
    "investments_router",
    "goals_router",
    "budgets_router",
    "recurring_router",
    "imports_router",
    "dashboard_router",
    "analytics_router",
    "alerts_router",
    "ai_router",
    "calculators_router",
]
