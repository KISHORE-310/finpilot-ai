"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { AnalyticsOverviewResponse, PeriodOption } from "@/types";
import {
  Badge,
  StatCard,
  ProgressBar,
  EmptyState,
  StatCardSkeleton,
  ChartSkeleton,
  AreaTrajectoryChart,
  TrajectoryPoint,
} from "@/components/ui";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  ArrowLeftRight,
  PieChart,
  Target,
  LineChart,
} from "lucide-react";

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [trajectoryPeriod, setTrajectoryPeriod] = useState<string>("6M");
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

  // Transform cash flow points to trajectory data
  const trajectoryData: TrajectoryPoint[] =
    data?.cash_flow?.points?.map((pt) => ({
      label: pt.date.slice(-5) || pt.date,
      value: parseFloat(pt.net) || 0,
      secondaryValue: parseFloat(pt.income) || 0,
      date: pt.date,
    })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header & Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">Financial Command Center</h1>
            <Badge variant="purple" size="sm">Deterministic Ledger</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal">
            Real-time cash flow, verified ledger balances, and multi-dimensional financial intelligence
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
            <AlertTriangle className="w-5 h-5" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            <StatCardSkeleton />
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
          {/* ============================================================ */}
          {/* SECTION 1: 5 ABOVE-THE-FOLD EXECUTIVE KPIS */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {/* 1. Net Worth */}
            <StatCard
              label="Total Net Worth"
              value={formatCurrency(data.net_worth.net_worth)}
              accentColor="default"
              subtitle="Assets minus liabilities"
              footer={
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">+{formatCurrency(data.net_worth.total_assets)}</span>
                  <span className="text-rose-400 font-medium">-{formatCurrency(data.net_worth.total_liabilities)}</span>
                </div>
              }
            />

            {/* 2. Cash Flow */}
            <StatCard
              label="Net Cash Flow"
              value={formatCurrency(data.cash_flow.net_cash_flow)}
              accentColor={parseFloat(data.cash_flow.net_cash_flow) >= 0 ? "emerald" : "rose"}
              trendBadge={
                <Badge variant={parseFloat(data.cash_flow.savings_rate) >= 20 ? "success" : "warning"} size="sm">
                  {data.cash_flow.savings_rate}% Saved
                </Badge>
              }
              subtitle="Retained cash surplus"
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Savings Pace</span>
                  <span className="text-slate-200 font-mono font-medium">{data.cash_flow.savings_rate}%</span>
                </div>
              }
            />

            {/* 3. Income */}
            <StatCard
              label="Period Income"
              value={formatCurrency(data.cash_flow.total_income)}
              accentColor="emerald"
              subtitle={`Timeframe: ${period.replace("_", " ")}`}
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Income Streams</span>
                  <span className="text-emerald-400 font-medium font-mono">Inflow</span>
                </div>
              }
            />

            {/* 4. Expenses */}
            <StatCard
              label="Period Expenses"
              value={formatCurrency(data.cash_flow.total_expenses)}
              accentColor="rose"
              subtitle={`Daily run-rate: ${formatCurrency(data.spending.average_daily_spend)}`}
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>MoM Delta</span>
                  <span className={`font-semibold ${parseFloat(data.spending.total_change_percent) <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.spending.total_change_percent}%
                  </span>
                </div>
              }
            />

            {/* 5. Financial Health Score */}
            <StatCard
              label="Health Score"
              value={`${data.financial_health.overall_score}/100`}
              accentColor="purple"
              trendBadge={
                <Badge variant={data.financial_health.overall_score >= 70 ? "success" : "warning"} size="sm">
                  {data.financial_health.rating}
                </Badge>
              }
              subtitle="6-Pillar Solvency Index"
              footer={
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Status</span>
                  <span className="text-purple-300 font-medium">{data.financial_health.rating}</span>
                </div>
              }
            />
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: CASH FLOW TRAJECTORY & FINANCIAL HEALTH MATRIX */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Interactive Cash Flow Trajectory Chart */}
            <div className="lg:col-span-2 bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Cash Flow & Net Surplus Trajectory</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Historical interval surplus and retained liquidity</p>
                  </div>
                  <Link href="/dashboard/analytics" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1">
                    <span>Deep Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <AreaTrajectoryChart
                  data={trajectoryData}
                  height={240}
                  primaryLabel="Net Cash Surplus"
                  secondaryLabel="Total Inflow"
                  showSecondary={true}
                  activePeriod={trajectoryPeriod}
                  onPeriodChange={(p) => setTrajectoryPeriod(p)}
                />
              </div>
            </div>

            {/* Right Column: 6-Pillar Financial Health Breakdown */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Health Diagnostic</h2>
                    <p className="text-xs text-slate-400 mt-0.5">6 Solvency & Resilience Pillars</p>
                  </div>
                  <Badge variant={data.financial_health.overall_score >= 70 ? "success" : "warning"} size="sm">
                    {data.financial_health.rating}
                  </Badge>
                </div>

                <div className="space-y-3 mt-4">
                  {data.financial_health.dimensions.map((dim, idx) => (
                    <div key={idx} className="bg-[#0a0c14]/70 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                      <div className="flex justify-between items-center text-slate-300 mb-1.5">
                        <span className="font-medium text-slate-200">{dim.name}</span>
                        <span className="font-mono text-white font-bold">{dim.score} / 100</span>
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

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {data.financial_health.strengths[0] || "Maintain current savings cadence to reinforce resilience."}
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: SPENDING BREAKDOWN & BUDGET PACING */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories Breakdown */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Top Spending Categories</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Current period expenditure distribution</p>
                </div>
                <Link href="/dashboard/expenses" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  Manage Outflows &rarr;
                </Link>
              </div>

              {data.spending.categories.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No categorical expense data recorded.</div>
              ) : (
                <div className="space-y-3.5">
                  {data.spending.categories.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="font-medium text-slate-200 capitalize">{cat.category_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white font-mono">{formatCurrency(cat.amount)}</span>
                          <span className="text-slate-400 font-mono text-[11px]">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <ProgressBar percentage={parseFloat(cat.percentage)} variant="default" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Adherence & Envelope Health */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Budget Pacing & Envelopes</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Deterministic spend projections against caps</p>
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
                      <div className="flex justify-between text-slate-400 text-[11px] mb-2 font-mono">
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

          {/* ============================================================ */}
          {/* SECTION 4: GOALS PACE, INVESTMENTS, & AI INSIGHT TRIGGER */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Goals Progress */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Milestone Goals</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Target capital progress</p>
                </div>
                <Link href="/dashboard/goals" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  Goals &rarr;
                </Link>
              </div>

              {data.goal_summary.goals.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No financial goals recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {data.goal_summary.goals.slice(0, 3).map((g) => (
                    <div key={g.id} className="p-3 bg-[#0a0c14]/70 rounded-xl border border-slate-800/90 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">{g.name}</span>
                        <span className="font-semibold text-blue-400 font-mono">{g.completion_percentage}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px] mb-2 font-mono">
                        <span>{formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)}</span>
                        <span>Req: {formatCurrency(g.required_monthly_contribution)}/mo</span>
                      </div>
                      <ProgressBar percentage={parseFloat(g.completion_percentage)} variant="default" size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investment Portfolio Snapshot */}
            <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Investment Assets</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Holdings & Valuation</p>
                </div>
                <Link href="/dashboard/investments" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
                  Portfolio &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Portfolio</span>
                  <span className="text-base font-bold font-mono text-white mt-0.5 block">{formatCurrency(data.investment_summary.current_value)}</span>
                </div>
                <div className="p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Unrealized P&L</span>
                  <span
                    className={`text-base font-bold font-mono mt-0.5 block ${
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
                      <span className="text-slate-300 capitalize">{a.asset_type}</span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {formatCurrency(a.current_value)} ({a.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-slate-500 text-xs">No investment positions tracked.</div>
              )}
            </div>

            {/* AI Financial Analyst Callout */}
            <div className="bg-gradient-to-br from-[#111420] to-[#1a1530] p-5 sm:p-6 rounded-2xl border border-purple-500/30 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Analyst Assistant</h3>
                    <Badge variant="purple" size="sm">Multi-Agent Engine</Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Ask real questions about your personal cash flow, budget limits, or simulated tax liability.
                </p>

                <div className="mt-4 space-y-2">
                  {[
                    "Can I afford a ₹25,000 purchase this month?",
                    "Which budgets are pacing high?",
                  ].map((prompt, idx) => (
                    <Link
                      key={idx}
                      href={`/dashboard/ai?prompt=${encodeURIComponent(prompt)}`}
                      className="block p-2.5 bg-[#0a0c14]/80 hover:bg-[#0a0c14] border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-xs text-purple-200 hover:text-white transition group"
                    >
                      <span className="flex items-center justify-between">
                        <span className="truncate">&quot;{prompt}&quot;</span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/dashboard/ai"
                className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold text-center transition shadow-md shadow-purple-500/20 block"
              >
                Open Full Analyst Workspace →
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
