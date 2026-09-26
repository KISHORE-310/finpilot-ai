"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction, Account, Category, TransactionType, PaginatedTransactions } from "@/types";
import {
  SectionHeader,
  Badge,
  EmptyState,
  TableSkeleton,
  Modal,
} from "@/components/ui";
import { Search, Plus, Trash2, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react";

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
  const [transferAccountId, setTransferAccountId] = useState("");
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
      if ((!accountId || !accs.some((a) => a.id === accountId)) && accs && accs.length > 0) {
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
    if (txType === "transfer") {
      if (!transferAccountId) {
        alert("Please select a destination account for the transfer.");
        return;
      }
      if (transferAccountId === accountId) {
        alert("Source and destination accounts must be different.");
        return;
      }
    }
    try {
      setSubmitting(true);
      await api.post("/transactions", {
        account_id: accountId,
        transfer_account_id: txType === "transfer" ? transferAccountId : null,
        category_id: txType !== "transfer" && categoryId ? categoryId : null,
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
      setTransferAccountId("");
      setCategoryId("");
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Ledger Transactions"
        subtitle={`Real-time verified double-entry ledger records (${total} entries)`}
        actions={
          <button
            type="button"
            onClick={() => {
              if (accounts.length > 0 && !accountId) {
                setAccountId(accounts[0].id);
              }
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#131622] p-4 rounded-2xl border border-slate-800/90 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search description or merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
        >
          <option value="">All Transaction Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
          <option value="transfer">Transfers Only</option>
        </select>

        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
        >
          <option value="">All Accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No Transactions Recorded"
            description="You haven't recorded any transactions matching your filter criteria. Add a transaction or upload a bank statement CSV to populate your ledger."
            actionText="+ Add Transaction"
            onAction={() => {
              if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
              setShowModal(true);
            }}
            secondaryActionText="+ Import CSV Statement"
            secondaryActionHref="/dashboard/import"
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Description & Merchant</th>
                  <th className="px-6 py-3.5 font-semibold">Account / Type</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => {
                  const isExp = tx.transaction_type === "expense";
                  const isInc = tx.transaction_type === "income";
                  const isTransfer = tx.transaction_type === "transfer";
                  const acc = accounts.find((a) => a.id === tx.account_id);
                  const destAcc = tx.transfer_account_id ? accounts.find((a) => a.id === tx.transfer_account_id) : null;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs font-mono">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white truncate max-w-xs sm:max-w-md">
                          {tx.description}
                        </div>
                        {tx.merchant_name && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{tx.merchant_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isInc ? "success" : isExp ? "danger" : "info"}
                            size="sm"
                          >
                            {isInc && <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
                            {isExp && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
                            {isTransfer && <ArrowRightLeft className="w-3 h-3 mr-0.5" />}
                            {tx.transaction_type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-slate-400 truncate max-w-[140px]">
                            {acc?.name || "Account"}
                            {destAcc && ` → ${destAcc.name}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold font-mono text-sm sm:text-base ${
                            isInc
                              ? "text-emerald-400"
                              : isExp
                              ? "text-rose-400"
                              : "text-cyan-400"
                          }`}
                        >
                          {isInc ? "+" : isExp ? "-" : ""}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Transaction"
        subtitle="Record double-entry verified transactions and update ledger balances"
      >
        {accounts.length === 0 ? (
          <div className="text-xs sm:text-sm text-slate-300 space-y-4">
            <p>No accounts found. You need to create an account first before adding transactions.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Type</label>
                <select
                  value={txType}
                  onChange={(e) => {
                    const newType = e.target.value as TransactionType;
                    setTxType(newType);
                    if (newType === "transfer" && !transferAccountId) {
                      const otherAcc = accounts.find((a) => a.id !== accountId);
                      if (otherAcc) setTransferAccountId(otherAcc.id);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            {txType === "transfer" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">From Account (Source)</label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => {
                      setAccountId(e.target.value);
                      if (transferAccountId === e.target.value) {
                        const nextOther = accounts.find((a) => a.id !== e.target.value);
                        if (nextOther) setTransferAccountId(nextOther.id);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">To Account (Destination)</label>
                  <select
                    required
                    value={transferAccountId}
                    onChange={(e) => setTransferAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="" disabled>Select destination account...</option>
                    {accounts.filter((a) => a.id !== accountId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {accounts.length < 2 && (
                    <p className="text-[11px] text-amber-400 mt-1 col-span-2">⚠️ You need at least 2 accounts to record a transfer.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account</label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category (Optional)</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Merchant / Entity (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Amazon, HDFC Bank"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Monthly Salary, Groceries at Supermarket, Electric Bill"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
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
                {submitting ? "Saving..." : "Record Transaction"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
