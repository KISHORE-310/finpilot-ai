"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  TaxCalculatorResponse,
  FIRECalculatorResponse,
  LoanPrepaymentResponse,
} from "@/types";
import {
  Calculator,
  Flame,
  CreditCard,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { SectionHeader, StatCard, Badge, ProgressBar } from "@/components/ui";

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState<"tax" | "fire" | "loan">("tax");

  // --- TAX STATE ---
  const [taxInput, setTaxInput] = useState({
    financial_year: "2024-25",
    gross_annual_income: 1500000,
    basic_salary: 600000,
    hra_received: 240000,
    rent_paid_annual: 300000,
    is_metro_city: true,
    section_80c: 150000,
    section_80d: 25000,
    section_80ccd_1b: 50000,
    home_loan_interest_24b: 0,
    other_exemptions: 0,
  });
  const [taxResult, setTaxResult] = useState<TaxCalculatorResponse | null>(null);
  const [taxLoading, setTaxLoading] = useState(false);

  // --- FIRE STATE ---
  const [fireInput, setFireInput] = useState({
    current_age: 28,
    target_retirement_age: 45,
    current_annual_expenses: 600000,
    current_invested_net_worth: 1000000,
    monthly_sip_contribution: 40000,
    annual_sip_step_up_pct: 10,
    expected_inflation_pct: 6,
    pre_retirement_return_pct: 12,
    safe_withdrawal_rate_pct: 3.5,
  });
  const [fireResult, setFireResult] = useState<FIRECalculatorResponse | null>(null);
  const [fireLoading, setFireLoading] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // --- LOAN STATE ---
  const [loanInput, setLoanInput] = useState({
    loan_principal: 5000000,
    annual_interest_rate_pct: 8.5,
    loan_tenure_years: 20,
    extra_monthly_payment: 5000,
    annual_lump_sum_prepayment: 50000,
  });
  const [loanResult, setLoanResult] = useState<LoanPrepaymentResponse | null>(null);
  const [loanLoading, setLoanLoading] = useState(false);

  // Run initial calculations on mount
  useEffect(() => {
    runTaxCalculation();
    runFIRECalculation();
    runLoanCalculation();
  }, []);

  const runTaxCalculation = async () => {
    setTaxLoading(true);
    try {
      const res = await api.calculators.calculateTax(taxInput);
      setTaxResult(res);
    } catch (err) {
      console.error("Tax calculation failed:", err);
    } finally {
      setTaxLoading(false);
    }
  };

  const runFIRECalculation = async () => {
    setFireLoading(true);
    try {
      const res = await api.calculators.calculateFIRE(fireInput);
      setFireResult(res);
    } catch (err) {
      console.error("FIRE calculation failed:", err);
    } finally {
      setFireLoading(false);
    }
  };

  const runLoanCalculation = async () => {
    setLoanLoading(true);
    try {
      const res = await api.calculators.calculateLoanPrepayment(loanInput);
      setLoanResult(res);
    } catch (err) {
      console.error("Loan calculation failed:", err);
    } finally {
      setLoanLoading(false);
    }
  };

  const handleAutoFillFromLedger = async () => {
    setAutoFilling(true);
    try {
      const [netWorthRes, spendingRes] = await Promise.all([
        api.analytics.getNetWorth().catch(() => null),
        api.analytics.getSpendingCategories("this_year").catch(() => null),
      ]);

      let updatedNetWorth = fireInput.current_invested_net_worth;
      let updatedAnnualExp = fireInput.current_annual_expenses;

      if (netWorthRes && netWorthRes.current && netWorthRes.current.net_worth) {
        const parsedNW = parseFloat(String(netWorthRes.current.net_worth));
        if (!isNaN(parsedNW) && parsedNW > 0) {
          updatedNetWorth = parsedNW;
        }
      }

      if (spendingRes && spendingRes.total_spending) {
        const parsedExp = parseFloat(String(spendingRes.total_spending));
        if (!isNaN(parsedExp) && parsedExp > 0) {
          updatedAnnualExp = Math.max(300000, Math.round(parsedExp));
        }
      }

      const newInputs = {
        ...fireInput,
        current_invested_net_worth: updatedNetWorth,
        current_annual_expenses: updatedAnnualExp,
      };
      setFireInput(newInputs);
      const res = await api.calculators.calculateFIRE(newInputs);
      setFireResult(res);
    } catch (err) {
      console.error("Auto fill failed:", err);
    } finally {
      setAutoFilling(false);
    }
  };

  const formatINR = (val: string | number | undefined) => {
    if (val === undefined || val === null) return "₹0.00";
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Simulators & Tax Optimizer"
        subtitle="Deterministic financial models: Indian Income Tax (Old vs. New Regime), FIRE retirement compounding, and loan prepayment amortization"
        badge={<Badge variant="purple">Deterministic Math</Badge>}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("tax")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === "tax"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Indian Income Tax (Old vs. New)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fire")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === "fire"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          FIRE & SIP Step-Up Simulator
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("loan")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === "loan"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          Loan Prepayment & EMI Optimizer
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INDIAN TAX CALCULATOR */}
      {/* ======================================================== */}
      {activeTab === "tax" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-[#131622] rounded-2xl border border-slate-800/90 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="border-b border-slate-800/80 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">Income & Deduction Parameters</h2>
              <p className="text-xs text-slate-400 mt-0.5">FY 2024-25 & FY 2025-26 Provisions</p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gross Annual Salary / Income (₹)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={taxInput.gross_annual_income}
                  onChange={(e) =>
                    setTaxInput({ ...taxInput, gross_annual_income: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={taxInput.basic_salary}
                    onChange={(e) =>
                      setTaxInput({ ...taxInput, basic_salary: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">HRA Received (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={taxInput.hra_received}
                    onChange={(e) =>
                      setTaxInput({ ...taxInput, hra_received: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Rent Paid (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={taxInput.rent_paid_annual}
                    onChange={(e) =>
                      setTaxInput({ ...taxInput, rent_paid_annual: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={taxInput.is_metro_city}
                      onChange={(e) => setTaxInput({ ...taxInput, is_metro_city: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#0a0c14] border border-slate-700 text-blue-600 focus:ring-0"
                    />
                    Metro City (50% HRA)
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Old Regime Deductions
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Section 80C (Max ₹1.5L)</label>
                    <input
                      type="number"
                      step="5000"
                      value={taxInput.section_80c}
                      onChange={(e) =>
                        setTaxInput({ ...taxInput, section_80c: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Section 80D (Health)</label>
                    <input
                      type="number"
                      step="5000"
                      value={taxInput.section_80d}
                      onChange={(e) =>
                        setTaxInput({ ...taxInput, section_80d: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">80CCD(1B) NPS (Max ₹50k)</label>
                    <input
                      type="number"
                      step="5000"
                      value={taxInput.section_80ccd_1b}
                      onChange={(e) =>
                        setTaxInput({ ...taxInput, section_80ccd_1b: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sec 24(b) Home Loan</label>
                    <input
                      type="number"
                      step="10000"
                      value={taxInput.home_loan_interest_24b}
                      onChange={(e) =>
                        setTaxInput({ ...taxInput, home_loan_interest_24b: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={runTaxCalculation}
                disabled={taxLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
              >
                {taxLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Calculate Tax Comparison
              </button>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 space-y-5">
            {taxResult && (
              <>
                {/* Recommendation Banner */}
                <div
                  className={`p-5 rounded-2xl border flex items-start gap-4 shadow-sm ${
                    taxResult.recommended_regime === "NEW"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-blue-500/10 border-blue-500/30"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recommendation</span>
                      <Badge variant="success">{taxResult.recommended_regime}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">
                      {taxResult.summary_insight}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Annual Tax Savings: <span className="text-emerald-400 font-bold font-mono">{formatINR(taxResult.tax_savings_with_recommended)}</span>
                    </p>
                  </div>
                </div>

                {/* Regime Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* New Regime Card */}
                  <div className="bg-[#131622] rounded-2xl border border-slate-800/90 p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="font-bold text-white text-sm">New Regime (Default)</h3>
                      <Badge variant={taxResult.recommended_regime === "NEW" ? "success" : "neutral"} size="sm">
                        Standard ₹75k Ded.
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Taxable Income</span>
                        <span className="font-mono text-white">{formatINR(taxResult.new_regime.taxable_income)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Base Tax Slabs</span>
                        <span className="font-mono text-white">{formatINR(taxResult.new_regime.slab_tax)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Section 87A Rebate</span>
                        <span className="font-mono text-emerald-400">-{formatINR(taxResult.new_regime.rebate_87a)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Health & Education Cess (4%)</span>
                        <span className="font-mono text-white">{formatINR(taxResult.new_regime.health_education_cess_4pct)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex justify-between font-bold text-sm">
                        <span className="text-white">Total Annual Tax</span>
                        <span className="text-emerald-400 font-mono">{formatINR(taxResult.new_regime.total_tax_liability)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                        <span>Monthly Take-Home</span>
                        <span className="text-white font-semibold font-mono">{formatINR(taxResult.new_regime.monthly_take_home_pay)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Old Regime Card */}
                  <div className="bg-[#131622] rounded-2xl border border-slate-800/90 p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h3 className="font-bold text-white text-sm">Old Regime</h3>
                      <Badge variant={taxResult.recommended_regime === "OLD" ? "success" : "neutral"} size="sm">
                        Deductions & HRA
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Total Deductions & HRA</span>
                        <span className="font-mono text-emerald-400">-{formatINR(taxResult.old_regime.total_deductions_exemptions)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Taxable Income</span>
                        <span className="font-mono text-white">{formatINR(taxResult.old_regime.taxable_income)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Base Tax Slabs</span>
                        <span className="font-mono text-white">{formatINR(taxResult.old_regime.slab_tax)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Health & Education Cess (4%)</span>
                        <span className="font-mono text-white">{formatINR(taxResult.old_regime.health_education_cess_4pct)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex justify-between font-bold text-sm">
                        <span className="text-white">Total Annual Tax</span>
                        <span className="text-blue-400 font-mono">{formatINR(taxResult.old_regime.total_tax_liability)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                        <span>Monthly Take-Home</span>
                        <span className="text-white font-semibold font-mono">{formatINR(taxResult.old_regime.monthly_take_home_pay)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FIRE & SIP STEP-UP SIMULATOR */}
      {/* ======================================================== */}
      {activeTab === "fire" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-[#131622] rounded-2xl border border-slate-800/90 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">FIRE Parameters</h2>
                <p className="text-xs text-slate-400 mt-0.5">Compounding with annual inflation & SIP step-up</p>
              </div>
              <button
                type="button"
                onClick={handleAutoFillFromLedger}
                disabled={autoFilling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-600 hover:text-white transition"
                title="Sync Net Worth & Annual Expenses from ledger"
              >
                <RefreshCw className={`w-3 h-3 ${autoFilling ? "animate-spin" : ""}`} />
                Sync from Ledger
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Current Age</label>
                  <input
                    type="number"
                    value={fireInput.current_age}
                    onChange={(e) => setFireInput({ ...fireInput, current_age: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Retirement Target Age</label>
                  <input
                    type="number"
                    value={fireInput.target_retirement_age}
                    onChange={(e) =>
                      setFireInput({ ...fireInput, target_retirement_age: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Annual Expenses (₹)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={fireInput.current_annual_expenses}
                  onChange={(e) =>
                    setFireInput({ ...fireInput, current_annual_expenses: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Invested Net Worth (₹)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={fireInput.current_invested_net_worth}
                  onChange={(e) =>
                    setFireInput({ ...fireInput, current_invested_net_worth: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly SIP (₹)</label>
                  <input
                    type="number"
                    step="5000"
                    value={fireInput.monthly_sip_contribution}
                    onChange={(e) =>
                      setFireInput({ ...fireInput, monthly_sip_contribution: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Step-Up (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={fireInput.annual_sip_step_up_pct}
                    onChange={(e) =>
                      setFireInput({ ...fireInput, annual_sip_step_up_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Expected Return</label>
                  <input
                    type="number"
                    step="0.5"
                    value={fireInput.pre_retirement_return_pct}
                    onChange={(e) =>
                      setFireInput({ ...fireInput, pre_retirement_return_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Inflation (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={fireInput.expected_inflation_pct}
                    onChange={(e) =>
                      setFireInput({ ...fireInput, expected_inflation_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">SWR (% / SWR)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fireInput.safe_withdrawal_rate_pct}
                    onChange={(e) =>
                      setFireInput({ ...fireInput, safe_withdrawal_rate_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={runFIRECalculation}
                disabled={fireLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 mt-2"
              >
                {fireLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                Run Compounding Simulation
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            {fireResult && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="FIRE Target Corpus"
                    value={formatINR(fireResult.standard_fire_target_corpus)}
                    accentColor="amber"
                    subtitle={`Future expense: ${formatINR(fireResult.future_annual_expense_at_fire)}/yr`}
                  />
                  <StatCard
                    label="Projected Corpus at Age"
                    value={formatINR(fireResult.projected_corpus_at_target_age)}
                    accentColor="emerald"
                    subtitle={`In ${fireResult.years_to_target_age} years`}
                  />
                  <StatCard
                    label="Status & Progress"
                    value={fireResult.is_on_track_at_target_age ? "On Track ✓" : "Gap Detected"}
                    accentColor={fireResult.is_on_track_at_target_age ? "emerald" : "rose"}
                    subtitle={`Shortfall/Surplus: ${formatINR(fireResult.corpus_shortfall_or_surplus)}`}
                  />
                </div>

                {/* Milestone Targets */}
                <div className="bg-[#131622] rounded-2xl border border-slate-800/90 p-5 space-y-3">
                  <h3 className="font-bold text-white text-sm">FIRE Target Hierarchy</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block">Lean FIRE (75%)</span>
                      <span className="font-bold text-white font-mono text-sm block mt-0.5">{formatINR(fireResult.lean_fire_target_corpus)}</span>
                    </div>
                    <div className="p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block">Standard FIRE (100%)</span>
                      <span className="font-bold text-amber-400 font-mono text-sm block mt-0.5">{formatINR(fireResult.standard_fire_target_corpus)}</span>
                    </div>
                    <div className="p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block">Fat FIRE (150%)</span>
                      <span className="font-bold text-purple-400 font-mono text-sm block mt-0.5">{formatINR(fireResult.fat_fire_target_corpus)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LOAN PREPAYMENT OPTIMIZER */}
      {/* ======================================================== */}
      {activeTab === "loan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-[#131622] rounded-2xl border border-slate-800/90 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="border-b border-slate-800/80 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">Loan & Prepayment Terms</h2>
              <p className="text-xs text-slate-400 mt-0.5">Simulate EMI interest savings and tenure reduction</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Loan Principal (₹)</label>
                <input
                  type="number"
                  step="50000"
                  value={loanInput.loan_principal}
                  onChange={(e) => setLoanInput({ ...loanInput, loan_principal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={loanInput.annual_interest_rate_pct}
                    onChange={(e) =>
                      setLoanInput({ ...loanInput, annual_interest_rate_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tenure (Years)</label>
                  <input
                    type="number"
                    value={loanInput.loan_tenure_years}
                    onChange={(e) => setLoanInput({ ...loanInput, loan_tenure_years: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Extra Monthly EMI (₹)</label>
                  <input
                    type="number"
                    step="1000"
                    value={loanInput.extra_monthly_payment}
                    onChange={(e) =>
                      setLoanInput({ ...loanInput, extra_monthly_payment: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Lump Sum (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={loanInput.annual_lump_sum_prepayment}
                    onChange={(e) =>
                      setLoanInput({ ...loanInput, annual_lump_sum_prepayment: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={runLoanCalculation}
                disabled={loanLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 mt-2"
              >
                {loanLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Calculate Savings
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            {loanResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="Monthly Base EMI"
                    value={formatINR(loanResult.standard_monthly_emi)}
                    accentColor="default"
                    subtitle="Standard amortization payment"
                  />
                  <StatCard
                    label="Interest Saved"
                    value={formatINR(loanResult.total_interest_saved)}
                    accentColor="emerald"
                    subtitle="Net rupee savings via prepayment"
                  />
                  <StatCard
                    label="Tenure Reduction"
                    value={`${loanResult.tenure_reduction_months} Months`}
                    accentColor="blue"
                    subtitle="Loan paid off earlier"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
