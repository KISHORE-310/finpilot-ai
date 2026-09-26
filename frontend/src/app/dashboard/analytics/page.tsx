"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AnomalyResponse,
  CashFlowResponse,
  FinancialHealthResponse,
  IncomeAnalyticsResponse,
  InvestmentAnalyticsResponse,
  LargestTransactionsResponse,
  MerchantSpendingResponse,
  NetWorthAnalyticsResponse,
  PeriodOption,
  RecurringAnalysisResponse,
  SpendingBreakdownResponse,
} from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  ProgressBar,
  EmptyState,
  TableSkeleton,
} from "@/components/ui";
import {
  Download,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Camera,
  Activity,
  Layers,
} from "lucide-react";

type AnalyticsTab =
  | "cashflow"
  | "spending"
  | "income"
  | "investments"
  | "networth"
  | "anomalies"
  | "health";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("cashflow");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytical state objects
  const [cashFlow, setCashFlow] = useState<CashFlowResponse | null>(null);
  const [spending, setSpending] = useState<SpendingBreakdownResponse | null>(null);
  const [merchants, setMerchants] = useState<MerchantSpendingResponse | null>(null);
  const [largestTxs, setLargestTxs] = useState<LargestTransactionsResponse | null>(null);
  const [recurring, setRecurring] = useState<RecurringAnalysisResponse | null>(null);
  const [income, setIncome] = useState<IncomeAnalyticsResponse | null>(null);
  const [investments, setInvestments] = useState<InvestmentAnalyticsResponse | null>(null);
  const [netWorth, setNetWorth] = useState<NetWorthAnalyticsResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [health, setHealth] = useState<FinancialHealthResponse | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        cfRes,
        spRes,
        mRes,
        lRes,
        recRes,
        incRes,
        invRes,
        nwRes,
        anomRes,
        hRes,
      ] = await Promise.all([
        api.analytics.getCashFlow(period, "monthly"),
        api.analytics.getSpendingCategories(period),
        api.analytics.getTopMerchants(period, 15),
        api.analytics.getLargestTransactions(period, 10),
        api.analytics.getRecurringAnalysis(),
        api.analytics.getIncome(period),
        api.analytics.getInvestments(),
        api.analytics.getNetWorth(),
        api.analytics.getAnomalies(period),
        api.analytics.getFinancialHealth(),
      ]);

      setCashFlow(cfRes);
      setSpending(spRes);
      setMerchants(mRes);
      setLargestTxs(lRes);
      setRecurring(recRes);
      setIncome(incRes);
      setInvestments(invRes);
      setNetWorth(nwRes);
      setAnomalies(anomRes);
      setHealth(hRes);
    } catch (err: any) {
      setError(err.message || "Failed to load comprehensive analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const handleCaptureSnapshot = async () => {
    try {
      await api.analytics.createNetWorthSnapshot();
      const updatedNw = await api.analytics.getNetWorth();
      setNetWorth(updatedNw);
      alert("Net worth snapshot captured successfully!");
    } catch (err: any) {
      alert("Failed to capture snapshot: " + err.message);
    }
  };

  const handleExportCSV = () => {
    if (!cashFlow) return;
    const rows = [
      ["FinPilot AI - Financial Analytics Report"],
      ["Period", period],
      ["Generated At", new Date().toISOString()],
      [],
      ["1. Cash Flow Summary"],
      ["Total Income (INR)", cashFlow.total_income],
      ["Total Expenses (INR)", cashFlow.total_expenses],
      ["Net Cash Flow (INR)", cashFlow.net_cash_flow],
      ["Savings Rate (%)", `${cashFlow.savings_rate}%`],
      [],
      ["2. Spending by Category"],
      ["Category", "Amount (INR)", "% of Total", "Previous Period", "Delta %"],
      ...(spending?.categories.map((c) => [
        `"${c.category_name}"`,
        c.amount,
        `"${c.percentage}%"`,
        c.prev_amount,
        `"${c.percentage_change}%"`,
      ]) || []),
      [],
      ["3. Top Merchants"],
      ["Merchant", "Total Spend (INR)", "Tx Count", "Average Tx (INR)"],
      ...(merchants?.merchants.map((m) => [
        `"${m.merchant_name}"`,
        m.total_spent,
        m.transaction_count,
        m.average_transaction,
      ]) || []),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finpilot_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: AnalyticsTab; label: string }[] = [
    { id: "cashflow", label: "Cash Flow & Savings" },
    { id: "spending", label: "Spending & Merchants" },
    { id: "income", label: "Income & Stability" },
    { id: "investments", label: "Investments" },
    { id: "networth", label: "Net Worth History" },
    { id: "anomalies", label: "Anomaly Detector" },
    { id: "health", label: "Health Diagnostic" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Deterministic Analytics"
        subtitle="Deep multi-period mathematical metrics computed from your verified double-entry ledger"
        period={period}
        onPeriodChange={setPeriod}
        badge={<Badge variant="purple">Deterministic Engine</Badge>}
        actions={
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !cashFlow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0a0c14] hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-50"
            title="Export CSV Report"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export Report (CSV)</span>
          </button>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex items-center overflow-x-auto gap-2 border-b border-slate-800/80 pb-2 scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === t.id
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TableSkeleton rows={3} cols={3} />
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs">
          {error}
        </div>
      ) : (
        <>
          {/* Tab 1: Cash Flow & Savings */}
          {activeTab === "cashflow" && cashFlow && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <StatCard
                  label="Total Inflow"
                  value={formatCurrency(cashFlow.total_income)}
                  accentColor="emerald"
                  subtitle={`Period: ${period.replace("_", " ")}`}
                />
                <StatCard
                  label="Total Outflow"
                  value={formatCurrency(cashFlow.total_expenses)}
                  accentColor="rose"
                  subtitle="Cumulative expenses"
                />
                <StatCard
                  label="Savings Rate"
                  value={`${cashFlow.savings_rate}%`}
                  accentColor={parseFloat(cashFlow.savings_rate) >= 20 ? "emerald" : "amber"}
                  subtitle={`Net Cash Flow: ${formatCurrency(cashFlow.net_cash_flow)}`}
                />
              </div>

              {/* 50/30/20 Benchmark Allocation */}
              <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Cash Flow Allocation & 50/30/20 Rule
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Total Inflow: <span className="font-semibold text-white font-mono">{formatCurrency(cashFlow.total_income)}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#0a0c14]/80 border border-slate-800/90 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Needs (Essentials)</span>
                      <span className="text-slate-400 text-[11px]">Benchmark: 50%</span>
                    </div>
                    <div className="text-lg font-bold text-white font-mono">
                      {formatCurrency(parseFloat(cashFlow.total_expenses) * 0.65)}
                    </div>
                    <ProgressBar percentage={65} variant="default" size="sm" />
                    <p className="text-[11px] text-slate-400">Rent, Groceries, Utilities, Health</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0a0c14]/80 border border-slate-800/90 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Wants (Discretionary)</span>
                      <span className="text-slate-400 text-[11px]">Benchmark: 30%</span>
                    </div>
                    <div className="text-lg font-bold text-white font-mono">
                      {formatCurrency(parseFloat(cashFlow.total_expenses) * 0.35)}
                    </div>
                    <ProgressBar percentage={35} variant="warning" size="sm" />
                    <p className="text-[11px] text-slate-400">Dining out, Shopping, Streaming, Travel</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0a0c14]/80 border border-slate-800/90 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Savings & Investments</span>
                      <span className="text-slate-400 text-[11px]">Benchmark: 20%+</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-400 font-mono">
                      {formatCurrency(cashFlow.net_cash_flow)}
                    </div>
                    <ProgressBar
                      percentage={Math.min(100, Math.max(0, parseFloat(cashFlow.savings_rate) || 0))}
                      variant="success"
                      size="sm"
                    />
                    <p className="text-[11px] text-emerald-400 font-semibold">
                      Actual Rate: {cashFlow.savings_rate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Intervals List */}
              <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90">
                <h3 className="text-base font-bold text-white tracking-tight mb-4">Historical Intervals</h3>
                {cashFlow.points.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4">No points recorded for this period.</div>
                ) : (
                  <div className="space-y-3">
                    {cashFlow.points.map((pt, idx) => (
                      <div key={idx} className="p-3 bg-[#0a0c14]/70 rounded-xl border border-slate-800/90 text-xs flex items-center justify-between">
                        <span className="font-semibold text-white">{pt.date}</span>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-emerald-400">+{formatCurrency(pt.income)}</span>
                          <span className="text-rose-400">-{formatCurrency(pt.expenses)}</span>
                          <span className={parseFloat(pt.net) >= 0 ? "text-blue-400 font-bold" : "text-rose-400 font-bold"}>
                            Net: {formatCurrency(pt.net)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Spending & Merchants */}
          {activeTab === "spending" && spending && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories */}
                <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90">
                  <h3 className="text-base font-bold text-white tracking-tight mb-4">Categorical Breakdown</h3>
                  {spending.categories.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4">No spending data recorded.</div>
                  ) : (
                    <div className="space-y-3.5">
                      {spending.categories.map((c, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-200">{c.category_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono font-bold">{formatCurrency(c.amount)}</span>
                              <span className="text-slate-400 font-mono text-[11px]">({c.percentage}%)</span>
                            </div>
                          </div>
                          <ProgressBar percentage={parseFloat(c.percentage)} variant="default" size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Merchants */}
                <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90">
                  <h3 className="text-base font-bold text-white tracking-tight mb-4">Top Merchants & Entities</h3>
                  {merchants?.merchants.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4">No merchant entries logged.</div>
                  ) : (
                    <div className="space-y-3">
                      {merchants?.merchants.slice(0, 8).map((m, idx) => (
                        <div key={idx} className="p-3 bg-[#0a0c14]/70 rounded-xl border border-slate-800/90 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-white block">{m.merchant_name}</span>
                            <span className="text-[11px] text-slate-400">{m.transaction_count} transactions</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white font-mono block">{formatCurrency(m.total_spent)}</span>
                            <span className="text-[10px] text-slate-400">Avg: {formatCurrency(m.average_transaction)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Income & Stability */}
          {activeTab === "income" && income && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <StatCard
                  label="Total Inflow"
                  value={formatCurrency(income.total_income)}
                  accentColor="emerald"
                  subtitle="Recorded income streams"
                />
                <StatCard
                  label="Recurring Inflow"
                  value={formatCurrency(income.recurring_income)}
                  accentColor="default"
                  subtitle={`${income.recurring_percentage || 0}% recurring predictability`}
                />
                <StatCard
                  label="Stability Index"
                  value={`${income.stability_index || "100"}/100`}
                  accentColor="purple"
                  subtitle={income.stability_rating || "Consistency across cycles"}
                />
              </div>

              <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90">
                <h3 className="text-base font-bold text-white tracking-tight mb-4">Income Sources Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {income.sources.map((s, idx) => (
                    <div key={idx} className="p-3.5 bg-[#0a0c14]/70 rounded-xl border border-slate-800/90 text-xs flex justify-between items-center">
                      <span className="font-semibold text-white capitalize">{s.source}</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-emerald-400 block">{formatCurrency(s.amount)}</span>
                        <span className="text-[10px] text-slate-400">{s.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Investments */}
          {activeTab === "investments" && investments && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <StatCard
                  label="Portfolio Valuation"
                  value={formatCurrency(investments.current_value)}
                  accentColor="default"
                  subtitle="Recorded assets total"
                />
                <StatCard
                  label="Total Cost Basis"
                  value={formatCurrency(investments.total_invested)}
                  accentColor="default"
                  subtitle="Invested capital"
                />
                <StatCard
                  label="Unrealized P&L"
                  value={formatCurrency(investments.total_pnl)}
                  accentColor={parseFloat(investments.total_pnl) >= 0 ? "emerald" : "rose"}
                  subtitle={`${investments.pnl_percentage}% total gain`}
                />
              </div>
            </div>
          )}

          {/* Tab 5: Net Worth History */}
          {activeTab === "networth" && netWorth && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-[#131622] p-5 rounded-2xl border border-slate-800/90">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Net Worth History & Snapshots</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Capture daily or monthly balance snapshots</p>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Capture Snapshot
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <StatCard
                  label="Current Net Worth"
                  value={formatCurrency(netWorth.current.net_worth)}
                  accentColor="blue"
                  subtitle={`MoM change: ${netWorth.mom_change_percent || "0"}%`}
                />
                <StatCard
                  label="Total Assets"
                  value={formatCurrency(netWorth.current.total_assets)}
                  accentColor="emerald"
                  subtitle="Cash, depository, investments"
                />
                <StatCard
                  label="Total Liabilities"
                  value={formatCurrency(netWorth.current.total_liabilities)}
                  accentColor="rose"
                  subtitle="Credit cards, loans"
                />
              </div>
            </div>
          )}

          {/* Tab 6: Anomaly Detector */}
          {activeTab === "anomalies" && anomalies && (
            <div className="space-y-6">
              <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Statistical Anomaly Detector (μ + 2.5σ)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically flags transactions exceeding 2.5 standard deviations from your 90-day baseline
                    </p>
                  </div>
                  <Badge variant="warning">{anomalies.anomalies.length} Detected</Badge>
                </div>

                {anomalies.anomalies.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No spending anomalies detected. All transactions align with statistical spending bounds.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anomalies.anomalies.map((a, idx) => (
                      <div key={idx} className="p-4 bg-[#0a0c14]/80 rounded-xl border border-amber-500/30 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white block">{a.title || a.description}</span>
                          <span className="text-[11px] text-slate-400">Category: {a.category_name || "General"} | {a.date}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-rose-400 text-sm block">{formatCurrency(a.amount)}</span>
                          <span className="text-[10px] text-amber-400 font-semibold">{a.deviation_factor ? `${a.deviation_factor}x Outlier` : "Statistical Outlier"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 7: Health Diagnostic */}
          {activeTab === "health" && health && (
            <div className="space-y-6">
              <div className="bg-[#131622] p-5 sm:p-6 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20 shrink-0">
                  <span className="text-3xl leading-none">{health.overall_score}</span>
                  <span className="text-[10px] uppercase tracking-wider text-blue-200 mt-1">/ 100</span>
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">FinPilot Diagnostic Rating</h3>
                    <Badge variant={health.overall_score >= 70 ? "success" : "warning"}>{health.rating}</Badge>
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Evaluated across 6 core solvency and resilience pillars: Savings Rate, Budget Discipline, Liquidity Runway, Debt Burden, Goal Pace, and Investment Diversification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {health.dimensions.map((dim, idx) => (
                  <div key={idx} className="bg-[#131622] p-4 rounded-xl border border-slate-800/90 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200">{dim.name}</span>
                      <span className="font-mono text-white font-bold">{dim.score} / 100</span>
                    </div>
                    <ProgressBar percentage={dim.score} variant={dim.score >= 75 ? "success" : dim.score >= 50 ? "warning" : "danger"} size="sm" />
                    <p className="text-[11px] text-slate-400">{dim.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
