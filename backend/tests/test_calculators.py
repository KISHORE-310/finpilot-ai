import pytest
from decimal import Decimal
from httpx import AsyncClient
from app.core.errors import ValidationException
from app.services.calculator_service import CalculatorService
from app.schemas.calculator import (
    TaxCalculatorRequest,
    FIRECalculatorRequest,
    LoanPrepaymentRequest
)


def test_tax_calculator_under_7_5_lakhs_zero_tax_new_regime():
    """Salary of 7.5L has 75k standard deduction -> 6.75L taxable -> 87A rebate gives 0 tax."""
    req = TaxCalculatorRequest(
        financial_year="2024-25",
        gross_annual_income=Decimal("750000.00"),
        section_80c=Decimal("0.00"),
        section_80d=Decimal("0.00"),
    )
    res = CalculatorService.calculate_tax(req)
    assert res.new_regime.total_tax_liability == Decimal("0.00")
    assert res.new_regime.rebate_87a > Decimal("0.00")
    assert res.recommended_regime == "NEW"


def test_tax_calculator_high_deductions_favors_old_regime():
    """With high 80C, 80D, 80CCD, HRA, Old Regime can save tax."""
    req = TaxCalculatorRequest(
        financial_year="2024-25",
        gross_annual_income=Decimal("1500000.00"),
        basic_salary=Decimal("600000.00"),
        hra_received=Decimal("250000.00"),
        rent_paid_annual=Decimal("300000.00"),
        section_80c=Decimal("150000.00"),
        section_80d=Decimal("50000.00"),
        section_80ccd_1b=Decimal("50000.00"),
        home_loan_interest_24b=Decimal("200000.00"),
    )
    res = CalculatorService.calculate_tax(req)
    assert res.old_regime.total_deductions_exemptions > Decimal("700000.00")
    assert res.old_regime.total_tax_liability < res.new_regime.total_tax_liability
    assert res.recommended_regime == "OLD"
    assert res.tax_savings_with_recommended > Decimal("0.00")


def test_tax_calculator_fy_2023_24_slabs_and_rebate():
    """FY 2023-24 (AY 2024-25) has ₹50,000 std deduction and 6 slabs."""
    req = TaxCalculatorRequest(
        financial_year="2023-24",
        gross_annual_income=Decimal("750000.00"),
    )
    res = CalculatorService.calculate_tax(req)
    assert res.financial_year == "2023-24"
    assert res.assessment_year == "2024-25"
    assert res.new_regime.standard_deduction == Decimal("50000.00")
    assert res.new_regime.taxable_income == Decimal("700000.00")
    # For 7L taxable in 2023-24: 0-3L 0, 3-6L 15k, 6-7L 10k -> 25k slab tax
    assert res.new_regime.slab_tax == Decimal("25000.00")
    assert res.new_regime.rebate_87a == Decimal("25000.00")
    assert res.new_regime.total_tax_liability == Decimal("0.00")


def test_tax_calculator_fy_2024_25_revised_slabs():
    """FY 2024-25 (AY 2025-26) has ₹75,000 std deduction and 5 slabs."""
    req = TaxCalculatorRequest(
        financial_year="2024-25",
        gross_annual_income=Decimal("1000000.00"),
    )
    res = CalculatorService.calculate_tax(req)
    assert res.financial_year == "2024-25"
    assert res.assessment_year == "2025-26"
    assert res.new_regime.standard_deduction == Decimal("75000.00")
    # Taxable = 925,000. Slabs: 0-3L 0, 3-7L (4L*5%)=20,000, 7-9.25L (2.25L*10%)=22,500. Total = 42,500 + 4% cess = 44,200.
    assert res.new_regime.taxable_income == Decimal("925000.00")
    assert res.new_regime.slab_tax == Decimal("42500.00")
    assert res.new_regime.health_education_cess_4pct == Decimal("1700.00")
    assert res.new_regime.total_tax_liability == Decimal("44200.00")


def test_tax_calculator_unsupported_year_rejected():
    """Unsupported years must be explicitly rejected with a clear error."""
    req = TaxCalculatorRequest(
        financial_year="2020-21",
        gross_annual_income=Decimal("800000.00"),
    )
    with pytest.raises(ValidationException) as exc_info:
        CalculatorService.calculate_tax(req)
    assert "not supported" in str(exc_info.value.detail)


