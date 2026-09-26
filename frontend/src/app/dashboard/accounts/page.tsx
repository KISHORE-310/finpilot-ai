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
} from "@/components/ui";
import { Building2, CreditCard, Wallet, Landmark, Trash2, Plus } from "lucide-react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setShowModal(false);
      setName("");
      setInstitution("");
      setCurrentBalance("0.00");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to create account. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? All associated ledger transactions will be removed.`)) return;
    try {
      await api.delete(`/accounts/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete account");
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
      default:
        return <Building2 className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Accounts & Balances"
        subtitle="Manage depository bank accounts, credit cards, investments, and double-entry cash ledgers"
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
            subtitle="Credit cards, loans, and overdrafts"
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
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Connected Accounts</h2>
            <p className="text-xs text-slate-400 mt-0.5">Live ledger balances across institutions</p>
          </div>
          <span className="text-xs text-slate-400">
            {accounts.length} Total
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            title="No Accounts Created Yet"
            description="Accounts represent your financial repositories (e.g. HDFC Bank, ICICI Savings, SBI Checking, Credit Cards). Add your first account to record transactions and track balances."
            actionText="+ Create First Account"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Account Name</th>
                  <th className="px-6 py-3.5 font-semibold">Type</th>
                  <th className="px-6 py-3.5 font-semibold">Institution</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Balance</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accounts.map((acc) => (
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
        title="Add New Account"
        subtitle="Create a bank depository, credit line, or cash holding in your ledger"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Salary Account, HDFC Regalia, Emergency Savings"
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
                <option value="savings">Savings Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash in Hand</option>
                <option value="investment">Investment Account</option>
                <option value="loan">Loan / Liability</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Institution (Optional)</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI, ICICI, Zerodha"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Starting Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Currency</label>
              <input
                type="text"
                value={currency}
                disabled
                className="w-full px-4 py-2.5 bg-[#0a0c14]/50 border border-slate-800/60 rounded-xl text-slate-400 text-xs sm:text-sm cursor-not-allowed"
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
              {submitting ? "Saving..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
