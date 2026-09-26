"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Income, Account, Category, IncomeSource } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  EmptyState,
  TableSkeleton,
  Modal,
} from "@/components/ui";
import { Plus, Trash2, ArrowDownLeft, Repeat, Wallet } from "lucide-react";

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      const [incList, accList, catList] = await Promise.all([
        api.get<Income[]>("/income"),
        api.get<Account[]>("/accounts"),
        api.get<Category[]>("/categories"),
      ]);
      setIncomes(incList || []);
      setAccounts(accList || []);
      setCategories(catList || []);
      if (!accountId && accList && accList.length > 0) {
        setAccountId(accList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load income records", err);
      setError(err?.message || "Failed to load income records.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIncome = incomes.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const recurringCount = incomes.filter((item) => item.is_recurring).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
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
      setIsRecurring(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to add income record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this income entry?")) return;
    try {
      await api.delete(`/income/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete income");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Income Streams"
        subtitle="Salary, consulting, business dividends, investments, and recurring inflows"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Total Recorded Inflows"
          value={formatCurrency(totalIncome)}
          accentColor="emerald"
          subtitle="Aggregated income entries"
        />
        <StatCard
          label="Active Streams"
          value={`${incomes.length} Streams`}
          accentColor="default"
          subtitle="Distinct income source records"
        />
        <StatCard
          label="Recurring Retainers"
          value={`${recurringCount} Recurring`}
          accentColor="blue"
          subtitle="Automated monthly cashflow streams"
        />
      </div>

      {/* Incomes Table Card */}
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recorded Income Entries</h2>
            <p className="text-xs text-slate-400 mt-0.5">Chronological record of verified financial inflows</p>
          </div>
          <span className="text-xs text-slate-400">{incomes.length} Total</span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        ) : incomes.length === 0 ? (
          <EmptyState
            title="No Income Streams Recorded"
            description="Track your regular paychecks, consulting revenue, dividends, and other deposits. Add your first income entry to establish your cash flow baseline."
            actionText="+ Record Income Entry"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Source</th>
                  <th className="px-6 py-3.5 font-semibold">Description</th>
                  <th className="px-6 py-3.5 font-semibold">Depository Account</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incomes.map((inc) => {
                  const acc = accounts.find((a) => a.id === inc.account_id);
                  return (
                    <tr key={inc.id} className="hover:bg-slate-800/30 transition group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                        {formatDate(inc.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="success" size="sm">
                            <ArrowDownLeft className="w-3 h-3 mr-0.5" />
                            {inc.source.toUpperCase()}
                          </Badge>
                          {inc.is_recurring && (
                            <span className="p-1 rounded bg-blue-500/10 text-blue-400 text-[10px]" title="Recurring">
                              <Repeat className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white truncate max-w-xs">
                        {inc.description || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {acc?.name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400 font-mono text-sm sm:text-base">
                        +{formatCurrency(inc.amount, inc.currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(inc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Income"
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

      {/* Add Income Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Income Stream"
        subtitle="Log salary, investment gains, freelancing, or secondary cash inflows"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Income Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as IncomeSource)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition capitalize"
              >
                <option value="salary">Salary</option>
                <option value="freelance">Freelance / Consulting</option>
                <option value="investments">Investments / Dividends</option>
                <option value="business">Business Revenue</option>
                <option value="rental">Rental Income</option>
                <option value="gift">Gift / Bonus</option>
                <option value="other">Other Inflow</option>
              </select>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deposit Account</label>
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
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly Base Salary, Consulting Retainer from Client"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0a0c14] border border-slate-700 text-blue-600 focus:ring-0 focus:outline-none"
            />
            <label htmlFor="recurring" className="text-xs text-slate-300 font-medium cursor-pointer">
              Recurring Monthly Cash Inflow
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
              {submitting ? "Saving..." : "Record Income"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
