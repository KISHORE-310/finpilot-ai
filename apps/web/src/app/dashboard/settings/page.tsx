"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<User>("/auth/me");
      setUser(data);
    } catch (err) {
      console.error("Failed to load user profile", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings & Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account information and preferences</p>
      </div>

      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-6 shadow-lg space-y-6">
        <h2 className="text-lg font-semibold text-white">User Profile</h2>
        {loading ? (
          <p className="text-slate-400">Loading profile...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-[#0f1117] p-4 rounded-lg border border-slate-700/40">
              <span className="text-xs text-slate-500 block">Full Name</span>
              <span className="text-white font-medium">{user?.name || "Not set"}</span>
            </div>
            <div className="bg-[#0f1117] p-4 rounded-lg border border-slate-700/40">
              <span className="text-xs text-slate-500 block">Email Address</span>
              <span className="text-white font-medium">{user?.email}</span>
            </div>
            <div className="bg-[#0f1117] p-4 rounded-lg border border-slate-700/40">
              <span className="text-xs text-slate-500 block">Account Status</span>
              <span className="text-emerald-400 font-medium">Active</span>
            </div>
            <div className="bg-[#0f1117] p-4 rounded-lg border border-slate-700/40">
              <span className="text-xs text-slate-500 block">User ID</span>
              <span className="text-slate-400 font-mono text-xs">{user?.id}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold text-white">Application Info</h2>
        <div className="text-sm text-slate-400 space-y-2">
          <p><strong className="text-slate-300">Version:</strong> FinPilot AI v1.0.0 (Phase 1 Foundation)</p>
          <p><strong className="text-slate-300">Data Architecture:</strong> Transaction Ledger & Account Balance Synchronization</p>
          <p><strong className="text-slate-300">Environment:</strong> Local / Docker Isolated</p>
        </div>
      </div>
    </div>
  );
}
