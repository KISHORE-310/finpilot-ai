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
  IndianRupee,
  RefreshCw,
  Zap,
} from "lucide-react";

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
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 p-6 rounded-2xl border border-blue-500/20 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Deterministic Financial Intelligence</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Financial Simulators & Tax Optimizer
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Explore Indian Tax Regimes (FY 2024-25 / 2025-26), simulate your FIRE freedom date, and optimize loan prepayments.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#121526] p-1.5 rounded-xl border border-slate-700/60 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("tax")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "tax"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Tax Optimizer
          </button>
          <button
            onClick={() => setActiveTab("fire")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "fire"
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            FIRE & SIP
          </button>
          <button
            onClick={() => setActiveTab("loan")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "loan"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Loan Prepayment
          </button>
        </div>
      </div>

      {/* TAB 1: TAX OPTIMIZER */}
      {activeTab === "tax" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" />
                Income & Deductions
              </h2>
              <span className="text-[11px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                FY 2024-25 & 2025-26
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gross Annual Income (₹)</label>
              <input
                type="number"
                value={taxInput.gross_annual_income}
                onChange={(e) => setTaxInput({ ...taxInput, gross_annual_income: Number(e.target.value) })}
                className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Basic Salary (₹)</label>
                <input
                  type="number"
                  value={taxInput.basic_salary}
                  onChange={(e) => setTaxInput({ ...taxInput, basic_salary: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">HRA Received (₹)</label>
                <input
                  type="number"
                  value={taxInput.hra_received}
                  onChange={(e) => setTaxInput({ ...taxInput, hra_received: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Annual Rent Paid (₹)</label>
                <input
                  type="number"
                  value={taxInput.rent_paid_annual}
                  onChange={(e) => setTaxInput({ ...taxInput, rent_paid_annual: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer bg-[#121526] border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={taxInput.is_metro_city}
                    onChange={(e) => setTaxInput({ ...taxInput, is_metro_city: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Metro City (50% HRA)</span>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Old Regime Exemptions (Chapter VI-A)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">80C (PPF, EPF, ELSS) max 1.5L</label>
                <input
                  type="number"
                  value={taxInput.section_80c}
                  onChange={(e) => setTaxInput({ ...taxInput, section_80c: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">80D (Health Insurance)</label>
                <input
                  type="number"
                  value={taxInput.section_80d}
                  onChange={(e) => setTaxInput({ ...taxInput, section_80d: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">80CCD(1B) NPS max 50k</label>
                <input
                  type="number"
                  value={taxInput.section_80ccd_1b}
                  onChange={(e) => setTaxInput({ ...taxInput, section_80ccd_1b: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Home Loan Int (24b) max 2L</label>
                <input
                  type="number"
                  value={taxInput.home_loan_interest_24b}
                  onChange={(e) => setTaxInput({ ...taxInput, home_loan_interest_24b: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={runTaxCalculation}
              disabled={taxLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${taxLoading ? "animate-spin" : ""}`} />
              Calculate & Compare Regimes
            </button>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 space-y-6">
            {taxResult && (
              <>
                {/* Recommendation Banner */}
                <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  taxResult.recommended_regime === "NEW"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                }`}>
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Recommendation: {taxResult.recommended_regime} REGIME
                      </span>
                      {Number(taxResult.tax_savings_with_recommended) > 0 && (
                        <span className="text-xs font-bold text-white">
                          Saves {formatINR(taxResult.tax_savings_with_recommended)} / year
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 mt-2">{taxResult.summary_insight}</p>
                  </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Regime Card */}
                  <div className={`bg-[#1a1d2e] p-5 rounded-2xl border ${
                    taxResult.recommended_regime === "NEW"
                      ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : "border-slate-700/50"
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 mb-3">
                      <h3 className="font-bold text-white text-sm">New Regime (Default)</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        Std Ded ₹75k
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Taxable Income</span>
                        <span className="font-semibold text-white">{formatINR(taxResult.new_regime.taxable_income)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Slab Tax</span>
                        <span>{formatINR(taxResult.new_regime.slab_tax)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Sec 87A Rebate</span>
                        <span>- {formatINR(taxResult.new_regime.rebate_87a)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Cess (4%)</span>
                        <span>{formatINR(taxResult.new_regime.health_education_cess_4pct)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-700/50 flex justify-between font-bold text-sm">
                        <span className="text-white">Total Tax</span>
                        <span className="text-emerald-400">{formatINR(taxResult.new_regime.total_tax_liability)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1">
                        <span>Effective Tax Rate</span>
                        <span>{taxResult.new_regime.effective_tax_rate_pct}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#121526] border border-slate-700/50 mt-2">
                        <div className="text-[11px] text-slate-400">Monthly Take-Home</div>
                        <div className="text-sm font-bold text-white mt-0.5">{formatINR(taxResult.new_regime.monthly_take_home_pay)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Old Regime Card */}
                  <div className={`bg-[#1a1d2e] p-5 rounded-2xl border ${
                    taxResult.recommended_regime === "OLD"
                      ? "border-blue-500/50 shadow-lg shadow-blue-500/10"
                      : "border-slate-700/50"
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 mb-3">
                      <h3 className="font-bold text-white text-sm">Old Regime</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        Std Ded ₹50k + Deductions
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Total Deductions</span>
                        <span className="font-semibold text-white">{formatINR(taxResult.old_regime.total_deductions_exemptions)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Taxable Income</span>
                        <span className="font-semibold text-white">{formatINR(taxResult.old_regime.taxable_income)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Slab Tax</span>
                        <span>{formatINR(taxResult.old_regime.slab_tax)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Sec 87A Rebate</span>
                        <span>- {formatINR(taxResult.old_regime.rebate_87a)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Cess (4%)</span>
                        <span>{formatINR(taxResult.old_regime.health_education_cess_4pct)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-700/50 flex justify-between font-bold text-sm">
                        <span className="text-white">Total Tax</span>
                        <span className="text-blue-400">{formatINR(taxResult.old_regime.total_tax_liability)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1">
                        <span>Effective Tax Rate</span>
                        <span>{taxResult.old_regime.effective_tax_rate_pct}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#121526] border border-slate-700/50 mt-2">
                        <div className="text-[11px] text-slate-400">Monthly Take-Home</div>
                        <div className="text-sm font-bold text-white mt-0.5">{formatINR(taxResult.old_regime.monthly_take_home_pay)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FIRE & SIP SIMULATOR */}
      {activeTab === "fire" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-5 bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                FIRE Parameters
              </h2>
              <button
                onClick={handleAutoFillFromLedger}
                disabled={autoFilling}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition disabled:opacity-50"
              >
                <Zap className="w-3 h-3 text-blue-400" />
                {autoFilling ? "Syncing..." : "Auto-fill from Ledger"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current Age</label>
                <input
                  type="number"
                  value={fireInput.current_age}
                  onChange={(e) => setFireInput({ ...fireInput, current_age: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Retire Age</label>
                <input
                  type="number"
                  value={fireInput.target_retirement_age}
                  onChange={(e) => setFireInput({ ...fireInput, target_retirement_age: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Annual Expenses (₹)</label>
              <input
                type="number"
                value={fireInput.current_annual_expenses}
                onChange={(e) => setFireInput({ ...fireInput, current_annual_expenses: Number(e.target.value) })}
                className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Invested Net Worth (₹)</label>
              <input
                type="number"
                value={fireInput.current_invested_net_worth}
                onChange={(e) => setFireInput({ ...fireInput, current_invested_net_worth: Number(e.target.value) })}
                className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Monthly SIP (₹)</label>
                <input
                  type="number"
                  value={fireInput.monthly_sip_contribution}
                  onChange={(e) => setFireInput({ ...fireInput, monthly_sip_contribution: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Annual SIP Step-Up (%)</label>
                <input
                  type="number"
                  value={fireInput.annual_sip_step_up_pct}
                  onChange={(e) => setFireInput({ ...fireInput, annual_sip_step_up_pct: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Inflation %</label>
                <input
                  type="number"
                  value={fireInput.expected_inflation_pct}
                  onChange={(e) => setFireInput({ ...fireInput, expected_inflation_pct: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Returns %</label>
                <input
                  type="number"
                  value={fireInput.pre_retirement_return_pct}
                  onChange={(e) => setFireInput({ ...fireInput, pre_retirement_return_pct: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">SWR %</label>
                <input
                  type="number"
                  value={fireInput.safe_withdrawal_rate_pct}
                  onChange={(e) => setFireInput({ ...fireInput, safe_withdrawal_rate_pct: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={runFIRECalculation}
              disabled={fireLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${fireLoading ? "animate-spin" : ""}`} />
              Recalculate FIRE Projection
            </button>
          </div>

          {/* Results */}
          <div className="lg:col-span-7 space-y-6">
            {fireResult && (
              <>
                {/* Status Card */}
                <div className={`p-5 rounded-2xl border ${
                  fireResult.is_on_track_at_target_age
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {fireResult.is_on_track_at_target_age ? "On Track for Freedom" : "Target Shortfall Detected"}
                      </span>
                      <p className="text-sm text-slate-200 mt-2">{fireResult.summary_insight}</p>
                    </div>
                  </div>
                </div>

                {/* 4 FIRE Target Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#1a1d2e] p-3.5 rounded-xl border border-slate-700/50">
                    <div className="text-[11px] text-slate-400 font-medium">Standard FIRE (28x)</div>
                    <div className="text-sm font-bold text-white mt-1">{formatINR(fireResult.standard_fire_target_corpus)}</div>
                  </div>
                  <div className="bg-[#1a1d2e] p-3.5 rounded-xl border border-slate-700/50">
                    <div className="text-[11px] text-slate-400 font-medium">Lean FIRE (75%)</div>
                    <div className="text-sm font-bold text-slate-300 mt-1">{formatINR(fireResult.lean_fire_target_corpus)}</div>
                  </div>
                  <div className="bg-[#1a1d2e] p-3.5 rounded-xl border border-slate-700/50">
                    <div className="text-[11px] text-slate-400 font-medium">Fat FIRE (150%)</div>
                    <div className="text-sm font-bold text-purple-400 mt-1">{formatINR(fireResult.fat_fire_target_corpus)}</div>
                  </div>
                  <div className="bg-[#1a1d2e] p-3.5 rounded-xl border border-slate-700/50">
                    <div className="text-[11px] text-slate-400 font-medium">Coast FIRE Today</div>
                    <div className="text-sm font-bold text-blue-400 mt-1">{formatINR(fireResult.coast_fire_target_corpus)}</div>
                  </div>
                </div>

                {/* Trajectory Table */}
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <h3 className="text-sm font-bold text-white mb-3">Compounding Trajectory Sample</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="pb-2">Age</th>
                          <th className="pb-2">Annual Invest</th>
                          <th className="pb-2">Portfolio Value</th>
                          <th className="pb-2">Inflated Expenses</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {fireResult.trajectory_sample.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-2.5 font-bold text-white">{row.age}</td>
                            <td className="py-2.5">{formatINR(row.annual_investment)}</td>
                            <td className="py-2.5 font-semibold text-emerald-400">{formatINR(row.portfolio_value)}</td>
                            <td className="py-2.5 text-slate-400">{formatINR(row.annual_expenses_inflated)}</td>
                            <td className="py-2.5">
                              {row.is_fire_achieved ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Achieved
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Accumulating</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LOAN PREPAYMENT */}
      {activeTab === "loan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-5 bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                Loan & Prepayment Plan
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Loan Principal (₹)</label>
              <input
                type="number"
                value={loanInput.loan_principal}
                onChange={(e) => setLoanInput({ ...loanInput, loan_principal: Number(e.target.value) })}
                className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={loanInput.annual_interest_rate_pct}
                  onChange={(e) => setLoanInput({ ...loanInput, annual_interest_rate_pct: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tenure (Years)</label>
                <input
                  type="number"
                  value={loanInput.loan_tenure_years}
                  onChange={(e) => setLoanInput({ ...loanInput, loan_tenure_years: Number(e.target.value) })}
                  className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Acceleration Strategy</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Extra Monthly Payment (₹)</label>
              <input
                type="number"
                value={loanInput.extra_monthly_payment}
                onChange={(e) => setLoanInput({ ...loanInput, extra_monthly_payment: Number(e.target.value) })}
                className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Annual Lump-sum Prepayment (₹)</label>
              <input
                type="number"
                value={loanInput.annual_lump_sum_prepayment}
                onChange={(e) => setLoanInput({ ...loanInput, annual_lump_sum_prepayment: Number(e.target.value) })}
                className="w-full bg-[#121526] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={runLoanCalculation}
              disabled={loanLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loanLoading ? "animate-spin" : ""}`} />
              Compute Savings & Amortization
            </button>
          </div>

          {/* Results */}
          <div className="lg:col-span-7 space-y-6">
            {loanResult && (
              <>
                <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-6 rounded-2xl border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    Interest Savings Summary
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Save {formatINR(loanResult.total_interest_saved)} in Total Interest!
                  </h3>
                  <p className="text-slate-300 text-sm mt-2">{loanResult.summary_insight}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50 space-y-3 text-xs">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-700">Standard Loan Schedule</h4>
                    <div className="flex justify-between text-slate-300">
                      <span>Monthly EMI</span>
                      <span className="font-bold text-white">{formatINR(loanResult.standard_monthly_emi)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Interest</span>
                      <span className="text-rose-400">{formatINR(loanResult.standard_total_interest)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Payment</span>
                      <span>{formatINR(loanResult.standard_total_payment)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Tenure</span>
                      <span>{loanResult.standard_tenure_months} months</span>
                    </div>
                  </div>

                  <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-purple-500/40 shadow-lg shadow-purple-500/10 space-y-3 text-xs">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-700">With Accelerated Prepayments</h4>
                    <div className="flex justify-between text-slate-300">
                      <span>Revised Total Interest</span>
                      <span className="font-bold text-emerald-400">{formatINR(loanResult.with_prepayment_total_interest)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Revised Total Payment</span>
                      <span>{formatINR(loanResult.with_prepayment_total_payment)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Revised Tenure</span>
                      <span className="font-bold text-purple-300">{loanResult.with_prepayment_tenure_months} months</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-700">
                      <span>Tenure Cut By</span>
                      <span className="font-bold">{loanResult.tenure_reduction_years} Years ({loanResult.tenure_reduction_months} mo)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
