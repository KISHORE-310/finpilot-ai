"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { AnalyticsOverviewResponse, PeriodOption } from "@/types";
import { Badge, StatCard, ProgressBar, EmptyState, StatCardSkeleton, ChartSkeleton } from "@/components/ui";

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

  const hasData =
    data &&
    (parseFloat(data.net_worth.net_worth) !== 0 ||
      parseFloat(data.cash_flow.total_income) !== 0 ||
      parseFloat(data.cash_flow.total_expenses) !== 0 ||
      data.cash_flow.points.length > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header & Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">Financial Intelligence</h1>
            <Badge variant="purple" size="sm">Deterministic Engine</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal">
            Real-time cash flow, verified ledger balances, and multi-dimensional financial metrics
          </p>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="flex items-center flex-wrap gap-1 bg-[#0a0c14] p-1 rounded-xl border border-slate-800/90 self-start sm:self-auto">
          {[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "last_3_months", label: "3M" },
            { id: "last_6_months", label: "6M" },
            { id: "this_year", label: "This Year" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id as PeriodOption)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === tab.id
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Alerts Notification Banner */}
      {data?.top_alerts && data.top_alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-amber-300">
                Active Financial Alerts ({data.top_alerts.length})
              </h3>
              <Link href="/dashboard/alerts" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition">
                View All &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-300 mt-1 truncate">
              <span className="font-semibold text-white">{data.top_alerts[0].title}:</span> {data.top_alerts[0].message}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <StatCardSkeleton />
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchDashboard(period)}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : data && !hasData ? (
        <EmptyState
          title="No Financial Activity in this Period"
          description="Your dashboard displays real deterministic metrics computed from your recorded transactions, accounts, and budgets. Create your first account or import a statement to view live insights."
          actionText="+ Add Transaction"
          actionHref="/dashboard/transactions"
          secondaryActionText="+ Import Statement (CSV)"
          secondaryActionHref="/dashboard/import"
        />
      ) : data ? (
        <>
          {/* Section 1: Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Net Worth */}
            <StatCard
              label="Total Net Worth"
              value={formatCurrency(data.net_worth.net_worth)}
              accentColor="default"
              subtitle="Calculated as total assets minus liabilities"
              footer={
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">Assets: {formatCurrency(data.net_worth.total_assets)}</span>
                  <span className="text-rose-400 font-medium">Debts: {formatCurrency(data.net_worth.total_liabilities)}</span>
                </div>
              }
            />

            {/* Income */}
            <StatCard
              label="Period Income"
              value={formatCurrency(data.cash_flow.total_income)}
              accentColor="emerald"
              subtitle={`Timeframe: ${period.replace("_", " ")}`}
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Granularity</span>
                  <span className="text-slate-200 capitalize font-medium">{data.cash_flow.granularity}</span>
                </div>
              }
            />

            {/* Expenses */}
            <StatCard
              label="Period Expenses"
              value={formatCurrency(data.cash_flow.total_expenses)}
              accentColor="rose"
              subtitle={`Avg Daily Spend: ${formatCurrency(data.spending.average_daily_spend)}`}
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>MoM Change</span>
                  <span className={`font-semibold ${parseFloat(data.spending.total_change_percent) <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.spending.total_change_percent}%
                  </span>
                </div>
              }
            />

            {/* Savings Rate & Net Cash Flow */}
            <StatCard
              label="Net Cash Flow"
              value={formatCurrency(data.cash_flow.net_cash_flow)}
              accentColor={parseFloat(data.cash_flow.net_cash_flow) >= 0 ? "blue" : "rose"}
              trendBadge={
                <Badge variant={parseFloat(data.cash_flow.savings_rate) >= 20 ? "success" : "warning"} size="sm">
                  {data.cash_flow.savings_rate}% Saved
                </Badge>
              }
              subtitle="Net retained cash flow this period"
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Historical Average</span>
                  <span className="text-slate-200 font-medium">{data.cash_flow.historical_avg_savings_rate}%</span>
                </div>
              }
            />
          </div>

          {/* Section 2: Cash Flow Breakdown & Financial Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cash Flow Timeline */}
            <div className="lg:col-span-2 bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Cash Flow Trajectory</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Income vs. expenses across historical intervals</p>
                  </div>
                  <Link href="/dashboard/analytics" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                    Deep Analytics &rarr;
                  </Link>
                </div>

                {data.cash_flow.points.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">No interval transactions recorded for this period.</div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {data.cash_flow.points.slice(-6).map((pt, idx) => {
                      const inc = parseFloat(pt.income);
                      const exp = parseFloat(pt.expenses);
                      const maxVal = Math.max(inc, exp, 100);
                      const incWidth = Math.min(100, (inc / maxVal) * 100);
                      const expWidth = Math.min(100, (exp / maxVal) * 100);

                      return (
                        <div key={idx} className="bg-[#0a0c14]/70 p-3.5 rounded-xl border border-slate-800/90 text-xs">
                          <div className="flex justify-between font-semibold text-slate-300 mb-2">
                            <span className="text-slate-200">{pt.date}</span>
                            <span className={parseFloat(pt.net) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              Net: {formatCurrency(pt.net)} ({pt.savings_rate}%)
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-12 text-[10px] font-medium text-slate-400">Income</span>
                              <div className="flex-1 bg-slate-800/80 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${incWidth}%` }} />
                              </div>
                              <span className="w-24 text-right text-emerald-400 font-mono text-[11px] font-medium">{formatCurrency(pt.income)}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="w-12 text-[10px] font-medium text-slate-400">Expense</span>
                              <div className="flex-1 bg-slate-800/80 rounded-full h-2 overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: `${expWidth}%` }} />
                              </div>
                              <span className="w-24 text-right text-rose-400 font-mono text-[11px] font-medium">{formatCurrency(pt.expenses)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Health Score */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Financial Health Score</h2>
                    <p className="text-xs text-slate-400 mt-0.5">FinPilot Index</p>
                  </div>
                  <Badge variant={data.financial_health.overall_score >= 70 ? "success" : data.financial_health.overall_score >= 50 ? "warning" : "danger"}>
                    {data.financial_health.rating}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 my-4 p-4 bg-[#0a0c14]/80 rounded-xl border border-slate-800/90">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 shrink-0">
                    <span className="text-2xl leading-none">{data.financial_health.overall_score}</span>
                    <span className="text-[9px] uppercase tracking-wider text-blue-200 mt-0.5">/ 100</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Weighted score across 6 core solvency and discipline pillars.
                    </p>
                  </div>
                </div>

                {/* Sub-score Dimensions */}
                <div className="space-y-3 mt-4">
                  {data.financial_health.dimensions.map((dim, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span className="text-slate-300">{dim.name}</span>
                        <span className="font-semibold text-slate-100">{dim.score} / 100</span>
                      </div>
                      <ProgressBar
                        percentage={dim.score}
                        variant={dim.score >= 75 ? "success" : dim.score >= 50 ? "warning" : "danger"}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                {data.financial_health.strengths[0] || "Maintain current savings cadence to reinforce resilience."}
              </div>
            </div>
          </div>

          {/* Section 3: Spending Breakdown & Budget Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Top Expense Categories</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Distribution of expenditures</p>
                </div>
                <Link href="/dashboard/expenses" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  Manage &rarr;
                </Link>
              </div>

              {data.spending.categories.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No categorical expense data recorded.</div>
              ) : (
                <div className="space-y-3.5">
                  {data.spending.categories.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="font-medium text-slate-200">{cat.category_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{formatCurrency(cat.amount)}</span>
                          <span className="text-slate-400 font-mono text-[11px]">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <ProgressBar percentage={parseFloat(cat.percentage)} variant="default" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Intelligence */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Budget Adherence</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Deterministic spend projections</p>
                </div>
                <Link href="/dashboard/budgets" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  All Budgets &rarr;
                </Link>
              </div>

              {data.budget_summary.budgets.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No active budgets configured.</div>
              ) : (
                <div className="space-y-3">
                  {data.budget_summary.budgets.slice(0, 4).map((b) => (
                    <div key={b.id} className="p-3.5 bg-[#0a0c14]/70 rounded-xl border border-slate-800/90 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-white">{b.name}</span>
                        <Badge
                          variant={
                            b.status === "ON_TRACK"
                              ? "success"
                              : b.status === "WARNING"
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                        >
                          {b.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] mb-2">
                        <span>Spent: {formatCurrency(b.actual_spent)} / {formatCurrency(b.allocated_amount)}</span>
                        <span>Projected: {formatCurrency(b.projected_spend)}</span>
                      </div>
                      <ProgressBar percentage={parseFloat(b.percentage_used)} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Goals & Investment Summaries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goal Progress */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Financial Goals Pace</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Target milestone progress</p>
                </div>
                <Link href="/dashboard/goals" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  View Goals &rarr;
                </Link>
              </div>

              {data.goal_summary.goals.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No financial goals recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {data.goal_summary.goals.slice(0, 3).map((g) => (
                    <div key={g.id} className="p-3.5 bg-[#0a0c14]/70 rounded-xl border border-slate-800/90 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">{g.name}</span>
                        <span className="font-semibold text-blue-400">{g.completion_percentage}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] mb-2">
                        <span>{formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)}</span>
                        <span>Req. Monthly: {formatCurrency(g.required_monthly_contribution)}</span>
                      </div>
                      <ProgressBar percentage={parseFloat(g.completion_percentage)} variant="default" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investment Overview */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Investment Portfolio</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Holdings & Asset Allocation</p>
                </div>
                <Link href="/dashboard/investments" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  Portfolio &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 bg-[#0a0c14]/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Portfolio</span>
                  <span className="text-base sm:text-lg font-bold text-white">{formatCurrency(data.investment_summary.current_value)}</span>
                </div>
                <div className="p-3.5 bg-[#0a0c14]/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Unrealized P&L</span>
                  <span
                    className={`text-base sm:text-lg font-bold ${
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
                      <span className="text-slate-300">{a.asset_type}</span>
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
          <div className="p-4 bg-[#111420]/80 rounded-2xl border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
            <div className="p-1.5 bg-slate-800/80 text-slate-400 rounded-lg shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-300">Financial Intelligence Notice: </span>
              FinPilot AI computes deterministic analytics and personal finance metrics for educational and personal management purposes.
              It does not provide certified fiduciary, investment, or statutory tax advice.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
