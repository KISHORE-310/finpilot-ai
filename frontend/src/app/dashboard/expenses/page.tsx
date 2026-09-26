"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense, Account, Category } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  EmptyState,
  TableSkeleton,
  Modal,
} from "@/components/ui";
import { Plus, Trash2, ArrowUpRight, Repeat, ShoppingBag } from "lucide-react";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      const [expList, accList, catList] = await Promise.all([
        api.get<Expense[]>("/expenses"),
        api.get<Account[]>("/accounts"),
        api.get<Category[]>("/categories"),
      ]);
      setExpenses(expList || []);
      setAccounts(accList || []);
      setCategories(catList || []);
      if (!accountId && accList && accList.length > 0) {
        setAccountId(accList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load expenses", err);
      setError(err?.message || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const recurringCount = expenses.filter((item) => item.is_recurring).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;
    try {
      setSubmitting(true);
      await api.post("/expenses", {
        name: name.trim(),
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
      setIsRecurring(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to add expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense entry?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete expense");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Expense Log"
        subtitle="Track direct expenditures, vendor outlays, utility bills, and recurring commitments"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Total Recorded Outflows"
          value={formatCurrency(totalExpenses)}
          accentColor="rose"
          subtitle="Cumulative logged expenditures"
        />
        <StatCard
          label="Expense Entries"
          value={`${expenses.length} Records`}
          accentColor="default"
          subtitle="Tracked line items"
        />
        <StatCard
          label="Recurring Commitments"
          value={`${recurringCount} Active`}
          accentColor="amber"
          subtitle="Fixed periodic bills & subscriptions"
        />
      </div>

      {/* Expenses Table Card */}
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recorded Expenditures</h2>
            <p className="text-xs text-slate-400 mt-0.5">Categorized outflow history</p>
          </div>
          <span className="text-xs text-slate-400">{expenses.length} Total</span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No Expenses Logged Yet"
            description="Log your daily expenditures, grocery runs, rent payments, and subscription bills to maintain full visibility over your cash flow."
            actionText="+ Record First Expense"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Expense Name</th>
                  <th className="px-6 py-3.5 font-semibold">Description</th>
                  <th className="px-6 py-3.5 font-semibold">Account / Type</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((exp) => {
                  const acc = accounts.find((a) => a.id === exp.account_id);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/30 transition group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                        {formatDate(exp.date)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{exp.name}</span>
                          {exp.is_recurring && (
                            <Badge variant="warning" size="sm">
                              <Repeat className="w-3 h-3 mr-0.5" />
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 truncate max-w-xs text-xs">
                        {exp.description || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {acc?.name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-400 font-mono text-sm sm:text-base">
                        -{formatCurrency(exp.amount, exp.currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Expense"
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

      {/* Add Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record New Expense"
        subtitle="Log an outflow from your accounts and update category allocations"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Expense Name / Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Supermarket Groceries, Electricity Bill, Rent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">None (Unassigned)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly Wi-Fi subscription, Grocery shopping at Nature's Basket"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="recurring-exp"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0a0c14] border border-slate-700 text-blue-600 focus:ring-0 focus:outline-none"
            />
            <label htmlFor="recurring-exp" className="text-xs text-slate-300 font-medium cursor-pointer">
              Recurring Monthly Outflow / Subscription
            </label>
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
              {submitting ? "Saving..." : "Record Expense"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
