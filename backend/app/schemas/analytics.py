import enum
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.alert import AlertResponse


class BudgetStatusEnum(str, enum.Enum):
    ON_TRACK = "ON_TRACK"
    WARNING = "WARNING"
    OVER_BUDGET = "OVER_BUDGET"


class GoalStatusEnum(str, enum.Enum):
    ON_TRACK = "ON_TRACK"
    AT_RISK = "AT_RISK"
    BEHIND = "BEHIND"
    COMPLETED = "COMPLETED"


class CashFlowPoint(BaseModel):
    date: str
    income: Decimal = Decimal("0.00")
    expenses: Decimal = Decimal("0.00")
    net: Decimal = Decimal("0.00")
    savings_rate: Decimal = Decimal("0.00")


class CashFlowResponse(BaseModel):
    start_date: date
    end_date: date
    granularity: str
    total_income: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    net_cash_flow: Decimal = Decimal("0.00")
    savings_rate: Decimal = Decimal("0.00")
    historical_avg_savings_rate: Decimal = Decimal("0.00")
    best_month: Optional[str] = None
    worst_month: Optional[str] = None
    points: List[CashFlowPoint] = []


class CategorySpendItem(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    amount: Decimal = Decimal("0.00")
    percentage: Decimal = Decimal("0.00")
    prev_amount: Decimal = Decimal("0.00")
    absolute_change: Decimal = Decimal("0.00")
    percentage_change: Decimal = Decimal("0.00")
    transaction_count: int = 0


class SpendingBreakdownResponse(BaseModel):
    start_date: date
    end_date: date
    total_spending: Decimal = Decimal("0.00")
    prev_total_spending: Decimal = Decimal("0.00")
    total_change_percent: Decimal = Decimal("0.00")
    average_daily_spend: Decimal = Decimal("0.00")
    average_monthly_spend: Decimal = Decimal("0.00")
    categories: List[CategorySpendItem] = []


class MerchantSpendItem(BaseModel):
    merchant_name: str
    total_spent: Decimal = Decimal("0.00")
    transaction_count: int = 0
    average_transaction: Decimal = Decimal("0.00")


class MerchantSpendingResponse(BaseModel):
    total_tracked_spend: Decimal = Decimal("0.00")
    merchants: List[MerchantSpendItem] = []


class LargestTransactionItem(BaseModel):
    id: str
    merchant_name: Optional[str] = None
    description: str
    amount: Decimal = Decimal("0.00")
    transaction_date: date
    category_name: str = "Uncategorized"
    account_name: str = "Account"


class LargestTransactionsResponse(BaseModel):
    transactions: List[LargestTransactionItem] = []


class RecurringExpenseItem(BaseModel):
    id: str
    name: str
    amount: Decimal = Decimal("0.00")
    frequency: str
    annualized_amount: Decimal = Decimal("0.00")
    monthly_equivalent: Decimal = Decimal("0.00")
    next_occurrence: date
    account_name: str = "Account"


class RecurringAnalysisResponse(BaseModel):
    monthly_total: Decimal = Decimal("0.00")
    annual_total: Decimal = Decimal("0.00")
    active_count: int = 0
    items: List[RecurringExpenseItem] = []
    upcoming_30_days: List[RecurringExpenseItem] = []


class BudgetAnalyticsItem(BaseModel):
    id: str
    name: str
    category_name: str
    allocated_amount: Decimal = Decimal("0.00")
    actual_spent: Decimal = Decimal("0.00")
    remaining_amount: Decimal = Decimal("0.00")
    percentage_used: Decimal = Decimal("0.00")
    days_in_period: int = 30
    days_elapsed: int = 0
    days_remaining: int = 0
    projected_spend: Decimal = Decimal("0.00")
    status: BudgetStatusEnum = BudgetStatusEnum.ON_TRACK


class BudgetAnalyticsResponse(BaseModel):
    total_budget: Decimal = Decimal("0.00")
    total_spent: Decimal = Decimal("0.00")
    total_remaining: Decimal = Decimal("0.00")
    overall_utilization: Decimal = Decimal("0.00")
    on_track_count: int = 0
    warning_count: int = 0
    over_budget_count: int = 0
    budgets: List[BudgetAnalyticsItem] = []


class GoalAnalyticsItem(BaseModel):
    id: str
    name: str
    target_amount: Decimal = Decimal("0.00")
    current_amount: Decimal = Decimal("0.00")
    remaining_amount: Decimal = Decimal("0.00")
    completion_percentage: Decimal = Decimal("0.00")
    target_date: Optional[date] = None
    months_remaining: Optional[int] = None
    required_monthly_contribution: Decimal = Decimal("0.00")
    current_monthly_pace: Decimal = Decimal("0.00")
    contribution_gap: Decimal = Decimal("0.00")
    status: GoalStatusEnum = GoalStatusEnum.ON_TRACK


class GoalAnalyticsResponse(BaseModel):
    total_target: Decimal = Decimal("0.00")
    total_saved: Decimal = Decimal("0.00")
    overall_progress: Decimal = Decimal("0.00")
    completed_count: int = 0
    in_progress_count: int = 0
    goals: List[GoalAnalyticsItem] = []


class IncomeSourceItem(BaseModel):
    source: str
    amount: Decimal = Decimal("0.00")
    percentage: Decimal = Decimal("0.00")
    is_recurring: bool = False


class IncomeAnalyticsResponse(BaseModel):
    total_income: Decimal = Decimal("0.00")
    recurring_income: Decimal = Decimal("0.00")
    non_recurring_income: Decimal = Decimal("0.00")
    recurring_percentage: Decimal = Decimal("0.00")
    stability_index: Decimal = Decimal("0.00")
    stability_rating: str = "Moderate"
    sources: List[IncomeSourceItem] = []


class AssetAllocationItem(BaseModel):
    asset_type: str
    current_value: Decimal = Decimal("0.00")
    percentage: Decimal = Decimal("0.00")


class InvestmentAnalyticsResponse(BaseModel):
    total_invested: Decimal = Decimal("0.00")
    current_value: Decimal = Decimal("0.00")
    total_pnl: Decimal = Decimal("0.00")
    pnl_percentage: Decimal = Decimal("0.00")
    positions_count: int = 0
    allocations: List[AssetAllocationItem] = []
    disclaimer: str = "Investment valuations are based on recorded user inputs and do not reflect real-time market feeds."


class AssetLiabilityBreakdown(BaseModel):
    cash: Decimal = Decimal("0.00")
    bank_accounts: Decimal = Decimal("0.00")
    investments: Decimal = Decimal("0.00")
    other_assets: Decimal = Decimal("0.00")
    total_assets: Decimal = Decimal("0.00")

    credit_cards: Decimal = Decimal("0.00")
    loans: Decimal = Decimal("0.00")
    other_liabilities: Decimal = Decimal("0.00")
    total_liabilities: Decimal = Decimal("0.00")

    net_worth: Decimal = Decimal("0.00")


class NetWorthSnapshotPoint(BaseModel):
    snapshot_date: date
    total_assets: Decimal = Decimal("0.00")
    total_liabilities: Decimal = Decimal("0.00")
    net_worth: Decimal = Decimal("0.00")


class NetWorthAnalyticsResponse(BaseModel):
    current: AssetLiabilityBreakdown
    history: List[NetWorthSnapshotPoint] = []
    mom_change: Decimal = Decimal("0.00")
    mom_change_percent: Decimal = Decimal("0.00")


class AnomalyItem(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    description: str
    amount: Decimal = Decimal("0.00")
    typical_amount: Decimal = Decimal("0.00")
    deviation_factor: Decimal = Decimal("0.00")
    date: date
    category_name: Optional[str] = None
    merchant_name: Optional[str] = None


class AnomalyResponse(BaseModel):
    total_anomalies: int = 0
    anomalies: List[AnomalyItem] = []


class HealthScoreDimension(BaseModel):
    name: str
    score: int
    weight: Decimal
    status: str
    description: str


class FinancialHealthResponse(BaseModel):
    overall_score: int
    rating: str
    dimensions: List[HealthScoreDimension] = []
    strengths: List[str] = []
    areas_to_improve: List[str] = []
    methodology_note: str = (
        "Deterministic FinPilot Financial Health Index computed across 6 weighted dimensions. "
        "This score is an analytical indicator and not certified financial or credit rating advice."
    )


class FinancialInsightItem(BaseModel):
    metric: str
    title: str
    description: str
    severity: str
    value: str


class InsightsResponse(BaseModel):
    insights: List[FinancialInsightItem] = []


class AnalyticsOverviewResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    net_worth: AssetLiabilityBreakdown
    cash_flow: CashFlowResponse
    spending: SpendingBreakdownResponse
    budget_summary: BudgetAnalyticsResponse
    goal_summary: GoalAnalyticsResponse
    investment_summary: InvestmentAnalyticsResponse
    financial_health: FinancialHealthResponse
    top_alerts: List[AlertResponse] = []
