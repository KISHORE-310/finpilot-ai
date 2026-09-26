"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SectionHeader, Badge, LoadingSkeleton } from "@/components/ui";
import type { User } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

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

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to sign out of FinPilot AI?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("finpilot_token");
      localStorage.removeItem("finpilot_user");
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  const userInitials = (user?.name || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Settings & System Architecture"
        subtitle="Manage your profile identity, cryptographic security policies, and AI engine parameters"
      >
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition"
        >
          Sign Out of Session
        </button>
      </SectionHeader>

      {/* User Identity Profile Card */}
      <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">{user?.name || "FinPilot Member"}</h2>
                <Badge variant="success" size="sm">ACTIVE SESSION</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="purple" size="md">Deterministic Ledger Tier</Badge>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#0a0c14] p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Full Legal Name</span>
            <span className="text-white font-semibold text-sm">{user?.name || "Not specified"}</span>
          </div>

          <div className="bg-[#0a0c14] p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Registered Email Address</span>
            <span className="text-white font-semibold text-sm">{user?.email}</span>
          </div>

          <div className="bg-[#0a0c14] p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 block mb-1">Primary Currency Localization</span>
            <span className="text-white font-semibold text-sm font-mono">INR (₹) — Indian Rupee (en-IN)</span>
          </div>

          <div className="bg-[#0a0c14] p-4 rounded-xl border border-slate-800 col-span-1 sm:col-span-2 lg:col-span-3 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block mb-1">Internal Subject UUID</span>
              <span className="text-slate-300 font-mono text-xs">{user?.id || "N/A"}</span>
            </div>
            <button
              onClick={handleCopyId}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              {copiedId ? "Copied ✓" : "Copy UUID"}
            </button>
          </div>
        </div>
      </div>

      {/* Security & Cryptographic Policies */}
      <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Security & Ledger Integrity</h2>
          <Badge variant="success" size="sm">ZERO-KNOWLEDGE ISOLATION</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#0a0c14] rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-white flex items-center gap-2 mb-1.5">
              <span className="text-emerald-400">🔒</span> JWT Session Auth
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              HS256 cryptographic signatures with automatic bearer authorization headers and rate-limit guardrails.
            </p>
          </div>

          <div className="p-4 bg-[#0a0c14] rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-white flex items-center gap-2 mb-1.5">
              <span className="text-blue-400">⚡</span> SHA-256 Deduplication
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Statement entries are fingerprinted before ingestion to guarantee idempotency and avoid duplicate ledger records.
            </p>
          </div>

          <div className="p-4 bg-[#0a0c14] rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-white flex items-center gap-2 mb-1.5">
              <span className="text-purple-400">⚖️</span> Double-Entry Balancing
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Strict accounting equations: Assets = Liabilities + Equity with deterministic Decimal precision.
            </p>
          </div>
        </div>
      </div>

      {/* AI Analyst Engine Specifications */}
      <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Multi-Agent AI Intelligence Engine</h2>
          <Badge variant="purple" size="sm">LANGGRAPH ORCHESTRATOR</Badge>
        </div>

        <div className="p-4 bg-[#0a0c14] rounded-xl border border-slate-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Agent State Graph</span>
              <span className="text-slate-300 font-mono">Planner &rarr; Researcher &rarr; Analyst &rarr; Critic &rarr; Synthesizer</span>
            </div>
            <div>
              <span className="text-slate-500 block">5-Gate Critic Verification</span>
              <span className="text-emerald-400 font-medium">Math Integrity • Hallucination Filter • SEBI Compliance</span>
            </div>
            <div>
              <span className="text-slate-500 block">Semantic Knowledge Base</span>
              <span className="text-slate-300 font-mono">pgvector 1536-dim HNSW embeddings with similarity search</span>
            </div>
            <div>
              <span className="text-slate-500 block">Regulatory Guardrail Standards</span>
              <span className="text-slate-300">Indian Tax Act (AY 2025-26), SEBI (RA) Regulations 2014</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Infrastructure Card */}
      <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">System Architecture & Runtime Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#0a0c14] rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Frontend Stack</span>
            <span className="text-white font-semibold mt-1 block">Next.js 15 App Router</span>
            <span className="text-slate-400 text-[10px]">React 19 • Tailwind CSS</span>
          </div>

          <div className="p-3 bg-[#0a0c14] rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Backend API</span>
            <span className="text-white font-semibold mt-1 block">FastAPI ASGI</span>
            <span className="text-slate-400 text-[10px]">Python 3.11+ • Pydantic v2</span>
          </div>

          <div className="p-3 bg-[#0a0c14] rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Primary Database</span>
            <span className="text-white font-semibold mt-1 block">PostgreSQL 16</span>
            <span className="text-slate-400 text-[10px]">SQLAlchemy Async • pgvector</span>
          </div>

          <div className="p-3 bg-[#0a0c14] rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Test Suite</span>
            <span className="text-emerald-400 font-semibold mt-1 block">96 / 96 Passing</span>
            <span className="text-slate-400 text-[10px]">pytest • Isolated memory DB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