def test_tax_calculator_zero_income_boundary():
    """Zero gross income yields zero tax across both regimes."""
    req = TaxCalculatorRequest(
        financial_year="2024-25",
        gross_annual_income=Decimal("0.00"),
    )
    res = CalculatorService.calculate_tax(req)
    assert res.new_regime.total_tax_liability == Decimal("0.00")
    assert res.old_regime.total_tax_liability == Decimal("0.00")
    assert res.new_regime.effective_tax_rate_pct == Decimal("0.00")


def test_fire_calculator_math():
    """Verify FIRE corpus target and trajectory projection."""
    req = FIRECalculatorRequest(
        current_age=30,
        target_retirement_age=45,
        current_annual_expenses=Decimal("600000.00"),
        current_invested_net_worth=Decimal("1000000.00"),
        monthly_sip_contribution=Decimal("50000.00"),
        annual_sip_step_up_pct=Decimal("10.00"),
        expected_inflation_pct=Decimal("6.00"),
        pre_retirement_return_pct=Decimal("12.00"),
        safe_withdrawal_rate_pct=Decimal("3.50"),
    )
    res = CalculatorService.calculate_fire(req)
    assert res.years_to_target_age == 15
    assert res.future_annual_expense_at_fire > Decimal("600000.00")
    assert res.standard_fire_target_corpus > res.lean_fire_target_corpus
    assert res.fat_fire_target_corpus > res.standard_fire_target_corpus
    assert res.coast_fire_target_corpus < res.standard_fire_target_corpus
    assert len(res.trajectory_sample) > 0


def test_loan_prepayment_math():
    """Verify Loan EMI calculation and interest reduction with prepayments."""
    req = LoanPrepaymentRequest(
        loan_principal=Decimal("5000000.00"),
        annual_interest_rate_pct=Decimal("8.50"),
        loan_tenure_years=20,
        extra_monthly_payment=Decimal("5000.00"),
        annual_lump_sum_prepayment=Decimal("50000.00"),
    )
    res = CalculatorService.calculate_loan_prepayment(req)
    assert res.standard_monthly_emi > Decimal("40000.00")
    assert res.standard_tenure_months == 240
    assert res.with_prepayment_tenure_months < 240
    assert res.total_interest_saved > Decimal("1000000.00")
    assert res.tenure_reduction_months > 30


@pytest.mark.asyncio
async def test_calculators_api_endpoints(client: AsyncClient, auth_headers: dict):
    # Tax API
    tax_payload = {
        "financial_year": "2024-25",
        "gross_annual_income": 1200000.0,
        "section_80c": 150000.0,
        "section_80d": 25000.0,
    }
    tax_res = await client.post("/api/v1/calculators/tax", json=tax_payload, headers=auth_headers)
    assert tax_res.status_code == 200
    tax_data = tax_res.json()
    assert "recommended_regime" in tax_data
    assert "new_regime" in tax_data
    assert "old_regime" in tax_data
    assert tax_data["assessment_year"] == "2025-26"

    # Unsupported year
    invalid_tax_res = await client.post(
        "/api/v1/calculators/tax",
        json={"financial_year": "1999-00", "gross_annual_income": 500000.0},
        headers=auth_headers
    )
    assert invalid_tax_res.status_code == 400

    # FIRE API
    fire_payload = {
        "current_age": 28,
        "target_retirement_age": 45,
        "current_annual_expenses": 500000.0,
        "current_invested_net_worth": 500000.0,
        "monthly_sip_contribution": 30000.0,
        "annual_sip_step_up_pct": 10.0,
        "expected_inflation_pct": 6.0,
        "pre_retirement_return_pct": 12.0,
        "safe_withdrawal_rate_pct": 3.5
    }
    fire_res = await client.post("/api/v1/calculators/fire", json=fire_payload, headers=auth_headers)
    assert fire_res.status_code == 200
    fire_data = fire_res.json()
    assert "standard_fire_target_corpus" in fire_data
    assert "trajectory_sample" in fire_data

    # Loan Prepayment API
    loan_payload = {
        "loan_principal": 3000000.0,
        "annual_interest_rate_pct": 8.75,
        "loan_tenure_years": 15,
        "extra_monthly_payment": 3000.0,
        "annual_lump_sum_prepayment": 25000.0
    }
    loan_res = await client.post("/api/v1/calculators/loan-prepayment", json=loan_payload, headers=auth_headers)
    assert loan_res.status_code == 200
    loan_data = loan_res.json()
    assert "total_interest_saved" in loan_data
    assert "tenure_reduction_months" in loan_data
