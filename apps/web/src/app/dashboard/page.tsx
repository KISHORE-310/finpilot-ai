"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AnalyticsOverviewResponse, PeriodOption } from "@/types";

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (selectedPeriod: PeriodOption) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.analytics.getOverview(selectedPeriod);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(period);
  }, [period]);

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#1a1d2e] p-4 sm:p-6 rounded-2xl border border-slate-700/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Financial Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">Deterministic analytics, cash flow, and health metrics</p>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="flex items-center flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/40 self-start sm:self-auto">
          {[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "last_3_months", label: "3M" },
            { id: "last_6_months", label: "6M" },
            { id: "this_year", label: "This Year" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as PeriodOption)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === tab.id
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Alerts Notification Banner if critical alerts exist */}
      {data?.top_alerts && data.top_alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-amber-300">Financial Alerts Detected ({data.top_alerts.length})</h3>
              <Link href="/dashboard/alerts" className="text-xs font-semibold text-amber-400 hover:underline">
                View All &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-300 mt-1 truncate">{data.top_alerts[0].title}: {data.top_alerts[0].message}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-36 bg-[#1a1d2e] rounded-2xl border border-slate-700/50" />
          <div className="h-36 bg-[#1a1d2e] rounded-2xl border border-slate-700/50" />
          <div className="h-36 bg-[#1a1d2e] rounded-2xl border border-slate-700/50" />
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Section 1: Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Net Worth */}
            <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Worth</span>
                <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {formatCurrency(data.net_worth.net_worth)}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs mt-3">
                <span className="text-emerald-400 font-medium">Assets: {formatCurrency(data.net_worth.total_assets)}</span>
                <span className="text-rose-400 font-medium">Debts: {formatCurrency(data.net_worth.total_liabilities)}</span>
              </div>
            </div>

            {/* Income */}
            <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Period Income</span>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
                  {formatCurrency(data.cash_flow.total_income)}
                </div>
              </div>
              <div className="text-xs text-slate-400 pt-3 border-t border-slate-800 mt-3">
                Granularity: <span className="text-slate-200 capitalize">{data.cash_flow.granularity}</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Period Expenses</span>
                <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
                  {formatCurrency(data.cash_flow.total_expenses)}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs mt-3">
                <span className="text-slate-400">Avg Daily: {formatCurrency(data.spending.average_daily_spend)}</span>
                <span className="text-slate-400">MoM: {data.spending.total_change_percent}%</span>
              </div>
            </div>

            {/* Savings Rate & Net Cash Flow */}
            <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Savings Rate</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {data.cash_flow.savings_rate}%
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {formatCurrency(data.cash_flow.net_cash_flow)}
                </div>
              </div>
              <div className="text-xs text-slate-400 pt-3 border-t border-slate-800 mt-3 flex justify-between">
                <span>Net Cash Flow</span>
                <span className="text-slate-300">Avg: {data.cash_flow.historical_avg_savings_rate}%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Cash Flow Timeline & Financial Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cash Flow Timeline Chart / Bars */}
            <div className="lg:col-span-2 bg-[#1a1d2e] p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Cash Flow Breakdown</h2>
                  <p className="text-xs text-slate-400">Income, Expenses, and Net Savings over period</p>
                </div>
                <Link href="/dashboard/analytics" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                  Detailed Chart &rarr;
                </Link>
              </div>

              {data.cash_flow.points.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No transaction records in this period.</div>
              ) : (
                <div className="space-y-3 mt-4">
                  {data.cash_flow.points.slice(-6).map((pt, idx) => {
                    const inc = parseFloat(pt.income);
                    const exp = parseFloat(pt.expenses);
                    const maxVal = Math.max(inc, exp, 100);
                    const incWidth = Math.min(100, (inc / maxVal) * 100);
                    const expWidth = Math.min(100, (exp / maxVal) * 100);

                    return (
                      <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                        <div className="flex justify-between font-semibold text-slate-300 mb-1.5">
                          <span>{pt.date}</span>
                          <span className={parseFloat(pt.net) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            Net: {formatCurrency(pt.net)} ({pt.savings_rate}%)
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-[10px] text-slate-400">Income</span>
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${incWidth}%` }} />
                            </div>
                            <span className="w-20 text-right text-emerald-400 font-mono">{formatCurrency(pt.income)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-[10px] text-slate-400">Expense</span>
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${expWidth}%` }} />
                            </div>
                            <span className="w-20 text-right text-rose-400 font-mono">{formatCurrency(pt.expenses)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial Health Score Card */}
            <div className="bg-[#1a1d2e] p-5 sm:p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-white">Financial Health Score</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {data.financial_health.rating}
                  </span>
                </div>

                <div className="flex items-center gap-4 my-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
                    <span className="text-2xl leading-none">{data.financial_health.overall_score}</span>
                    <span className="text-[9px] uppercase tracking-wider text-blue-200 mt-0.5">/ 100</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Deterministic score based on 6 weighted financial dimensions.
                    </p>
                  </div>
                </div>

                {/* Sub-score Dimensions */}
                <div className="space-y-2.5 mt-3">
                  {data.financial_health.dimensions.map((dim, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>{dim.name}</span>
                        <span className="font-semibold text-slate-100">{dim.score} / 100</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dim.score >= 75 ? "bg-emerald-500" : dim.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                {data.financial_health.strengths[0] || "Maintain current savings pace to build long term security."}
              </div>
            </div>
          </div>

          {/* Section 3: Spending by Category & Budget Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-[#1a1d2e] p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Top Expense Categories</h2>
                  <p className="text-xs text-slate-400">Distribution of expenditures</p>
                </div>
                <Link href="/dashboard/expenses" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                  Manage &rarr;
                </Link>
              </div>

              {data.spending.categories.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No categorical expense data recorded.</div>
              ) : (
                <div className="space-y-3">
                  {data.spending.categories.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="font-medium">{cat.category_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{formatCurrency(cat.amount)}</span>
                          <span className="text-slate-400 font-mono">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${parseFloat(cat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Intelligence */}
            <div className="bg-[#1a1d2e] p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Budget Adherence</h2>
                  <p className="text-xs text-slate-400">Deterministic spend projections</p>
                </div>
                <Link href="/dashboard/budgets" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                  All Budgets &rarr;
                </Link>
              </div>

              {data.budget_summary.budgets.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No active budgets configured.</div>
              ) : (
                <div className="space-y-3">
                  {data.budget_summary.budgets.slice(0, 4).map((b) => (
                    <div key={b.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">{b.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            b.status === "ON_TRACK"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : b.status === "WARNING"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] mb-1.5">
                        <span>Spent: {formatCurrency(b.actual_spent)} / {formatCurrency(b.allocated_amount)}</span>
                        <span>Projected: {formatCurrency(b.projected_spend)}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            parseFloat(b.percentage_used) >= 100
                              ? "bg-rose-500"
                              : parseFloat(b.percentage_used) >= 80
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, parseFloat(b.percentage_used))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Goals & Investment Summaries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goal Progress */}
            <div className="bg-[#1a1d2e] p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Financial Goals Pace</h2>
                  <p className="text-xs text-slate-400">Milestone completion tracker</p>
                </div>
                <Link href="/dashboard/goals" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                  View Goals &rarr;
                </Link>
              </div>

              {data.goal_summary.goals.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No financial goals recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {data.goal_summary.goals.slice(0, 3).map((g) => (
                    <div key={g.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">{g.name}</span>
                        <span className="font-semibold text-blue-400">{g.completion_percentage}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] mb-1.5">
                        <span>{formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)}</span>
                        <span>Req. Monthly: {formatCurrency(g.required_monthly_contribution)}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                          style={{ width: `${parseFloat(g.completion_percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investment Overview */}
            <div className="bg-[#1a1d2e] p-5 sm:p-6 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Investment Portfolio</h2>
                  <p className="text-xs text-slate-400">Holdings & Asset Allocation</p>
                </div>
                <Link href="/dashboard/investments" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                  Portfolio &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Value</span>
                  <span className="text-lg font-bold text-white">{formatCurrency(data.investment_summary.current_value)}</span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total P&L</span>
                  <span
                    className={`text-lg font-bold ${
                      parseFloat(data.investment_summary.total_pnl) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(data.investment_summary.total_pnl)} ({data.investment_summary.pnl_percentage}%)
                  </span>
                </div>
              </div>

              {data.investment_summary.allocations.length > 0 ? (
                <div className="space-y-2">
                  {data.investment_summary.allocations.map((a, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-300">
                      <span>{a.asset_type}</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(a.current_value)} ({a.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-slate-500 text-xs">No investment positions tracked.</div>
              )}
            </div>
          </div>

          {/* Section 5: Financial Disclaimer */}
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <div className="p-1.5 bg-slate-800 text-slate-400 rounded-lg shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-slate-300">Financial Intelligence Disclaimer: </span>
              FinPilot AI provides deterministic analytics and personal finance calculations for educational and organizational purposes only.
              It does not offer certified financial, investment, accounting, or tax advice. Investment valuations reflect user-recorded balances.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
