"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { AlertSummary } from "@/types";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: (active: boolean) => React.ReactNode;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    group: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: "/dashboard/ai",
        label: "AI Analyst",
        badge: "LangGraph",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-purple-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/calculators",
        label: "Simulators & Tax",
        badge: "New",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Ledger & Cash Flow",
    items: [
      {
        href: "/dashboard/accounts",
        label: "Accounts",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/transactions",
        label: "Transactions",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ),
      },
      {
        href: "/dashboard/income",
        label: "Income",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-emerald-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
      {
        href: "/dashboard/expenses",
        label: "Expenses",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-rose-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 12H4" />
          </svg>
        ),
      },
      {
        href: "/dashboard/import",
        label: "Statement Import",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Planning & Assets",
    items: [
      {
        href: "/dashboard/budgets",
        label: "Budgets",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/goals",
        label: "Goals",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/investments",
        label: "Investments",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        href: "/dashboard/alerts",
        label: "Alerts",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-amber-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: (active) => (
          <svg className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("U");

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
          const name = parsed.name || parsed.email?.split("@")[0] || "User";
          setUserName(name);
          setUserEmail(parsed.email || "");
          setUserInitial(name.charAt(0).toUpperCase());
        }
      } catch {}
    }
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("finpilot_token");
    localStorage.removeItem("finpilot_user");
    router.push("/login");
  };

  // Find active label for top bar title
  let currentPageTitle = "Dashboard";
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)) {
        currentPageTitle = item.label;
        break;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0c14] text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 min-h-screen">
        {/* Desktop Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 h-screen z-50 w-64 bg-[#111420] border-r border-slate-800/80 flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center px-5 border-b border-slate-800/80 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base tracking-tight leading-none flex items-center gap-1.5">
                  FinPilot AI
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    INR
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
                  Financial Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Groups */}
          <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto scrollbar-thin">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-blue-600/15 text-blue-300 border border-blue-500/30 font-semibold shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.icon(isActive)}
                        <span>{item.label}</span>
                      </div>
                      {item.href === "/dashboard/alerts" && alertSummary && alertSummary.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {alertSummary.unread_count}
                        </span>
                      )}
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User Account / Logout Footer */}
          <div className="p-3 border-t border-slate-800/80 shrink-0 bg-[#0d0f1a]/80">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{userEmail || "Connected"}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 bg-[#111420]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 border border-slate-800/80"
                aria-label="Open Navigation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="hidden sm:inline">FinPilot</span>
                <span className="hidden sm:inline text-slate-400">/</span>
                <span className="font-semibold text-white">{currentPageTitle}</span>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard/transactions"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Record Tx
              </Link>

              <Link
                href="/dashboard/ai"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/10 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Analyst
              </Link>

              <Link
                href="/dashboard/alerts"
                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl border border-slate-800/80 transition"
                title="Notifications"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {alertSummary && alertSummary.unread_count > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-[#111420] animate-pulse" />
                )}
              </Link>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#111420]/95 backdrop-blur-lg border-t border-slate-800/90 z-30 px-3 py-2 flex items-center justify-around">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            pathname === "/dashboard" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>
        <Link
          href="/dashboard/ai"
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            pathname.startsWith("/dashboard/ai") ? "text-purple-400 font-bold" : "text-slate-400"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Analyst
        </Link>
        <Link
          href="/dashboard/transactions"
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            pathname.startsWith("/dashboard/transactions") ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Ledger
        </Link>
        <Link
          href="/dashboard/analytics"
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            pathname.startsWith("/dashboard/analytics") ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          More
        </button>
      </nav>
    </div>
  );
}
