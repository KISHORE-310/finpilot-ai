from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.services.analytics import (
    get_period_dates,
    CashFlowAnalyticsService,
    SpendingAnalyticsService,
    IncomeAnalyticsService,
    BudgetAnalyticsService,
    GoalAnalyticsService,
    InvestmentAnalyticsService,
    NetWorthAnalyticsService,
    AnomalyDetectionService,
    FinancialHealthService,
    InsightsEngineService,
    AnalyticsCoordinatorService,
)
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CashFlowResponse,
    SpendingBreakdownResponse,
    MerchantSpendingResponse,
    LargestTransactionsResponse,
    RecurringAnalysisResponse,
    BudgetAnalyticsResponse,
    GoalAnalyticsResponse,
    IncomeAnalyticsResponse,
    InvestmentAnalyticsResponse,
    NetWorthAnalyticsResponse,
    NetWorthSnapshotPoint,
    AnomalyResponse,
    FinancialHealthResponse,
    InsightsResponse,
)

router = APIRouter(prefix="/analytics", tags=["Financial Analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    period: str = Query("this_month", description="Period preset: this_month, last_month, last_3_months, last_6_months, this_year, last_year, custom"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsCoordinatorService(db)
    return await service.get_overview(
        user_id=str(current_user.id),
        period=period,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/cash-flow", response_model=CashFlowResponse)
async def get_cash_flow(
    period: str = Query("this_month"),
    granularity: str = Query("monthly", description="daily, weekly, monthly"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, _, _ = get_period_dates(period, start_date, end_date)
    service = CashFlowAnalyticsService(db)
    return await service.get_cash_flow(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
        granularity=granularity,
    )


@router.get("/spending/categories", response_model=SpendingBreakdownResponse)
async def get_spending_categories(
    period: str = Query("this_month"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, prev_s, prev_e = get_period_dates(period, start_date, end_date)
    service = SpendingAnalyticsService(db)
    return await service.get_category_spending(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
        prev_start_date=prev_s,
        prev_end_date=prev_e,
    )


@router.get("/spending/merchants", response_model=MerchantSpendingResponse)
async def get_spending_merchants(
    period: str = Query("this_month"),
    limit: int = Query(10, ge=1, le=50),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, _, _ = get_period_dates(period, start_date, end_date)
    service = SpendingAnalyticsService(db)
    return await service.get_merchant_spending(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
        limit=limit,
    )


@router.get("/spending/largest", response_model=LargestTransactionsResponse)
async def get_largest_transactions(
    period: str = Query("this_month"),
    limit: int = Query(10, ge=1, le=50),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, _, _ = get_period_dates(period, start_date, end_date)
    service = SpendingAnalyticsService(db)
    return await service.get_largest_transactions(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
        limit=limit,
    )


@router.get("/spending/recurring", response_model=RecurringAnalysisResponse)
async def get_recurring_analysis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpendingAnalyticsService(db)
    return await service.get_recurring_analysis(user_id=str(current_user.id))


@router.get("/budgets", response_model=BudgetAnalyticsResponse)
async def get_budget_analytics(
    period: str = Query("this_month", description="Period preset: this_month, last_month, last_3_months, last_6_months, this_year, last_year, custom"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, _, _ = get_period_dates(period, start_date, end_date)
    service = BudgetAnalyticsService(db)
    return await service.get_budget_analytics(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
    )


@router.get("/goals", response_model=GoalAnalyticsResponse)
async def get_goal_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GoalAnalyticsService(db)
    return await service.get_goal_analytics(user_id=str(current_user.id))


@router.get("/income", response_model=IncomeAnalyticsResponse)
async def get_income_analytics(
    period: str = Query("this_month"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, _, _ = get_period_dates(period, start_date, end_date)
    service = IncomeAnalyticsService(db)
    return await service.get_income_analytics(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
    )


@router.get("/investments", response_model=InvestmentAnalyticsResponse)
async def get_investment_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvestmentAnalyticsService(db)
    return await service.get_investment_analytics(user_id=str(current_user.id))


@router.get("/net-worth", response_model=NetWorthAnalyticsResponse)
async def get_net_worth_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NetWorthAnalyticsService(db)
    return await service.get_net_worth_analytics(user_id=str(current_user.id))


@router.post("/net-worth/snapshot", response_model=NetWorthSnapshotPoint, status_code=status.HTTP_201_CREATED)
async def create_net_worth_snapshot(
    snapshot_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NetWorthAnalyticsService(db)
    return await service.record_snapshot(
        user_id=str(current_user.id),
        snapshot_date=snapshot_date,
    )


@router.get("/anomalies", response_model=AnomalyResponse)
async def get_anomalies(
    period: str = Query("this_month"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, _, _ = get_period_dates(period, start_date, end_date)
    service = AnomalyDetectionService(db)
    return await service.get_anomalies(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
    )


@router.get("/financial-health", response_model=FinancialHealthResponse)
async def get_financial_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FinancialHealthService(db)
    return await service.get_financial_health(user_id=str(current_user.id))


@router.get("/insights", response_model=InsightsResponse)
async def get_financial_insights(
    period: str = Query("this_month"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d, prev_s, prev_e = get_period_dates(period, start_date, end_date)
    service = InsightsEngineService(db)
    return await service.generate_insights(
        user_id=str(current_user.id),
        start_date=start_d,
        end_date=end_d,
        prev_start=prev_s,
        prev_end=prev_e,
    )
