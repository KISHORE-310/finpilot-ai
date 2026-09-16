"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Investment, Account, AssetType } from "@/types";

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [invs, accs] = await Promise.all([
        api.get<Investment[]>("/investments"),
        api.get<Account[]>("/accounts"),
      ]);
      setInvestments(invs);
      setAccounts(accs);
      if (!accountId && accs.length > 0) {
        setAccountId(accs[0].id);
      }
    } catch (err) {
      console.error("Failed to load investments", err);
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
    try {
      setSubmitting(true);
      await api.post("/investments", {
        account_id: accountId,
        name,
        symbol: symbol.toUpperCase() || null,
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
    } catch (err) {
      alert("Failed to add investment holding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investment holding?")) return;
    try {
      await api.delete(`/investments/${id}`);
      await loadData();
    } catch (err) {
      alert("Failed to delete investment");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Investments & Portfolio</h1>
          <p className="text-slate-400 text-sm mt-1">Multi-asset portfolio tracking and asset allocations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <span>+ Add Holding</span>
        </button>
      </div>

      {/* Portfolio Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium">Total Portfolio Value</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium">Total Cost Basis</p>
          <p className="text-2xl font-bold text-slate-300 mt-1">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium">Total Unrealized P&L</p>
          <p className={`text-2xl font-bold mt-1 ${totalGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)} ({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading portfolio...</div>
        ) : investments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No holdings added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#131622] text-xs uppercase text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-3.5">Asset / Symbol</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Quantity</th>
                  <th className="px-6 py-3.5 text-right">Avg Cost</th>
                  <th className="px-6 py-3.5 text-right">Current Value</th>
                  <th className="px-6 py-3.5 text-right">P&L</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {investments.map((inv) => {
                  const qty = parseFloat(inv.quantity || "0");
                  const avg = parseFloat(inv.average_cost || "0");
                  const val = parseFloat(inv.current_value || "0");
                  const cost = qty * avg;
                  const pl = val - cost;
                  const plPct = cost > 0 ? (pl / cost) * 100 : 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-xs font-semibold">
                            {inv.symbol || "N/A"}
                          </span>
                          <span>{inv.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                          {inv.asset_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-300">{qty.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(avg, inv.currency)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(val, inv.currency)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pl >= 0 ? "+" : ""}{formatCurrency(pl, inv.currency)} ({plPct.toFixed(1)}%)
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-red-400 hover:text-red-300 text-xs transition"
                        >
                          Delete
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Holding</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Holding Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Flexi Cap Direct, Reliance Industries, Nifty 50 ETF"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ticker / Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. RELIANCE, HDFCBANK, NIFTYBEES"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Asset Class</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as AssetType)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="stock">Equity Stock</option>
                    <option value="mutual_fund">Mutual Fund / SIP</option>
                    <option value="etf">ETF</option>
                    <option value="bond">Government / Corporate Bond (PPF/FD)</option>
                    <option value="crypto">Crypto</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Avg Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2500.00"
                    value={averageCost}
                    onChange={(e) => setAverageCost(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Total Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="28000.00"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Associated Account</label>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Holding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
