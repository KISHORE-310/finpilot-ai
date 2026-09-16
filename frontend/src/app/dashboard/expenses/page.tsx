"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense, Account, Category } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [expList, accList, catList] = await Promise.all([
        api.get<Expense[]>("/expenses"),
        api.get<Account[]>("/accounts"),
        api.get<Category[]>("/categories"),
      ]);
      setExpenses(expList);
      setAccounts(accList);
      setCategories(catList);
      if (!accountId && accList.length > 0) {
        setAccountId(accList[0].id);
      }
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/expenses", {
        name,
        amount: parseFloat(amount),
        account_id: accountId || null,
        category_id: categoryId || null,
        is_recurring: isRecurring,
        date: expenseDate,
        description: description || null,
        currency: "INR",
      });
      setShowModal(false);
      setName("");
      setAmount("");
      setDescription("");
      await loadData();
    } catch (err) {
      alert("Failed to add expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense entry?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      await loadData();
    } catch (err) {
      alert("Failed to delete expense");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">Direct expense management and recurring bill tracking</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <span>+ Add Expense</span>
        </button>
      </div>

      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
        <p className="text-xs text-slate-400 font-medium">Total Recorded Expenses</p>
        <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(totalExpenses)}</p>
      </div>

      {/* Expense List */}
      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No expenses recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#131622] text-xs uppercase text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Recurring?</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(exp.date)}</td>
                    <td className="px-6 py-4 font-medium text-white">{exp.name}</td>
                    <td className="px-6 py-4 text-slate-400">{exp.description || '—'}</td>
                    <td className="px-6 py-4">
                      {exp.is_recurring ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">Recurring</span>
                      ) : (
                        <span className="text-xs text-slate-500">One-time</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-400">
                      -{formatCurrency(exp.amount, exp.currency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(exp.id)}
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
            <h2 className="text-xl font-bold text-white mb-4">Add Expense</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill, House Rent, Broadband"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source Account</label>
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
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly utilities, Jio Fiber, Society maintenance"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exp_rec"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-[#0f1117] border-slate-700"
                />
                <label htmlFor="exp_rec" className="text-xs text-slate-300">Recurring expense</label>
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
                  {submitting ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
