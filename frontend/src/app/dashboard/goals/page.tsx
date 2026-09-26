"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Goal, GoalType } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  ProgressBar,
  EmptyState,
  StatCardSkeleton,
  Modal,
} from "@/components/ui";
import { Plus, Trash2, Target, Calendar, CheckCircle2, ShieldCheck, Home, Plane, GraduationCap, Car, Sparkles, TrendingUp } from "lucide-react";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("emergency_fund");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const gList = await api.get<Goal[]>("/goals");
      setGoals(gList || []);
    } catch (err: any) {
      console.error("Failed to load goals", err);
      setError(err?.message || "Failed to load goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount || "0"), 0);
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || "0"), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) return;
    try {
      setSubmitting(true);
      await api.post("/goals", {
        name: name.trim(),
        goal_type: goalType,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        target_date: targetDate || null,
        notes: notes || null,
        currency: "INR",
      });
      setShowModal(false);
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setTargetDate("");
      setNotes("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to create goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, goalName: string) => {
    if (!confirm(`Are you sure you want to delete "${goalName}"?`)) return;
    try {
      await api.delete(`/goals/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete goal");
    }
  };

  const getGoalIcon = (type: GoalType) => {
    switch (type) {
      case "emergency_fund":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "retirement":
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case "vacation":
        return <Plane className="w-4 h-4 text-cyan-400" />;
      case "education":
        return <GraduationCap className="w-4 h-4 text-purple-400" />;
      case "purchase":
        return <Home className="w-4 h-4 text-amber-400" />;
      case "investment":
      case "savings":
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      default:
        return <Target className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Financial Goals & Milestones"
        subtitle="Establish capital targets, track required monthly pace, and monitor progress"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Total Capital Target"
          value={formatCurrency(totalTarget)}
          accentColor="default"
          subtitle="Cumulative milestone funding goal"
        />
        <StatCard
          label="Current Accumulated Capital"
          value={formatCurrency(totalSaved)}
          accentColor="emerald"
          subtitle={`Remaining: ${formatCurrency(Math.max(0, totalTarget - totalSaved))}`}
        />
        <StatCard
          label="Average Progress Pace"
          value={`${overallProgress}%`}
          accentColor="blue"
          subtitle={`${goals.length} active financial target${goals.length === 1 ? "" : "s"}`}
        />
      </div>

      {/* Goals Grid */}
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
      ) : goals.length === 0 ? (
        <EmptyState
          title="No Financial Goals Established"
          description="Define targets like an Emergency Reserve (6 months expenses), House Down Payment, or Retirement Corpus. Track real accumulation against your deadline."
          actionText="+ Create First Milestone"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((g) => {
            const current = parseFloat(g.current_amount || "0");
            const target = parseFloat(g.target_amount || "1");
            const pct = g.progress_percentage !== undefined ? g.progress_percentage : Math.min(100, Math.round((current / target) * 100));
            const isComplete = current >= target;

            return (
              <div
                key={g.id}
                className="bg-[#131622] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between hover:border-slate-700/80 transition group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
                        {getGoalIcon(g.goal_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base tracking-tight">{g.name}</h3>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {g.goal_type.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={isComplete ? "success" : "purple"} size="sm">
                        {isComplete ? "COMPLETED" : `${pct.toFixed(0)}%`}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id, g.name)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        Saved: <span className="font-semibold text-emerald-400 font-mono">{formatCurrency(current, g.currency)}</span>
                      </span>
                      <span className="text-slate-400">
                        Target: <span className="font-semibold text-white font-mono">{formatCurrency(target, g.currency)}</span>
                      </span>
                    </div>

                    <ProgressBar
                      percentage={pct}
                      variant={isComplete ? "success" : "default"}
                      size="md"
                    />

                    {g.target_date && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Deadline: <span className="text-slate-300 font-medium">{formatDate(g.target_date)}</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {g.notes && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 italic line-clamp-2">
                    &ldquo;{g.notes}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Financial Milestone"
        subtitle="Set a target capital goal and track required monthly pace"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Goal Name</label>
            <input
              type="text"
              required
              placeholder="e.g. 6-Month Emergency Fund, House Down Payment, Bali Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Goal Type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="emergency_fund">Emergency Fund</option>
                <option value="retirement">Retirement Corpus</option>
                <option value="purchase">Asset / Property Purchase</option>
                <option value="education">Higher Education</option>
                <option value="vacation">Travel & Vacation</option>
                <option value="wedding">Wedding / Family Milestone</option>
                <option value="debt_payoff">Debt Payoff</option>
                <option value="investment">Wealth Building</option>
                <option value="savings">General Savings</option>
                <option value="other">Other Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Capital (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Saved Capital (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Completion Date (Optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Milestone Strategy & Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Park in Liquid Mutual Fund or High-Yield Savings account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
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
              {submitting ? "Saving..." : "Set Goal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
