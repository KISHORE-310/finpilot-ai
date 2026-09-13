"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Account, AccountType, NetWorthSummary } from "@/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("bank");
  const [institution, setInstitution] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currentBalance, setCurrentBalance] = useState("0.00");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [accs, nw] = await Promise.all([
        api.get<Account[]>("/accounts"),
        api.get<NetWorthSummary>("/accounts/net-worth-summary"),
      ]);
      setAccounts(accs);
      setNetWorth(nw);
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/accounts", {
        name,
        account_type: accountType,
        institution: institution || null,
        currency,
        current_balance: parseFloat(currentBalance) || 0,
      });
      setShowModal(false);
      setName("");
      setInstitution("");
      setCurrentBalance("0.00");
      await loadData();
    } catch (err) {
      alert("Failed to create account. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account? Associated transactions will be affected.")) return;
    try {
      await api.delete(`/accounts/${id}`);
      await loadData();
    } catch (err) {
      alert("Failed to delete account");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your bank accounts, credit cards, and investments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <span>+ Add Account</span>
        </button>
      </div>

      {/* Net worth banner */}
      {netWorth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 font-medium">Total Assets</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(netWorth.total_assets)}</p>
          </div>
          <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 font-medium">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(netWorth.total_liabilities)}</p>
          </div>
          <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 font-medium">Net Worth</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(netWorth.net_worth)}</p>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">No accounts connected yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-sm text-blue-400 hover:underline"
            >
              Add your first account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#131622] text-xs uppercase text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-3.5">Account Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Institution</th>
                  <th className="px-6 py-3.5 text-right">Balance</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium text-white">{acc.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                        {acc.account_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{acc.institution || '—'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-white">
                      {formatCurrency(acc.current_balance, acc.currency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="text-red-400 hover:text-red-300 text-xs transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add New Account</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="bank">Bank</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="investment">Investment / Brokerage</option>
                  <option value="loan">Loan / Mortgage</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Financial Institution</label>
                <input
                  type="text"
                  placeholder="e.g. Chase, Vanguard, Fidelity"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
