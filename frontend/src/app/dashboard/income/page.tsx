"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Income, Account, Category, IncomeSource } from "@/types";

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [source, setSource] = useState<IncomeSource>("salary");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [incList, accList, catList] = await Promise.all([
        api.get<Income[]>("/income"),
        api.get<Account[]>("/accounts"),
        api.get<Category[]>("/categories"),
      ]);
      setIncomes(incList);
      setAccounts(accList);
      setCategories(catList);
      if (!accountId && accList.length > 0) {
        setAccountId(accList[0].id);
      }
    } catch (err) {
      console.error("Failed to load income records", err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalMonthlyIncome = incomes.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/income", {
        source,
        amount: parseFloat(amount),
        account_id: accountId || null,
        category_id: categoryId || null,
        is_recurring: isRecurring,
        date: incomeDate,
        description: description || null,
        currency: "INR",
      });
      setShowModal(false);
      setAmount("");
      setDescription("");
      await loadData();
    } catch (err) {
      alert("Failed to add income record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this income entry?")) return;
    try {
      await api.delete(`/income/${id}`);
      await loadData();
    } catch (err) {
      alert("Failed to delete income");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Income Streams</h1>
          <p className="text-slate-400 text-sm mt-1">Salary, freelancing, investments, and cashflow streams</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <span>+ Add Income</span>
        </button>
      </div>

      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
        <p className="text-xs text-slate-400 font-medium">Total Recorded Income</p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(totalMonthlyIncome)}</p>
      </div>

      {/* Income List */}
      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading income streams...</div>
        ) : incomes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No income streams recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#131622] text-xs uppercase text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Recurring?</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(inc.date)}</td>
                    <td className="px-6 py-4 font-medium text-white capitalize">{inc.source.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-slate-400">{inc.description || '—'}</td>
                    <td className="px-6 py-4">
                      {inc.is_recurring ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">Recurring</span>
                      ) : (
                        <span className="text-xs text-slate-500">One-time</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                      +{formatCurrency(inc.amount, inc.currency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(inc.id)}
                        className="text-red-400 hover:text-red-300 text-xs transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Income Stream</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Income Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as IncomeSource)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="salary">Salary / Wages</option>
                  <option value="freelance">Freelance / Consulting</option>
                  <option value="business">Business Income</option>
                  <option value="investments">Dividends / Capital Gains</option>
                  <option value="rental">Rental Income</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="85000.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Destination Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">No account (unlinked)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Salary, Freelance Client Invoice, Dividend Payout"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rec"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-[#0f1117] border-slate-700"
                />
                <label htmlFor="rec" className="text-xs text-slate-300">Recurring income stream</label>
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
                  {submitting ? "Saving..." : "Add Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
