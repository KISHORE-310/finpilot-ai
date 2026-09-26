"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Budget, Category, BudgetPeriod } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  ProgressBar,
  EmptyState,
  StatCardSkeleton,
  Modal,
} from "@/components/ui";
import { Plus, Trash2, PieChart, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      const [bList, catList] = await Promise.all([
        api.get<Budget[]>("/budgets"),
        api.get<Category[]>("/categories"),
      ]);
      setBudgets(bList || []);
      setCategories(catList || []);
    } catch (err: any) {
      console.error("Failed to load budgets", err);
      setError(err?.message || "Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalAllocated = budgets.reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent_amount || "0"), 0);
  const overallUtilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;
    try {
      setSubmitting(true);
      await api.post("/budgets", {
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId || null,
        period,
        start_date: startDate,
        currency: "INR",
      });
      setShowModal(false);
      setName("");
      setAmount("");
      setCategoryId("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to create budget.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, budgetName: string) => {
    if (!confirm(`Are you sure you want to delete "${budgetName}"?`)) return;
    try {
      await api.delete(`/budgets/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete budget");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Budget Planning"
        subtitle="Establish category guardrails and monitor deterministic spend pacing"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Budget</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Total Allocated Budget"
          value={formatCurrency(totalAllocated)}
          accentColor="default"
          subtitle="Cumulative threshold across active envelopes"
        />
        <StatCard
          label="Total Actual Outlay"
          value={formatCurrency(totalSpent)}
          accentColor={totalSpent > totalAllocated ? "rose" : "emerald"}
          subtitle={`Remaining: ${formatCurrency(Math.max(0, totalAllocated - totalSpent))}`}
        />
        <StatCard
          label="Budget Utilization"
          value={`${overallUtilization}%`}
          accentColor={overallUtilization >= 100 ? "rose" : overallUtilization >= 80 ? "amber" : "emerald"}
          subtitle={`${budgets.length} active budget envelope${budgets.length === 1 ? "" : "s"}`}
        />
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 text-rose-400 text-xs rounded-2xl border border-rose-500/30">
          {error}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          title="No Budgets Configured"
          description="Create target spending limits for categories like Dining, Groceries, Shopping, or Travel. FinPilot will continuously project your consumption rate and notify you of pacing risks."
          actionText="+ Create First Budget"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const spent = parseFloat(b.spent_amount || "0");
            const limit = parseFloat(b.amount || "1");
            const pct = b.percentage_used != null ? b.percentage_used : Math.min(100, Math.round((spent / limit) * 100));
            const isOver = spent > limit;
            const remaining = Math.max(0, limit - spent);

            return (
              <div
                key={b.id}
                className="bg-[#131622] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between hover:border-slate-700/80 transition group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight">{b.name}</h3>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {b.period} cycle
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isOver ? "danger" : pct >= 80 ? "warning" : "success"}
                        size="sm"
                      >
                        {isOver ? "OVER BUDGET" : pct >= 80 ? "PACING HIGH" : "ON TRACK"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id, b.name)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Budget"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        Spent: <span className="font-semibold text-white font-mono">{formatCurrency(spent, b.currency)}</span>
                      </span>
                      <span className="text-slate-400">
                        Cap: <span className="font-semibold text-slate-200 font-mono">{formatCurrency(limit, b.currency)}</span>
                      </span>
                    </div>

                    <ProgressBar
                      percentage={pct}
                      variant={isOver ? "danger" : pct >= 80 ? "warning" : "success"}
                      size="md"
                    />

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className={isOver ? "text-rose-400 font-semibold" : "text-emerald-400 font-medium"}>
                        {isOver ? `Over limit by ${formatCurrency(spent - limit, b.currency)}` : `${formatCurrency(remaining, b.currency)} available`}
                      </span>
                      <span className="text-slate-400 font-mono font-medium">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Linked Category</span>
                  <span className="text-slate-300 font-medium truncate max-w-[140px]">
                    {categories.find((c) => c.id === b.category_id)?.name || "All Expenses"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Budget Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Budget Cap"
        subtitle="Set a spending target and let FinPilot project real-time consumption"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Budget Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly Dining Out, Groceries Cap, Shopping & Entertainment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Spending Cap (₹)</label>
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cadence / Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category Target (Optional)</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">All Categories (General)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
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
              {submitting ? "Saving..." : "Establish Budget"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
