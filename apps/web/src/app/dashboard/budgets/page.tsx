"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Budget, Category, BudgetPeriod } from "@/types";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bList, catList] = await Promise.all([
        api.get<Budget[]>("/budgets"),
        api.get<Category[]>("/categories"),
      ]);
      setBudgets(bList);
      setCategories(catList);
    } catch (err) {
      console.error("Failed to load budgets", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/budgets", {
        name,
        amount: parseFloat(amount),
        category_id: categoryId || null,
        period,
        start_date: startDate,
        currency: "USD",
      });
      setShowModal(false);
      setName("");
      setAmount("");
      setCategoryId("");
      await loadData();
    } catch (err) {
      alert("Failed to create budget.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    try {
      await api.delete(`/budgets/${id}`);
      await loadData();
    } catch (err) {
      alert("Failed to delete budget");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-slate-400 text-sm mt-1">Track category-level and custom spending thresholds</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <span>+ Create Budget</span>
        </button>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400">No active budgets found.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-sm text-blue-400 hover:underline"
          >
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const spent = parseFloat(b.spent_amount || "0");
            const limit = parseFloat(b.amount || "1");
            const pct = b.percentage_used ?? Math.min(100, Math.round((spent / limit) * 100));
            const isOver = spent > limit;

            return (
              <div key={b.id} className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-white text-base">{b.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 capitalize">
                        {b.period}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-slate-500 hover:text-red-400 text-xs transition"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Spent: {formatCurrency(spent, b.currency)}</span>
                      <span className="text-white font-medium">Limit: {formatCurrency(limit, b.currency)}</span>
                    </div>

                    <div className="h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 pt-1">
                      <span>{pct.toFixed(0)}% used</span>
                      <span className={isOver ? "text-red-400 font-semibold" : "text-slate-400"}>
                        {isOver ? `Over by ${formatCurrency(spent - limit, b.currency)}` : `Left: ${formatCurrency(limit - spent, b.currency)}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/40 text-xs text-slate-500">
                  Starts: {formatDate(b.start_date)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create Budget</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Budget Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Dining Out, Groceries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Limit Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category (Optional)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">All / Unassigned</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
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
                  {submitting ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
