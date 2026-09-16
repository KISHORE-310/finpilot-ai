from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.schemas.calculator import (
    TaxCalculatorRequest,
    TaxCalculatorResponse,
    FIRECalculatorRequest,
    FIRECalculatorResponse,
    LoanPrepaymentRequest,
    LoanPrepaymentResponse,
)
from app.services.calculator_service import CalculatorService

router = APIRouter(prefix="/calculators", tags=["Calculators & Simulators"])


@router.post("/tax", response_model=TaxCalculatorResponse)
async def calculate_tax_regimes(
    req: TaxCalculatorRequest,
    current_user: User = Depends(get_current_user)
) -> TaxCalculatorResponse:
    """
    Computes Indian Income Tax comparison between Old and New Regimes
    (FY 2024-25 & 2025-26 rules with standard deductions, Section 87A rebate, and Chapter VI-A deductions).
    """
    return CalculatorService.calculate_tax(req)


@router.post("/fire", response_model=FIRECalculatorResponse)
async def calculate_fire_trajectory(
    req: FIRECalculatorRequest,
    current_user: User = Depends(get_current_user)
) -> FIRECalculatorResponse:
    """
    Computes FIRE (Financial Independence, Retire Early) targets (Lean, Standard, Fat, Coast FIRE)
    and year-by-year compounding trajectory with annual SIP step-up.
    """
    return CalculatorService.calculate_fire(req)


@router.post("/loan-prepayment", response_model=LoanPrepaymentResponse)
async def calculate_loan_prepayment(
    req: LoanPrepaymentRequest,
    current_user: User = Depends(get_current_user)
) -> LoanPrepaymentResponse:
    """
    Computes Loan EMI amortization schedule with extra monthly payments and annual lump sums,
    calculating total interest saved and tenure reduction.
    """
    return CalculatorService.calculate_loan_prepayment(req)
