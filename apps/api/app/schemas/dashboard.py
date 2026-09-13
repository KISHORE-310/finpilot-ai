from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.schemas.account import NetWorthSummary
from app.schemas.goal import GoalResponse
from app.schemas.transaction import TransactionResponse


class MonthlyCashflow(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    net_savings: Decimal


class DashboardSummary(BaseModel):
    total_balance: Decimal
    total_income: Decimal
    total_expenses: Decimal
    net_worth: Decimal
    total_investments: Decimal
    total_transactions: int
    active_goals_count: int
    recent_transactions: List[TransactionResponse]
    top_goals: List[GoalResponse]
    cashflow_trends: List[MonthlyCashflow]


class DashboardOverview(BaseModel):
    net_worth: NetWorthSummary
    total_income_period: str
    total_expenses_period: str
    net_savings_period: str
    savings_rate_percent: str
    period_days: int
    cashflow_trend: List[Dict[str, str]]
    category_spend: List[Dict[str, Any]]
    active_goals: List[GoalResponse]
    recent_transactions: List[TransactionResponse]
