"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Investment, Account, AssetType } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  EmptyState,
  TableSkeleton,
  Modal,
} from "@/components/ui";
import { Plus, Trash2, TrendingUp, DollarSign, Layers, PieChart } from "lucide-react";

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [quantity, setQuantity] = useState("");
  const [averageCost, setAverageCost] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invs, accs] = await Promise.all([
        api.get<Investment[]>("/investments"),
        api.get<Account[]>("/accounts"),
      ]);
      setInvestments(invs || []);
      setAccounts(accs || []);
      if (!accountId && accs && accs.length > 0) {
        setAccountId(accs[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load investments", err);
      setError(err?.message || "Failed to load investments.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalValue = investments.reduce((acc, i) => acc + parseFloat(i.current_value || "0"), 0);
  const totalCost = investments.reduce((acc, i) => {
    const qty = parseFloat(i.quantity || "0");
    const avg = parseFloat(i.average_cost || "0");
    return acc + qty * avg;
  }, 0);
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !accountId) return;
    try {
      setSubmitting(true);
      await api.post("/investments", {
        account_id: accountId,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase() || null,
        asset_type: assetType,
        quantity: parseFloat(quantity) || 0,
        average_cost: parseFloat(averageCost) || 0,
        current_value: parseFloat(currentValue) || 0,
        currency: "INR",
      });
      setShowModal(false);
      setName("");
      setSymbol("");
      setQuantity("");
      setAverageCost("");
      setCurrentValue("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to add investment holding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, holdingName: string) => {
    if (!confirm(`Delete "${holdingName}" from your investment portfolio?`)) return;
    try {
      await api.delete(`/investments/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete investment");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Investment Portfolio"
        subtitle="Multi-asset holdings, cost basis ledger, unrealized P&L, and asset allocation"
        actions={
          <button
            type="button"
            onClick={() => {
              if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Position</span>
          </button>
        }
      />

      {/* Portfolio Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Total Portfolio Value"
          value={formatCurrency(totalValue)}
          accentColor="default"
          subtitle="Cumulative market valuation of recorded positions"
        />
        <StatCard
          label="Total Cost Basis"
          value={formatCurrency(totalCost)}
          accentColor="default"
          subtitle="Invested capital expenditure"
        />
        <StatCard
          label="Unrealized Capital P&L"
          value={`${totalGain >= 0 ? "+" : ""}${formatCurrency(totalGain)}`}
          accentColor={totalGain >= 0 ? "emerald" : "rose"}
          trendBadge={
            <Badge variant={totalGain >= 0 ? "success" : "danger"} size="sm">
              {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%
            </Badge>
          }
          subtitle="Net return on invested capital"
        />
      </div>

      {/* Holdings Table Card */}
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Portfolio Positions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Asset allocations and stored valuations</p>
          </div>
          <span className="text-xs text-slate-400">{investments.length} Holdings</span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        ) : investments.length === 0 ? (
          <EmptyState
            title="No Investment Holdings Recorded"
            description="Track your equities (e.g. NIFTYBEES, Reliance), mutual funds, gold sovereign bonds, and crypto allocations to monitor consolidated net worth."
            actionText="+ Record First Position"
            onAction={() => {
              if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
              setShowModal(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Asset / Symbol</th>
                  <th className="px-6 py-3.5 font-semibold">Asset Class</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Units / Avg Buy</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Cost Basis</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Current Value</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Unrealized P&L</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {investments.map((inv) => {
                  const qty = parseFloat(inv.quantity || "0");
                  const avg = parseFloat(inv.average_cost || "0");
                  const cost = qty * avg;
                  const curVal = parseFloat(inv.current_value || "0");
                  const pnl = curVal - cost;
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white truncate max-w-xs">{inv.name}</div>
                        {inv.symbol && (
                          <div className="text-[11px] text-blue-400 font-mono mt-0.5">{inv.symbol}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="purple" size="sm">
                          {inv.asset_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-slate-300">
                        {qty} units @ {formatCurrency(avg, inv.currency)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                        {formatCurrency(cost, inv.currency)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white font-mono text-sm">
                        {formatCurrency(curVal, inv.currency)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-xs sm:text-sm">
                        <span className={pnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                          {pnl >= 0 ? "+" : ""}{formatCurrency(pnl, inv.currency)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id, inv.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Holding"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Portfolio Position"
        subtitle="Record equity shares, mutual fund units, or precious metal holdings"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Reliance Industries, Nifty 50 ETF"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ticker / Symbol (Optional)</label>
              <input
                type="text"
                placeholder="e.g. RELIANCE, NIFTYBEES, BTC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Class</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition capitalize"
              >
                <option value="stock">Equity / Stock</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="real_estate">Real Estate</option>
                <option value="commodity">Precious Metals / Gold</option>
                <option value="bond">Bonds / Fixed Income</option>
                <option value="other">Other Asset</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Holding Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                required
              >
                <option value="" disabled>Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Quantity / Units</label>
              <input
                type="number"
                step="0.0001"
                required
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Average Buy (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="2500.00"
                value={averageCost}
                onChange={(e) => setAverageCost(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Value (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="28000.00"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Position"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
