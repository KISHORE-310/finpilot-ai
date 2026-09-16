"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction, Account, Category, TransactionType, PaginatedTransactions } from "@/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [search, setSearch] = useState("");

  // Form State
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [merchantName, setMerchantName] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (selectedType) queryParams.set("transaction_type", selectedType);
      if (selectedAccountId) queryParams.set("account_id", selectedAccountId);
      if (search) queryParams.set("search", search);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const [txRes, accs, cats] = await Promise.all([
        api.get<PaginatedTransactions>(`/transactions${qs}`),
        api.get<Account[]>("/accounts"),
        api.get<Category[]>("/categories"),
      ]);

      setTransactions(txRes?.items || []);
      setTotal(txRes?.total || 0);
      setAccounts(accs || []);
      setCategories(cats || []);
      if ((!accountId || !accs.some((a) => a.id === accountId)) && accs.length > 0) {
        setAccountId(accs[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load transactions", err);
      setError(err?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedAccountId, search, accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert("Please select or create an account first.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/transactions", {
        account_id: accountId,
        category_id: categoryId || null,
        amount: parseFloat(amount),
        currency: "INR",
        transaction_type: txType,
        transaction_date: txDate,
        description,
        merchant_name: merchantName || null,
      });
      setShowModal(false);
      setAmount("");
      setDescription("");
      setMerchantName("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to create transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete transaction and reverse its ledger balance impact?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete transaction");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">Transaction ledger and account balance synchronization ({total} records)</p>
        </div>
        <button
          onClick={() => {
            if (accounts.length > 0 && !accountId) {
              setAccountId(accounts[0].id);
            }
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <span>+ Add Transaction</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1a1d2e] p-4 rounded-xl border border-slate-700/50">
        <input
          type="text"
          placeholder="Search description or merchant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option value="income">Income (+)</option>
          <option value="expense">Expense (-)</option>
          <option value="transfer">Transfer</option>
        </select>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#131622] text-xs uppercase text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Account</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {transactions.map((tx) => {
                  const isInc = tx.transaction_type === "income";
                  const acc = accounts.find((a) => a.id === tx.account_id);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                      <td className="px-6 py-4 font-medium text-white">
                        <div>{tx.description}</div>
                        {tx.merchant_name && <div className="text-xs text-slate-500">{tx.merchant_name}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{acc?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs rounded-full border ${
                          isInc
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        } capitalize`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                        isInc ? "text-emerald-400" : "text-white"
                      }`}>
                        {isInc ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-red-400 hover:text-red-300 text-xs transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1a1d2e] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Transaction</h2>
            {accounts.length === 0 ? (
              <div className="text-sm text-slate-300 space-y-4">
                <p>No accounts found. You need to create an account first before adding transactions.</p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Account</label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                    <select
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as TransactionType)}
                      className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swiggy Order, BigBasket, Monthly Salary"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Merchant / Entity (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Swiggy, Zomato, Amazon India, HDFC Bank"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
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
                    {submitting ? "Saving..." : "Create Transaction"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
