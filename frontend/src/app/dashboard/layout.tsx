"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { AlertSummary } from "@/types";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/ui/CommandPalette";
import {
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
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  badgeVariant?: "purple" | "emerald" | "amber" | "blue";
  icon: (active: boolean) => React.ReactNode;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    group: "OVERVIEW",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: (active) => (
          <LayoutDashboard className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
        ),
      },
    ],
  },
  {
    group: "MONEY",
    items: [
      {
        href: "/dashboard/accounts",
        label: "Accounts",
        icon: (active) => (
          <Wallet className={`w-4 h-4 ${active ? "text-emerald-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/transactions",
        label: "Transactions",
        icon: (active) => (
          <ArrowLeftRight className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/income",
        label: "Income",
        icon: (active) => (
          <TrendingUp className={`w-4 h-4 ${active ? "text-emerald-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/expenses",
        label: "Expenses",
        icon: (active) => (
          <TrendingDown className={`w-4 h-4 ${active ? "text-rose-400" : "text-slate-400"}`} />
        ),
      },
    ],
  },
  {
    group: "PLANNING",
    items: [
      {
        href: "/dashboard/budgets",
        label: "Budgets",
        icon: (active) => (
          <PieChart className={`w-4 h-4 ${active ? "text-amber-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/goals",
        label: "Goals",
        icon: (active) => (
          <Target className={`w-4 h-4 ${active ? "text-purple-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/investments",
        label: "Investments",
        icon: (active) => (
          <LineChart className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-400"}`} />
        ),
      },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: (active) => (
          <LineChart className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/ai",
        label: "AI Analyst",
        badge: "LangGraph",
        badgeVariant: "purple",
        icon: (active) => (
          <Brain className={`w-4 h-4 ${active ? "text-purple-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/alerts",
        label: "Alerts",
        icon: (active) => (
          <Bell className={`w-4 h-4 ${active ? "text-amber-400" : "text-slate-400"}`} />
        ),
      },
    ],
  },
  {
    group: "TOOLS",
    items: [
      {
        href: "/dashboard/import",
        label: "Statement Import",
        icon: (active) => (
          <UploadCloud className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
        ),
      },
      {
        href: "/dashboard/calculators",
        label: "Simulators & Tax",
        badge: "AY 25-26",
        badgeVariant: "emerald",
        icon: (active) => (
          <Calculator className={`w-4 h-4 ${active ? "text-emerald-400" : "text-slate-400"}`} />
        ),
      },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: (active) => (
          <Settings className={`w-4 h-4 ${active ? "text-slate-300" : "text-slate-400"}`} />
        ),
      },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [userName, setUserName] = useState("FinPilot Member");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("F");

  useEffect(() => {
    const isCollapsed = localStorage.getItem("finpilot_sidebar_collapsed") === "true";
    setCollapsed(isCollapsed);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("finpilot_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("finpilot_token");
    if (!token) {
      router.push("/login");
    } else {
      api.alerts.summary().then(setAlertSummary).catch(() => {});
      try {
        const storedUser = localStorage.getItem("finpilot_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const name = parsed.name || parsed.email?.split("@")[0] || "FinPilot Member";
          setUserName(name);
          setUserEmail(parsed.email || "");
          setUserInitial(name.charAt(0).toUpperCase());
        }
      } catch {}
    }
  }, [router, pathname]);

  // Global Keyboard listener for Command Palette (Cmd/Ctrl + K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("finpilot_token");
    localStorage.removeItem("finpilot_user");
    router.push("/login");
  };

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return { section: "Overview", title: "Executive Dashboard" };

    const page = parts[1];
    switch (page) {
      case "accounts":
        return { section: "Money", title: "Accounts & Balances" };
      case "transactions":
        return { section: "Money", title: "Transaction Ledger" };
      case "income":
        return { section: "Money", title: "Income Streams" };
      case "expenses":
        return { section: "Money", title: "Expense Outflows" };
      case "budgets":
        return { section: "Planning", title: "Envelopes & Budgets" };
      case "goals":
        return { section: "Planning", title: "Financial Milestones" };
      case "investments":
        return { section: "Planning", title: "Investment Portfolio" };
      case "analytics":
        return { section: "Intelligence", title: "Deep Analytics" };
      case "ai":
        return { section: "Intelligence", title: "AI Financial Analyst" };
      case "alerts":
        return { section: "Intelligence", title: "Alert Center" };
      case "import":
        return { section: "Tools", title: "Statement Importer" };
      case "calculators":
        return { section: "Tools", title: "Simulators & Tax" };
      case "settings":
        return { section: "System", title: "Settings & Profile" };
      default:
        return { section: "Dashboard", title: page.charAt(0).toUpperCase() + page.slice(1) };
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0c14] text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500/30 selection:text-white">
        {/* Global Command Palette */}
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

        <div className="flex flex-1 min-h-screen">
          {/* ============================================================ */}
          {/* DESKTOP SIDEBAR */}
          {/* ============================================================ */}
          <aside
            className={`hidden lg:flex flex-col bg-[#111420] border-r border-slate-800/80 transition-all duration-200 z-30 shrink-0 select-none ${
              collapsed ? "w-20" : "w-64"
            }`}
          >
            {/* Header Brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
              <Link href="/dashboard" className="flex items-center gap-3 min-w-0 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 ring-1 ring-white/20 shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm tracking-tight text-white group-hover:text-blue-400 transition">
                        FinPilot AI
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                        OS
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Financial Operating System</p>
                  </div>
                )}
              </Link>

              <button
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition hidden lg:block"
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Action Shortcut */}
            {!collapsed && (
              <div className="p-3 border-b border-slate-800/60">
                <Link
                  href="/dashboard/ai"
                  className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-200 transition group shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>AI Financial Analyst</span>
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 font-mono">
                    ⌘J
                  </kbd>
                </Link>
              </div>
            )}

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
              {navGroups.map((group) => (
                <div key={group.group} className="space-y-1">
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                      {group.group}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={active ? "text-white" : ""}>{item.icon(active)}</span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!collapsed && item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                              active
                                ? "bg-white/20 text-white border-white/30"
                                : item.badgeVariant === "purple"
                                ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                : item.badgeVariant === "emerald"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {!collapsed && item.href === "/dashboard/alerts" && alertSummary && alertSummary.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {alertSummary.unread_count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Sidebar User Footer */}
            <div className="p-3 border-t border-slate-800/80 bg-[#0c0e17]">
              {!collapsed ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#111420] border border-slate-800/90">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{userName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{userEmail || "Zero-Knowledge Vault"}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </aside>

          {/* ============================================================ */}
          {/* MAIN APPLICATION CONTAINER */}
          {/* ============================================================ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Navigation Bar */}
            <header className="h-16 bg-[#111420]/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
              {/* Left Context / Breadcrumbs & Mobile Menu Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 lg:hidden transition"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">FinPilot</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400">{breadcrumbs.section}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-white font-semibold">{breadcrumbs.title}</span>
                </div>
                <div className="sm:hidden font-bold text-sm text-white truncate">{breadcrumbs.title}</div>
              </div>

              {/* Center Global Search Trigger */}
              <div className="flex-1 max-w-md mx-4 hidden md:block">
                <button
                  onClick={() => setCommandOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-1.5 bg-[#0a0c14] border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-400 transition shadow-inner group"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition" />
                    <span>Search transactions, accounts, or ask AI...</span>
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                    ⌘K
                  </kbd>
                </button>
              </div>

              {/* Right Action Icons */}
              <div className="flex items-center gap-2.5">
                {/* Mobile Search Button */}
                <button
                  onClick={() => setCommandOpen(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 md:hidden transition"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* AI Analyst Shortcut */}
                <Link
                  href="/dashboard/ai"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Analyst</span>
                </Link>

                {/* Alerts Bell */}
                <Link
                  href="/dashboard/alerts"
                  className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                  title="Alerts Center"
                >
                  <Bell className="w-4 h-4" />
                  {alertSummary && alertSummary.unread_count > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#111420]" />
                  )}
                </Link>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/60 transition text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow">
                      {userInitial}
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-[#111420] border border-slate-800/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-2.5 border-b border-slate-800 text-xs">
                          <p className="font-semibold text-white truncate">{userName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                        </div>
                        <div className="py-1 space-y-0.5">
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                          >
                            <Settings className="w-3.5 h-3.5 text-slate-400" />
                            <span>Account Settings</span>
                          </Link>
                          <Link
                            href="/dashboard/ai"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                          >
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span>AI Analyst Workspace</span>
                          </Link>
                        </div>
                        <div className="pt-1 border-t border-slate-800">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition text-left"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Page Content Body */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
              {children}
            </main>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MOBILE SLIDE-OUT DRAWER */}
        {/* ============================================================ */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-[#111420] border-r border-slate-800 flex flex-col z-50">
              <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm text-white">FinPilot AI</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {navGroups.map((group) => (
                  <div key={group.group} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                      {group.group}
                    </p>
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                            active
                              ? "bg-blue-600 text-white font-semibold"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span>{item.icon(active)}</span>
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-800 bg-[#0a0c14]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MOBILE BOTTOM NAVIGATION BAR */}
        {/* ============================================================ */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111420]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 z-30">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] transition ${
              pathname === "/dashboard" ? "text-blue-400 font-semibold" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Link
            href="/dashboard/transactions"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] transition ${
              pathname === "/dashboard/transactions" ? "text-blue-400 font-semibold" : "text-slate-400"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Ledger</span>
          </Link>
          <Link
            href="/dashboard/ai"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] transition ${
              pathname === "/dashboard/ai" ? "text-purple-400 font-semibold" : "text-slate-400"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white -mt-3 shadow-lg shadow-purple-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>AI Analyst</span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] transition ${
              pathname === "/dashboard/analytics" ? "text-blue-400 font-semibold" : "text-slate-400"
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Analytics</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] text-slate-400"
          >
            <Menu className="w-4 h-4" />
            <span>More</span>
          </button>
        </div>
      </div>
    </ToastProvider>
  );
}
