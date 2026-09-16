import pytest
from decimal import Decimal
from httpx import AsyncClient
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
