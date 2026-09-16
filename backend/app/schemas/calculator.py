from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal


# --- Tax Calculator Schemas ---
class TaxCalculatorRequest(BaseModel):
    financial_year: str = Field("2024-25", description="Financial Year, e.g. 2024-25 or 2025-26")
    gross_annual_income: Decimal = Field(..., ge=0, description="Gross total annual salary/income in ₹")
    basic_salary: Optional[Decimal] = Field(None, ge=0, description="Basic salary for HRA calculation")
    hra_received: Decimal = Field(Decimal("0.00"), ge=0, description="HRA component received in ₹")
    rent_paid_annual: Decimal = Field(Decimal("0.00"), ge=0, description="Total annual rent paid in ₹")
    is_metro_city: bool = Field(True, description="Whether living in metro city (Delhi, Mumbai, Kolkata, Chennai) for 50% basic HRA rule")
    
    # Old Regime Deductions
    section_80c: Decimal = Field(Decimal("0.00"), ge=0, le=150000, description="80C deductions (EPF, PPF, ELSS, Life Insurance) max ₹1.5L")
    section_80d: Decimal = Field(Decimal("0.00"), ge=0, le=100000, description="80D Health Insurance premium (Self + Parents)")
    section_80ccd_1b: Decimal = Field(Decimal("0.00"), ge=0, le=50000, description="NPS Additional voluntary contribution max ₹50k")
    home_loan_interest_24b: Decimal = Field(Decimal("0.00"), ge=0, le=200000, description="Self-occupied home loan interest deduction max ₹2L")
    other_exemptions: Decimal = Field(Decimal("0.00"), ge=0, description="Other Chapter VI-A deductions (80E, 80G, 80TTA)")


class TaxRegimeBreakdown(BaseModel):
    gross_income: Decimal
    total_deductions_exemptions: Decimal
    standard_deduction: Decimal
    taxable_income: Decimal
    slab_tax: Decimal
    rebate_87a: Decimal
    tax_after_rebate: Decimal
    health_education_cess_4pct: Decimal
    total_tax_liability: Decimal
    effective_tax_rate_pct: Decimal
    monthly_take_home_pay: Decimal


class TaxCalculatorResponse(BaseModel):
    financial_year: str
    recommended_regime: str  # "NEW" or "OLD"
    tax_savings_with_recommended: Decimal
    new_regime: TaxRegimeBreakdown
    old_regime: TaxRegimeBreakdown
    summary_insight: str


# --- FIRE & SIP Simulator Schemas ---
class FIRECalculatorRequest(BaseModel):
    current_age: int = Field(28, ge=18, le=90, description="Current age in years")
    target_retirement_age: int = Field(45, ge=20, le=90, description="Target retirement age in years")
    life_expectancy_age: int = Field(85, ge=50, le=110, description="Assumed life expectancy in years")
    
    current_annual_expenses: Decimal = Field(..., ge=0, description="Current yearly expenses in ₹")
    current_invested_net_worth: Decimal = Field(Decimal("0.00"), ge=0, description="Current liquid/equity investment portfolio in ₹")
    monthly_sip_contribution: Decimal = Field(Decimal("0.00"), ge=0, description="Current monthly SIP / investment amount in ₹")
    annual_sip_step_up_pct: Decimal = Field(Decimal("10.00"), ge=0, le=100, description="Expected annual increment in SIP amount (%)")
    
    expected_inflation_pct: Decimal = Field(Decimal("6.00"), ge=0, le=20, description="Expected long-term inflation rate (%)")
    pre_retirement_return_pct: Decimal = Field(Decimal("12.00"), ge=0, le=30, description="Expected annual portfolio return before retirement (%)")
    post_retirement_return_pct: Decimal = Field(Decimal("8.00"), ge=0, le=25, description="Expected annual portfolio return post retirement (%)")
    safe_withdrawal_rate_pct: Decimal = Field(Decimal("3.50"), ge=1, le=10, description="Safe withdrawal rate (SWR, typically 3.5% - 4%)")


class YearlyGrowthRow(BaseModel):
    year_index: int
    age: int
    annual_investment: Decimal
    portfolio_value: Decimal
    annual_expenses_inflated: Decimal
    is_fire_achieved: bool


class FIRECalculatorResponse(BaseModel):
    years_to_target_age: int
    future_annual_expense_at_fire: Decimal
    standard_fire_target_corpus: Decimal
    lean_fire_target_corpus: Decimal
    fat_fire_target_corpus: Decimal
    coast_fire_target_corpus: Decimal
    projected_corpus_at_target_age: Decimal
    is_on_track_at_target_age: bool
    corpus_shortfall_or_surplus: Decimal
    recommended_monthly_sip: Decimal
    estimated_fire_age: Optional[int]
    trajectory_sample: List[YearlyGrowthRow]
    summary_insight: str


# --- Loan Prepayment Schemas ---
class LoanPrepaymentRequest(BaseModel):
    loan_principal: Decimal = Field(..., gt=0, description="Initial or remaining loan principal amount in ₹")
    annual_interest_rate_pct: Decimal = Field(..., gt=0, le=40, description="Annual interest rate (e.g. 8.5%)")
    loan_tenure_years: int = Field(..., gt=0, le=40, description="Loan tenure in years")
    extra_monthly_payment: Decimal = Field(Decimal("0.00"), ge=0, description="Extra payment made every month in ₹")
    annual_lump_sum_prepayment: Decimal = Field(Decimal("0.00"), ge=0, description="Lump-sum payment made at the end of every year in ₹")


class LoanPrepaymentResponse(BaseModel):
    standard_monthly_emi: Decimal
    standard_total_interest: Decimal
    standard_total_payment: Decimal
    standard_tenure_months: int
    
    with_prepayment_total_interest: Decimal
    with_prepayment_total_payment: Decimal
    with_prepayment_tenure_months: int
    
    total_interest_saved: Decimal
    tenure_reduction_months: int
    tenure_reduction_years: Decimal
    summary_insight: str
