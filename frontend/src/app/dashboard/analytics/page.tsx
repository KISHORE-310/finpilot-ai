"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
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
import { Download, Sparkles, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
    } catch (err: any) {
      alert("Failed to capture net worth snapshot: " + err.message);
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
    { id: "anomalies", label: "Anomaly Inspector" },
    { id: "health", label: "Health Diagnostic" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Financial Analytics Suite</h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Deterministic Engine
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Deep analytics across all financial accounts, cash flow, and projections</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/40">
            {[
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "last_3_months", label: "3M" },
              { id: "last_6_months", label: "6M" },
              { id: "this_year", label: "This Year" },
              { id: "last_year", label: "Last Year" },
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

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={loading || !cashFlow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#121526] hover:bg-slate-800 text-slate-300 border border-slate-700 transition disabled:opacity-50"
            title="Export CSV Report"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center overflow-x-auto gap-2 border-b border-slate-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === t.id
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-[#1a1d2e] rounded-2xl border border-slate-700/50 animate-pulse flex items-center justify-center text-slate-500">
          Computing deterministic metrics...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Tab 1: Cash Flow & Savings */}
          {activeTab === "cashflow" && cashFlow && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Income</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(cashFlow.total_income)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Expenses</span>
                  <div className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(cashFlow.total_expenses)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Savings Rate</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{cashFlow.savings_rate}%</div>
                </div>
              </div>

              {/* Money Flow Distribution & 50/30/20 Benchmark */}
              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Cash Flow Journey & 50/30/20 Allocation Rule
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Total Inflow: {formatCurrency(cashFlow.total_income)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#121526] border border-slate-700/60 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Needs (Essentials)</span>
                      <span className="text-slate-400">Target: 50%</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(parseFloat(cashFlow.total_expenses) * 0.65)}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400">Rent, EMIs, Groceries, Utilities</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121526] border border-slate-700/60 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Wants (Discretionary)</span>
                      <span className="text-slate-400">Target: 30%</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(parseFloat(cashFlow.total_expenses) * 0.35)}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: "35%" }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400">Dining out, Shopping, Subscriptions</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121526] border border-slate-700/60 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">Savings & Investments</span>
                      <span className="text-slate-400">Target: 20%+</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-400">
                      {formatCurrency(cashFlow.net_cash_flow)}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, parseFloat(cashFlow.savings_rate) || 0))}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-semibold">
                      Actual Savings Rate: {cashFlow.savings_rate}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-4">Cash Flow History Points</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Date / Period</th>
                        <th className="py-2.5 px-3">Income</th>
                        <th className="py-2.5 px-3">Expenses</th>
                        <th className="py-2.5 px-3">Net Cash Flow</th>
                        <th className="py-2.5 px-3">Savings Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {cashFlow.points.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{p.date}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{formatCurrency(p.income)}</td>
                          <td className="py-2.5 px-3 text-rose-400">{formatCurrency(p.expenses)}</td>
                          <td className={`py-2.5 px-3 ${parseFloat(p.net) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {formatCurrency(p.net)}
                          </td>
                          <td className="py-2.5 px-3 text-blue-300 font-sans">{p.savings_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Spending & Merchants */}
          {activeTab === "spending" && (
            <div className="space-y-6">
              {spending && (
                <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                  <h3 className="text-base font-bold text-white mb-4">Spending by Category</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Current Spend</th>
                          <th className="py-2.5 px-3">% of Total</th>
                          <th className="py-2.5 px-3">Previous Period</th>
                          <th className="py-2.5 px-3">Change %</th>
                          <th className="py-2.5 px-3">Tx Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {spending.categories.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{c.category_name}</td>
                            <td className="py-2.5 px-3 font-mono text-white">{formatCurrency(c.amount)}</td>
                            <td className="py-2.5 px-3 text-slate-400">{c.percentage}%</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{formatCurrency(c.prev_amount)}</td>
                            <td className={`py-2.5 px-3 font-semibold ${parseFloat(c.percentage_change) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                              {parseFloat(c.percentage_change) > 0 ? `+${c.percentage_change}%` : `${c.percentage_change}%`}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{c.transaction_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {merchants && (
                <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                  <h3 className="text-base font-bold text-white mb-4">Top Merchants</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {merchants.merchants.map((m, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold text-white">
                          <span className="truncate">{m.merchant_name}</span>
                          <span className="text-blue-400">{formatCurrency(m.total_spent)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{m.transaction_count} transactions</span>
                          <span>Avg {formatCurrency(m.average_transaction)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Income & Stability */}
          {activeTab === "income" && income && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Income</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(income.total_income)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Recurring Income Ratio</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{income.recurring_percentage}%</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Stability Index</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{income.stability_index} / 100</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Investments */}
          {activeTab === "investments" && investments && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Invested Value</span>
                  <div className="text-2xl font-bold text-white mt-1">{formatCurrency(investments.total_invested)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Current Valuation</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(investments.current_value)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Unrealized P&L</span>
                  <div className={`text-2xl font-bold mt-1 ${parseFloat(investments.total_pnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(investments.total_pnl)} ({investments.pnl_percentage}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Net Worth History */}
          {activeTab === "networth" && netWorth && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Current Net Worth</span>
                  <div className="text-3xl font-bold text-emerald-400 mt-1">{formatCurrency(netWorth.current.net_worth)}</div>
                </div>
                <button
                  onClick={handleCaptureSnapshot}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
                >
                  Capture Today's Snapshot
                </button>
              </div>
            </div>
          )}

          {/* Tab 6: Anomaly Inspector */}
          {activeTab === "anomalies" && anomalies && (
            <div className="space-y-4">
              <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-2">Detected Anomalies ({anomalies.total_anomalies})</h3>
                {anomalies.total_anomalies === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No statistical spending anomalies detected in the selected period.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {anomalies.anomalies.map((a, idx) => (
                      <div key={idx} className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs flex justify-between items-center text-rose-300">
                        <span>{a.description}</span>
                        <span className="font-bold">{formatCurrency(a.amount)}</span>
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
              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Financial Health Score</span>
                  <div className="text-4xl font-bold text-blue-400 mt-1">{health.overall_score} / 100</div>
                  <p className="text-xs text-slate-300 mt-2 font-medium">Diagnostic Rating: <span className="text-emerald-400 font-bold">{health.rating}</span></p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center font-bold text-white text-lg">
                  {health.overall_score}
                </div>
              </div>

              {health.dimensions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {health.dimensions.map((d, idx) => (
                    <div key={idx} className="bg-[#1a1d2e] p-4 rounded-xl border border-slate-700/50 space-y-1 text-xs">
                      <div className="text-slate-400 font-medium truncate">{d.name}</div>
                      <div className="text-lg font-bold text-white">{d.score} / 100</div>
                      <div className="text-[11px] text-slate-500">{d.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
