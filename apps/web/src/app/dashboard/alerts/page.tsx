"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertResponse, AlertSummary } from "@/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [list, sum] = await Promise.all([
        api.alerts.list(unreadOnly),
        api.alerts.summary(),
      ]);
      setAlerts(list);
      setSummary(sum);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [unreadOnly]);

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#1a1d2e] p-6 rounded-2xl border border-slate-700/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Financial Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">Rule-based deterministic notifications and warnings</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              unreadOnly
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            {unreadOnly ? "Showing Unread" : "All Alerts"}
          </button>
          <button
            onClick={handleEvaluate}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white rounded-lg text-xs font-bold shadow"
          >
            Run Alert Rules
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-48 bg-[#1a1d2e] rounded-2xl border border-slate-700/50 animate-pulse flex items-center justify-center text-slate-500">
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-[#1a1d2e] p-12 rounded-2xl border border-slate-700/50 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white">No active alerts</h3>
          <p className="text-xs text-slate-400 mt-1">All financial rules and budgets are currently in nominal condition.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((al) => (
            <div
              key={al.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition ${
                al.is_read
                  ? "bg-[#1a1d2e]/60 border-slate-800 text-slate-400"
                  : al.severity === "critical"
                  ? "bg-rose-500/10 border-rose-500/30 text-white"
                  : al.severity === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-white"
                  : "bg-blue-500/10 border-blue-500/30 text-white"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      al.severity === "critical"
                        ? "bg-rose-500/20 text-rose-300"
                        : al.severity === "warning"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {al.severity}
                  </span>
                  <h3 className="font-bold text-sm text-white">{al.title}</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{al.message}</p>
              </div>

              {!al.is_read && (
                <button
                  onClick={() => handleMarkRead(al.id)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium shrink-0 transition"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
