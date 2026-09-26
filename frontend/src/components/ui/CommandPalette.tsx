"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Repeat,
  PieChart,
  Target,
  LineChart,
  Brain,
  Bell,
  UploadCloud,
  Calculator,
  Settings,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  category: "Navigation" | "AI Quick Actions" | "Financial Tools";
  title: string;
  subtitle?: string;
  href?: string;
  action?: () => void;
  icon: React.ReactNode;
}

const defaultCommands: CommandItem[] = [
  // Navigation
  {
    id: "nav-dashboard",
    category: "Navigation",
    title: "Executive Dashboard",
    subtitle: "Real-time net worth, cash flow & health score",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-4 h-4 text-blue-400" />,
  },
  {
    id: "nav-accounts",
    category: "Navigation",
    title: "Financial Accounts",
    subtitle: "Bank deposits, credit lines, investment accounts",
    href: "/dashboard/accounts",
    icon: <Wallet className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: "nav-transactions",
    category: "Navigation",
    title: "Ledger Transactions",
    subtitle: "Search, filter & audit double-entry ledger",
    href: "/dashboard/transactions",
    icon: <ArrowLeftRight className="w-4 h-4 text-slate-400" />,
  },
  {
    id: "nav-income",
    category: "Navigation",
    title: "Income Streams",
    subtitle: "Inflow tracking, salary, dividends & stability index",
    href: "/dashboard/income",
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: "nav-expenses",
    category: "Navigation",
    title: "Expense Management",
    subtitle: "Outflow breakdown, category distribution & recurring costs",
    href: "/dashboard/expenses",
    icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
  },
  {
    id: "nav-budgets",
    category: "Navigation",
    title: "Budgets & Envelopes",
    subtitle: "Spending limits, pacing alerts & envelope discipline",
    href: "/dashboard/budgets",
    icon: <PieChart className="w-4 h-4 text-amber-400" />,
  },
  {
    id: "nav-goals",
    category: "Navigation",
    title: "Financial Goals",
    subtitle: "Milestones, required monthly pace & target capital",
    href: "/dashboard/goals",
    icon: <Target className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "nav-investments",
    category: "Navigation",
    title: "Investment Portfolio",
    subtitle: "Holdings, asset allocation, cost basis & P&L",
    href: "/dashboard/investments",
    icon: <LineChart className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: "nav-analytics",
    category: "Navigation",
    title: "Deep Financial Analytics",
    subtitle: "Cash flow trajectory, 50/30/20 rule & anomaly detector",
    href: "/dashboard/analytics",
    icon: <LineChart className="w-4 h-4 text-blue-400" />,
  },
  {
    id: "nav-ai",
    category: "Navigation",
    title: "AI Financial Analyst",
    subtitle: "Multi-agent LangGraph advisor with RAG intelligence",
    href: "/dashboard/ai",
    icon: <Brain className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "nav-alerts",
    category: "Navigation",
    title: "Alert Center",
    subtitle: "Critical thresholds, pacing warnings & notifications",
    href: "/dashboard/alerts",
    icon: <Bell className="w-4 h-4 text-amber-400" />,
  },
  {
    id: "nav-import",
    category: "Navigation",
    title: "CSV Statement Importer",
    subtitle: "Upload bank statements with SHA-256 deduplication",
    href: "/dashboard/import",
    icon: <UploadCloud className="w-4 h-4 text-blue-400" />,
  },
  {
    id: "nav-calculators",
    category: "Navigation",
    title: "Tax & FIRE Simulators",
    subtitle: "Old vs New tax regime, FIRE compounding & EMI optimizer",
    href: "/dashboard/calculators",
    icon: <Calculator className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: "nav-settings",
    category: "Navigation",
    title: "Settings & System",
    subtitle: "Profile, cryptographic security & AI parameters",
    href: "/dashboard/settings",
    icon: <Settings className="w-4 h-4 text-slate-400" />,
  },

  // AI Quick Actions
  {
    id: "ai-cashflow",
    category: "AI Quick Actions",
    title: "Analyze My Cash Flow Health",
    subtitle: "Prompt AI to evaluate monthly surplus and savings rate",
    href: "/dashboard/ai?prompt=Analyze%20my%20recent%20cash%20flow%20and%20savings%20rate%20trends",
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "ai-budgets",
    category: "AI Quick Actions",
    title: "Check Budget Pacing & Overruns",
    subtitle: "Ask AI for categories pacing higher than expected",
    href: "/dashboard/ai?prompt=Which%20budget%20categories%20am%20I%20at%20risk%20of%20exceeding%20this%20month%3F",
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "ai-tax",
    category: "AI Quick Actions",
    title: "Optimize Indian Income Tax (AY 2025-26)",
    subtitle: "Ask AI whether Old or New Regime saves more taxes",
    href: "/dashboard/ai?prompt=Compare%20my%20tax%20liability%20under%20the%20Old%20and%20New%20tax%20regimes%20for%20FY%202024-25",
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "ai-anomalies",
    category: "AI Quick Actions",
    title: "Detect Statistical Spending Anomalies",
    subtitle: "Ask AI to flag expenses exceeding 2.5 standard deviations",
    href: "/dashboard/ai?prompt=Have%20there%20been%20any%20statistical%20spending%20anomalies%20or%20unusual%20charges%20recently%3F",
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredCommands = query.trim()
    ? defaultCommands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : defaultCommands;

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [onClose, router]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-[#111420] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-800/90 bg-[#0a0c14]/80">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, page, or AI inquiry... (e.g. 'budget', 'tax', 'cash flow')"
            className="w-full px-3.5 py-4 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-white rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 ml-2 font-mono">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching commands or pages found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-blue-600/15 border border-blue-500/30 text-white"
                      : "hover:bg-slate-800/40 text-slate-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-blue-600/30 text-white" : "bg-slate-800/80 text-slate-400"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#0a0c14] border-t border-slate-800/90 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                ↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                ↵
              </kbd>{" "}
              Select
            </span>
          </div>
          <span className="text-slate-500 font-mono">FinPilot Command Palette</span>
        </div>
      </div>
    </div>
  );
}
