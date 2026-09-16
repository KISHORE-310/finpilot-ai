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
              {/* Category table */}
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
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{c.transaction_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Merchants & Largest */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {merchants && (
                  <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                    <h3 className="text-base font-bold text-white mb-4">Top Merchants</h3>
                    <div className="space-y-3">
                      {merchants.merchants.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                          <div>
                            <span className="font-semibold text-slate-200 block">{m.merchant_name}</span>
                            <span className="text-[11px] text-slate-400">{m.transaction_count} transactions</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-white block">{formatCurrency(m.total_spent)}</span>
                            <span className="text-[11px] text-slate-400">Avg: {formatCurrency(m.average_transaction)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurring && (
                  <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                    <h3 className="text-base font-bold text-white mb-4">Recurring Expense Commitments</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Monthly Equivalent</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(recurring.monthly_total)}</span>
                      </div>
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Annualized Total</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(recurring.annual_total)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {recurring.items.map((r) => (
                        <div key={r.id} className="flex justify-between text-xs p-2 bg-slate-900/40 rounded-lg">
                          <span className="text-slate-300">{r.name} ({r.frequency})</span>
                          <span className="font-mono text-slate-200">{formatCurrency(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                  <span className="text-xs text-slate-400 uppercase font-semibold">Recurring Share</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{income.recurring_percentage}%</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Stability Rating</span>
                  <div className="text-2xl font-bold text-white mt-1">{income.stability_rating}</div>
                </div>
              </div>

              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-4">Income Streams by Source</h3>
                <div className="space-y-3">
                  {income.sources.map((s, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                        <span>{s.source}</span>
                        <span>{formatCurrency(s.amount)} ({s.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${parseFloat(s.percentage)}%` }} />
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Invested</span>
                  <div className="text-2xl font-bold text-white mt-1">{formatCurrency(investments.total_invested)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Current Valuation</span>
                  <div className="text-2xl font-bold text-white mt-1">{formatCurrency(investments.current_value)}</div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Return (P&L)</span>
                  <div className={`text-2xl font-bold mt-1 ${parseFloat(investments.total_pnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(investments.total_pnl)}
                  </div>
                </div>
                <div className="bg-[#1a1d2e] p-5 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Return %</span>
                  <div className={`text-2xl font-bold mt-1 ${parseFloat(investments.pnl_percentage) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {investments.pnl_percentage}%
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-4">Portfolio Asset Allocation</h3>
                <div className="space-y-3">
                  {investments.allocations.map((a, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                        <span>{a.asset_type}</span>
                        <span>{formatCurrency(a.current_value)} ({a.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${parseFloat(a.percentage)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Net Worth History */}
          {activeTab === "networth" && netWorth && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Current Net Worth</span>
                  <div className="text-3xl font-bold text-white mt-1">{formatCurrency(netWorth.current.net_worth)}</div>
                </div>
                <button
                  onClick={handleCaptureSnapshot}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Record Snapshot Today
                </button>
              </div>

              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-4">Snapshot Timeline</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Snapshot Date</th>
                        <th className="py-2.5 px-3">Total Assets</th>
                        <th className="py-2.5 px-3">Total Liabilities</th>
                        <th className="py-2.5 px-3">Net Worth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {netWorth.history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans text-slate-300">{h.snapshot_date}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{formatCurrency(h.total_assets)}</td>
                          <td className="py-2.5 px-3 text-rose-400">{formatCurrency(h.total_liabilities)}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{formatCurrency(h.net_worth)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Anomaly Inspector */}
          {activeTab === "anomalies" && anomalies && (
            <div className="space-y-6">
              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-1">Deterministic Anomaly Detection</h3>
                <p className="text-xs text-slate-400 mb-4">Transactions deviating significantly from your 90-day baseline</p>

                {anomalies.anomalies.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">No transaction anomalies flagged for this period.</div>
                ) : (
                  <div className="space-y-3">
                    {anomalies.anomalies.map((anom) => (
                      <div
                        key={anom.id}
                        className={`p-4 rounded-xl border ${
                          anom.severity === "critical"
                            ? "bg-rose-500/10 border-rose-500/30"
                            : "bg-amber-500/10 border-amber-500/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{anom.title}</span>
                          <span className="text-xs font-mono text-slate-300">{anom.date}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{anom.description}</p>
                        <div className="flex gap-4 mt-2 text-[11px] text-slate-400">
                          <span>Amount: <strong className="text-white">{formatCurrency(anom.amount)}</strong></span>
                          <span>Typical: <strong className="text-white">{formatCurrency(anom.typical_amount)}</strong></span>
                          <span>Factor: <strong className="text-amber-400">{anom.deviation_factor}x</strong></span>
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
              <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50 flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center font-bold text-white shadow-xl shadow-blue-500/30 shrink-0">
                  <span className="text-3xl leading-none">{health.overall_score}</span>
                  <span className="text-[10px] uppercase tracking-wider text-blue-200 mt-1">Score / 100</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Diagnostic Summary: {health.rating}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{health.methodology_note}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider">Identified Strengths</h4>
                  <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                    {health.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
                  <h4 className="text-sm font-bold text-amber-400 mb-3 uppercase tracking-wider">Recommended Adjustments</h4>
                  <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                    {health.areas_to_improve.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
