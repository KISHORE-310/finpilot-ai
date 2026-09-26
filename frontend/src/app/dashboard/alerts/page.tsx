"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AlertResponse, AlertSummary } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  EmptyState,
  TableSkeleton,
} from "@/components/ui";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Play } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const [list, sum] = await Promise.all([
        api.alerts.list(unreadOnly),
        api.alerts.summary().catch(() => null),
      ]);
      setAlerts(list || []);
      setSummary(sum);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.alerts.markRead(id);
      fetchAlerts();
    } catch (err: any) {
      alert("Failed to mark read: " + err.message);
    }
  };

  const handleEvaluate = async () => {
    try {
      setLoading(true);
      await api.alerts.evaluate();
      fetchAlerts();
    } catch (err: any) {
      alert("Evaluation failed: " + err.message);
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const unreadCount = summary?.unread_count || alerts.filter((a) => !a.is_read).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Financial Alert Center"
        subtitle="Deterministic rule-based notifications, anomaly flags, and budget threshold triggers"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                unreadOnly
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : "bg-[#0a0c14] text-slate-300 border-slate-800 hover:text-white"
              }`}
            >
              {unreadOnly ? "Showing Unread" : "All Alerts"}
            </button>
            <button
              type="button"
              onClick={handleEvaluate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Evaluate Rules
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Unread Notifications"
          value={`${unreadCount} Unread`}
          accentColor={unreadCount > 0 ? "amber" : "default"}
          subtitle="Pending user review"
        />
        <StatCard
          label="Critical Warnings"
          value={`${criticalCount} Critical`}
          accentColor={criticalCount > 0 ? "rose" : "default"}
          subtitle="Significant threshold overruns"
        />
        <StatCard
          label="Total Logged Alerts"
          value={`${alerts.length} Total`}
          accentColor="default"
          subtitle="Historical alert log"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <TableSkeleton rows={3} cols={3} />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-7 h-7 text-emerald-400" />}
          title="All Systems Nominal — No Active Alerts"
          description="Your budget pacing, expense thresholds, and account balances are healthy. Click 'Evaluate Rules' at any time to execute the deterministic rule engine over your latest transactions."
          actionText="Run Rules Engine"
          onAction={handleEvaluate}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((al) => {
            const isCrit = al.severity === "critical";
            const isWarn = al.severity === "warning";

            return (
              <div
                key={al.id}
                className={`p-4 sm:p-5 rounded-2xl border flex items-start justify-between gap-4 transition ${
                  al.is_read
                    ? "bg-[#131622]/60 border-slate-800/80 text-slate-400 opacity-75"
                    : isCrit
                    ? "bg-rose-500/10 border-rose-500/30 text-white shadow-sm"
                    : isWarn
                    ? "bg-amber-500/10 border-amber-500/30 text-white shadow-sm"
                    : "bg-[#131622] border-slate-800/90 text-white shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      isCrit
                        ? "bg-rose-500/20 text-rose-400"
                        : isWarn
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {isCrit && <AlertCircle className="w-4 h-4" />}
                    {isWarn && <AlertTriangle className="w-4 h-4" />}
                    {!isCrit && !isWarn && <Info className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={isCrit ? "danger" : isWarn ? "warning" : "info"} size="sm">
                        {al.severity.toUpperCase()}
                      </Badge>
                      <h3 className="font-bold text-xs sm:text-sm text-white tracking-tight">{al.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{al.message}</p>
                  </div>
                </div>

                {!al.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(al.id)}
                    className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold shrink-0 transition active:scale-95"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
