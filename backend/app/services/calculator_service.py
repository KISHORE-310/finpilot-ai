from decimal import Decimal, ROUND_HALF_UP
import math
from typing import List, Tuple, Optional
from app.schemas.calculator import (
    TaxCalculatorRequest,
    TaxCalculatorResponse,
    TaxRegimeBreakdown,
    FIRECalculatorRequest,
    FIRECalculatorResponse,
    YearlyGrowthRow,
    LoanPrepaymentRequest,
    LoanPrepaymentResponse,
)


def _d(val: float | int | str | Decimal) -> Decimal:
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))


def _round2(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CalculatorService:
    """
    Pure deterministic mathematical service for Indian personal financial planning:
    - Old vs New Income Tax Regime comparison
    - FIRE (Financial Independence, Retire Early) & SIP Step-Up Simulator
    - Loan EMI Amortization & Prepayment Interest Reduction
    """

    @staticmethod
    def calculate_hra_exemption(
        basic_salary: Decimal,
        hra_received: Decimal,
        rent_paid_annual: Decimal,
        is_metro: bool = True
    ) -> Decimal:
        if hra_received <= Decimal("0.00") or rent_paid_annual <= Decimal("0.00"):
            return Decimal("0.00")

        pct_basic = Decimal("0.50") if is_metro else Decimal("0.40")
        rule1 = hra_received
        rule2 = basic_salary * pct_basic
        rule3 = max(Decimal("0.00"), rent_paid_annual - (basic_salary * Decimal("0.10")))

        return min(rule1, rule2, rule3)

    @classmethod
    def calculate_tax(cls, req: TaxCalculatorRequest) -> TaxCalculatorResponse:
        gross = req.gross_annual_income
        basic = req.basic_salary if req.basic_salary is not None else (gross * Decimal("0.40"))

        # 1. NEW REGIME CALCULATION (Budget 2024 / FY 2024-25 & 2025-26)
        new_std_deduction = Decimal("75000.00")
        new_taxable_income = max(Decimal("0.00"), gross - new_std_deduction)

        new_slab_tax = Decimal("0.00")
        if new_taxable_income > Decimal("1500000.00"):
            new_slab_tax += (new_taxable_income - Decimal("1500000.00")) * Decimal("0.30")
            new_slab_tax += Decimal("140000.00")
        elif new_taxable_income > Decimal("1200000.00"):
            new_slab_tax += (new_taxable_income - Decimal("1200000.00")) * Decimal("0.20")
            new_slab_tax += Decimal("80000.00")
        elif new_taxable_income > Decimal("1000000.00"):
            new_slab_tax += (new_taxable_income - Decimal("1000000.00")) * Decimal("0.15")
            new_slab_tax += Decimal("50000.00")
        elif new_taxable_income > Decimal("700000.00"):
            new_slab_tax += (new_taxable_income - Decimal("700000.00")) * Decimal("0.10")
            new_slab_tax += Decimal("20000.00")
        elif new_taxable_income > Decimal("300000.00"):
            new_slab_tax += (new_taxable_income - Decimal("300000.00")) * Decimal("0.05")

        new_rebate_87a = Decimal("0.00")
        if new_taxable_income <= Decimal("700000.00"):
            new_rebate_87a = new_slab_tax

        new_tax_after_rebate = max(Decimal("0.00"), new_slab_tax - new_rebate_87a)
        new_cess = _round2(new_tax_after_rebate * Decimal("0.04"))
        new_total_tax = _round2(new_tax_after_rebate + new_cess)
        new_effective_rate = _round2((new_total_tax / gross * Decimal("100.00")) if gross > 0 else Decimal("0.00"))
        new_monthly_take_home = _round2((gross - new_total_tax) / Decimal("12.00"))

        new_breakdown = TaxRegimeBreakdown(
            gross_income=_round2(gross),
            total_deductions_exemptions=_round2(new_std_deduction),
            standard_deduction=_round2(new_std_deduction),
            taxable_income=_round2(new_taxable_income),
            slab_tax=_round2(new_slab_tax),
            rebate_87a=_round2(new_rebate_87a),
            tax_after_rebate=_round2(new_tax_after_rebate),
            health_education_cess_4pct=new_cess,
            total_tax_liability=new_total_tax,
            effective_tax_rate_pct=new_effective_rate,
            monthly_take_home_pay=new_monthly_take_home,
        )

        # 2. OLD REGIME CALCULATION
        old_std_deduction = Decimal("50000.00")
        hra_exemption = cls.calculate_hra_exemption(
            basic_salary=basic,
            hra_received=req.hra_received,
            rent_paid_annual=req.rent_paid_annual,
            is_metro=req.is_metro_city
        )

        total_old_deductions = (
            old_std_deduction
            + req.section_80c
            + req.section_80d
            + req.section_80ccd_1b
            + req.home_loan_interest_24b
            + req.other_exemptions
            + hra_exemption
        )

        old_taxable_income = max(Decimal("0.00"), gross - total_old_deductions)

        old_slab_tax = Decimal("0.00")
        if old_taxable_income > Decimal("1000000.00"):
            old_slab_tax += (old_taxable_income - Decimal("1000000.00")) * Decimal("0.30")
            old_slab_tax += Decimal("112500.00")
        elif old_taxable_income > Decimal("500000.00"):
            old_slab_tax += (old_taxable_income - Decimal("500000.00")) * Decimal("0.20")
            old_slab_tax += Decimal("12500.00")
        elif old_taxable_income > Decimal("250000.00"):
            old_slab_tax += (old_taxable_income - Decimal("250000.00")) * Decimal("0.05")

        old_rebate_87a = Decimal("0.00")
        if old_taxable_income <= Decimal("500000.00"):
            old_rebate_87a = min(old_slab_tax, Decimal("12500.00"))

        old_tax_after_rebate = max(Decimal("0.00"), old_slab_tax - old_rebate_87a)
        old_cess = _round2(old_tax_after_rebate * Decimal("0.04"))
        old_total_tax = _round2(old_tax_after_rebate + old_cess)
        old_effective_rate = _round2((old_total_tax / gross * Decimal("100.00")) if gross > 0 else Decimal("0.00"))
        old_monthly_take_home = _round2((gross - old_total_tax) / Decimal("12.00"))

        old_breakdown = TaxRegimeBreakdown(
            gross_income=_round2(gross),
            total_deductions_exemptions=_round2(total_old_deductions),
            standard_deduction=_round2(old_std_deduction),
            taxable_income=_round2(old_taxable_income),
            slab_tax=_round2(old_slab_tax),
            rebate_87a=_round2(old_rebate_87a),
            tax_after_rebate=_round2(old_tax_after_rebate),
            health_education_cess_4pct=old_cess,
            total_tax_liability=old_total_tax,
            effective_tax_rate_pct=old_effective_rate,
            monthly_take_home_pay=old_monthly_take_home,
        )

        if new_total_tax < old_total_tax:
            recommended = "NEW"
            savings = old_total_tax - new_total_tax
            insight = f"New Tax Regime saves you ₹{savings:,.2f} annually compared to Old Regime."
        elif old_total_tax < new_total_tax:
            recommended = "OLD"
            savings = new_total_tax - old_total_tax
            insight = f"Old Tax Regime saves you ₹{savings:,.2f} annually due to significant Chapter VI-A & HRA deductions."
        else:
            recommended = "NEW"
            savings = Decimal("0.00")
            insight = "Both Tax Regimes result in identical tax liability for your income bracket."

        return TaxCalculatorResponse(
            financial_year=req.financial_year,
            recommended_regime=recommended,
            tax_savings_with_recommended=_round2(savings),
            new_regime=new_breakdown,
            old_regime=old_breakdown,
            summary_insight=insight
        )

    @classmethod
    def calculate_fire(cls, req: FIRECalculatorRequest) -> FIRECalculatorResponse:
        years_to_retire = max(0, req.target_retirement_age - req.current_age)
        inflation_rate = req.expected_inflation_pct / Decimal("100.00")
        pre_return_rate = req.pre_retirement_return_pct / Decimal("100.00")
        swr_rate = req.safe_withdrawal_rate_pct / Decimal("100.00")

        inflation_multiplier = Decimal(str((1 + float(inflation_rate)) ** years_to_retire))
        future_annual_expenses = _round2(req.current_annual_expenses * inflation_multiplier)

        standard_fire_target = _round2(future_annual_expenses / swr_rate)
        lean_fire_target = _round2(standard_fire_target * Decimal("0.75"))
        fat_fire_target = _round2(standard_fire_target * Decimal("1.50"))

        growth_multiplier = Decimal(str((1 + float(pre_return_rate)) ** years_to_retire)) if years_to_retire > 0 else Decimal("1.00")
        coast_fire_target = _round2(standard_fire_target / growth_multiplier)

        current_corpus = req.current_invested_net_worth
        monthly_sip = req.monthly_sip_contribution
        step_up_rate = req.annual_sip_step_up_pct / Decimal("100.00")

        trajectory: List[YearlyGrowthRow] = []
        achieved_age: Optional[int] = None

        for y in range(1, years_to_retire + 16):
            age = req.current_age + y
            annual_inv = monthly_sip * Decimal("12.00")

            current_corpus = (current_corpus * (1 + pre_return_rate)) + (annual_inv * (1 + pre_return_rate / Decimal("2.00")))
            current_corpus = _round2(current_corpus)

            inflated_exp = _round2(req.current_annual_expenses * Decimal(str((1 + float(inflation_rate)) ** y)))
            fire_target_this_year = _round2(inflated_exp / swr_rate)
            fire_met = current_corpus >= fire_target_this_year

            if fire_met and achieved_age is None:
                achieved_age = age

            if y <= years_to_retire or y % 5 == 0 or fire_met:
                trajectory.append(YearlyGrowthRow(
                    year_index=y,
                    age=age,
                    annual_investment=_round2(annual_inv),
                    portfolio_value=_round2(current_corpus),
                    annual_expenses_inflated=inflated_exp,
                    is_fire_achieved=fire_met
                ))

            monthly_sip = monthly_sip * (1 + step_up_rate)

        projected_corpus_at_target = trajectory[min(len(trajectory) - 1, max(0, years_to_retire - 1))].portfolio_value if (years_to_retire > 0 and len(trajectory) > 0) else req.current_invested_net_worth
        is_on_track = projected_corpus_at_target >= standard_fire_target
        shortfall_surplus = _round2(projected_corpus_at_target - standard_fire_target)

        fv_existing = req.current_invested_net_worth * growth_multiplier
        remaining_corpus_needed = max(Decimal("0.00"), standard_fire_target - fv_existing)
        
        if years_to_retire > 0 and remaining_corpus_needed > 0:
            monthly_r = float(pre_return_rate) / 12.0
            total_months = years_to_retire * 12
            fv_factor = ((1 + monthly_r) ** total_months - 1) / monthly_r
            recommended_sip = _round2(Decimal(str(float(remaining_corpus_needed) / fv_factor)))
        else:
            recommended_sip = Decimal("0.00")

        if is_on_track:
            insight = f"You are on track! At age {req.target_retirement_age}, your projected corpus of ₹{projected_corpus_at_target:,.2f} exceeds your Standard FIRE target of ₹{standard_fire_target:,.2f}."
        else:
            insight = f"Corpus shortfall of ₹{abs(shortfall_surplus):,.2f} at age {req.target_retirement_age}. Recommended monthly SIP is ₹{recommended_sip:,.2f} to achieve financial freedom on time."

        return FIRECalculatorResponse(
            years_to_target_age=years_to_retire,
            future_annual_expense_at_fire=future_annual_expenses,
            standard_fire_target_corpus=standard_fire_target,
            lean_fire_target_corpus=lean_fire_target,
            fat_fire_target_corpus=fat_fire_target,
            coast_fire_target_corpus=coast_fire_target,
            projected_corpus_at_target_age=projected_corpus_at_target,
            is_on_track_at_target_age=is_on_track,
            corpus_shortfall_or_surplus=shortfall_surplus,
            recommended_monthly_sip=recommended_sip,
            estimated_fire_age=achieved_age,
            trajectory_sample=trajectory[:10],
            summary_insight=insight
        )

    @classmethod
    def calculate_loan_prepayment(cls, req: LoanPrepaymentRequest) -> LoanPrepaymentResponse:
        P = req.loan_principal
        annual_r = float(req.annual_interest_rate_pct) / 100.0
        monthly_r = annual_r / 12.0
        total_months = req.loan_tenure_years * 12

        if monthly_r > 0:
            emi_float = float(P) * (monthly_r * (1 + monthly_r) ** total_months) / ((1 + monthly_r) ** total_months - 1)
        else:
            emi_float = float(P) / total_months

        standard_emi = _round2(Decimal(str(emi_float)))
        standard_total_payment = _round2(standard_emi * Decimal(str(total_months)))
        standard_total_interest = _round2(standard_total_payment - P)

        balance = float(P)
        prepay_months = 0
        total_interest_paid_prepay = 0.0
        total_principal_paid_prepay = 0.0
        extra_monthly = float(req.extra_monthly_payment)
        extra_lump_annual = float(req.annual_lump_sum_prepayment)

        while balance > 0.01 and prepay_months < total_months * 2:
            prepay_months += 1
            month_interest = balance * monthly_r
            total_interest_paid_prepay += month_interest

            regular_principal = emi_float - month_interest
            total_principal_payment = regular_principal + extra_monthly

            if prepay_months % 12 == 0 and extra_lump_annual > 0:
                total_principal_payment += extra_lump_annual

            if total_principal_payment >= balance:
                total_principal_paid_prepay += balance
                balance = 0.0
                break
            else:
                balance -= total_principal_payment
                total_principal_paid_prepay += total_principal_payment

        with_prepay_total_interest = _round2(Decimal(str(total_interest_paid_prepay)))
        with_prepay_total_payment = _round2(P + with_prepay_total_interest)
        interest_saved = max(Decimal("0.00"), standard_total_interest - with_prepay_total_interest)
        tenure_reduction_m = max(0, total_months - prepay_months)
        tenure_reduction_y = _round2(Decimal(str(tenure_reduction_m)) / Decimal("12.00"))

        insight = (
            f"Prepayments save you ₹{interest_saved:,.2f} in interest and reduce your loan tenure by "
            f"{tenure_reduction_y} years ({tenure_reduction_m} months)!"
        )

        return LoanPrepaymentResponse(
            standard_monthly_emi=standard_emi,
            standard_total_interest=standard_total_interest,
            standard_total_payment=standard_total_payment,
            standard_tenure_months=total_months,
            with_prepayment_total_interest=with_prepay_total_interest,
            with_prepayment_total_payment=with_prepay_total_payment,
            with_prepayment_tenure_months=prepay_months,
            total_interest_saved=interest_saved,
            tenure_reduction_months=tenure_reduction_m,
            tenure_reduction_years=tenure_reduction_y,
            summary_insight=insight
        )
