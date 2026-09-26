"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Account, AccountType, NetWorthSummary } from "@/types";
import {
  SectionHeader,
  StatCard,
  Badge,
  EmptyState,
  TableSkeleton,
  Modal,
  useToast,
} from "@/components/ui";
import { Building2, CreditCard, Wallet, Landmark, Trash2, Plus, LineChart, Search } from "lucide-react";

type AccountFilterCategory = "all" | "depository" | "credit" | "investment" | "other";

export default function AccountsPage() {
  const { success, error: toastError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<AccountFilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [institution, setInstitution] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [currentBalance, setCurrentBalance] = useState("0.00");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accs, nw] = await Promise.all([
        api.get<Account[]>("/accounts"),
        api.get<NetWorthSummary>("/accounts/net-worth-summary").catch(() => null),
      ]);
      setAccounts(accs || []);
      setNetWorth(nw);
    } catch (err: any) {
      console.error("Failed to load accounts", err);
      setError(err?.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await api.post("/accounts", {
        name: name.trim(),
        account_type: accountType,
        institution: institution.trim() || null,
        currency,
        current_balance: parseFloat(currentBalance) || 0,
      });
      success("Account Created", `Successfully linked ${name.trim()} to double-entry ledger.`);
      setShowModal(false);
      setName("");
      setInstitution("");
      setCurrentBalance("0.00");
      await loadData();
    } catch (err: any) {
      toastError("Creation Failed", err?.message || "Failed to create account. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? All associated ledger transactions will be removed.`)) return;
    try {
      await api.delete(`/accounts/${id}`);
      success("Account Deleted", `Removed ${accountName} from ledger.`);
      await loadData();
    } catch (err: any) {
      toastError("Delete Failed", err?.message || "Failed to delete account");
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case "checking":
      case "bank":
        return <Landmark className="w-4 h-4 text-blue-400" />;
      case "savings":
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case "credit_card":
      case "loan":
        return <CreditCard className="w-4 h-4 text-rose-400" />;
      case "investment":
        return <LineChart className="w-4 h-4 text-cyan-400" />;
      default:
        return <Building2 className="w-4 h-4 text-purple-400" />;
    }
  };

  // Filter accounts by category
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.institution && acc.institution.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterCategory === "depository") {
      return acc.account_type === "checking" || acc.account_type === "savings" || acc.account_type === "bank";
    }
    if (filterCategory === "credit") {
      return acc.account_type === "credit_card" || acc.account_type === "loan";
    }
    if (filterCategory === "investment") {
      return acc.account_type === "investment";
    }
    if (filterCategory === "other") {
      return acc.account_type === "other";
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Accounts & Balances"
        subtitle="Manage depository bank accounts, credit lines, investment repositories, and double-entry cash ledgers"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        }
      />

      {/* Net Worth Metrics */}
      {netWorth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <StatCard
            label="Total Assets"
            value={formatCurrency(netWorth.total_assets)}
            accentColor="emerald"
            subtitle="Checking, savings, cash, and investments"
          />
          <StatCard
            label="Total Liabilities"
            value={formatCurrency(netWorth.total_liabilities)}
            accentColor="rose"
            subtitle="Credit cards, loans, and credit lines"
          />
          <StatCard
            label="Net Liquidity Position"
            value={formatCurrency(netWorth.net_worth)}
            accentColor="blue"
            subtitle={`${netWorth.account_count} active account${netWorth.account_count === 1 ? "" : "s"} tracked`}
          />
        </div>
      )}

      {/* Accounts Ledger Card */}
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm space-y-0">
        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 bg-[#0a0c14] p-1 rounded-xl border border-slate-800 scrollbar-thin">
            {[
              { id: "all", label: `All (${accounts.length})` },
              { id: "depository", label: "Depository / Bank" },
              { id: "credit", label: "Credit & Loans" },
              { id: "investment", label: "Investments" },
              { id: "other", label: "Other" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id as AccountFilterCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filterCategory === tab.id
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts or banks..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <EmptyState
            title={accounts.length === 0 ? "No Accounts Created Yet" : "No Matching Accounts Found"}
            description={
              accounts.length === 0
                ? "Accounts represent your financial repositories (e.g. HDFC Bank, ICICI Savings, SBI Checking, Credit Cards). Add your first account to record transactions and track balances."
                : `No accounts matching filter "${filterCategory}" and query "${searchQuery}".`
            }
            actionText={accounts.length === 0 ? "+ Create First Account" : "Clear Filter"}
            onAction={accounts.length === 0 ? () => setShowModal(true) : () => { setFilterCategory("all"); setSearchQuery(""); }}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90 font-medium">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Account Name</th>
                  <th className="px-6 py-3.5 font-semibold">Type</th>
                  <th className="px-6 py-3.5 font-semibold">Institution</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Balance</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/30 transition group">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
                        {getAccountIcon(acc.account_type)}
                      </div>
                      <span className="truncate">{acc.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          acc.account_type === "savings"
                            ? "success"
                            : acc.account_type === "credit_card" || acc.account_type === "loan"
                            ? "danger"
                            : "default"
                        }
                        size="sm"
                      >
                        {acc.account_type.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{acc.institution || "—"}</td>
                    <td className="px-6 py-4 text-right font-bold text-white font-mono text-sm sm:text-base">
                      {formatCurrency(acc.current_balance, acc.currency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Financial Account"
        subtitle="Establish a depository, credit, or investment ledger account in your portfolio"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Account Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Salary Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="checking">Checking / Current</option>
                <option value="savings">Savings Depository</option>
                <option value="credit_card">Credit Card Line</option>
                <option value="loan">Personal / Home Loan</option>
                <option value="investment">Brokerage / Mutual Fund</option>
                <option value="cash">Physical Cash</option>
                <option value="other">Other Asset</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Institution (Optional)</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI, Zerodha"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Ledger Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition font-mono"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
