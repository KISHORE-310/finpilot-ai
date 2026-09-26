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
  useToast,
} from "@/components/ui";
import { Search, Plus, Trash2, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Filter, ArrowRight } from "lucide-react";

export default function TransactionsPage() {
  const { success, error: toastError } = useToast();
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
      toastError("Account Required", "Please select a source account first.");
      return;
    }
    if (txType === "transfer") {
      if (!transferAccountId) {
        toastError("Destination Required", "Please select a destination account for the transfer.");
        return;
      }
      if (transferAccountId === accountId) {
        toastError("Invalid Accounts", "Source and destination accounts cannot be the same.");
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
        description: description.trim(),
        merchant_name: merchantName.trim() || null,
      });

      success("Transaction Recorded", `Successfully balanced into double-entry ledger.`);
      setShowModal(false);
      setAmount("");
      setDescription("");
      setMerchantName("");
      setCategoryId("");
      await loadData();
    } catch (err: any) {
      toastError("Transaction Failed", err?.message || "Failed to record transaction. Please verify inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Are you sure you want to delete transaction "${desc}"? Double-entry balances will be adjusted.`)) return;
    try {
      await api.delete(`/transactions/${id}`);
      success("Transaction Removed", "Ledger balance re-calculated.");
      await loadData();
    } catch (err: any) {
      toastError("Delete Failed", err?.message || "Failed to delete transaction");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Double-Entry Ledger"
        subtitle="Search, filter, and audit verified historical financial transactions"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>
        }
      />

      {/* Main Ledger Container */}
      <div className="bg-[#131622] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm space-y-0">
        {/* Filters & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Transaction Type Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 bg-[#0a0c14] p-1 rounded-xl border border-slate-800 scrollbar-thin">
            {[
              { id: "", label: "All Types" },
              { id: "expense", label: "Expenses" },
              { id: "income", label: "Income" },
              { id: "transfer", label: "Transfers" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedType === tab.id
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Account Selector */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">All Accounts ({accounts.length})</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.current_balance)})
                </option>
              ))}
            </select>

            {/* Instant Search box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, merchant..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table Content */}
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadData} className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-lg text-xs">
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title={total === 0 ? "No Transactions Recorded" : "No Matching Transactions"}
            description={
              total === 0
                ? "Your ledger maintains balanced accounting records. Add your first transaction or import a statement to view cash flow."
                : `No transactions found matching your active filter criteria.`
            }
            actionText={total === 0 ? "+ Record First Transaction" : "Clear Filters"}
            onAction={total === 0 ? () => setShowModal(true) : () => { setSelectedType(""); setSelectedAccountId(""); setSearch(""); }}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-[#0a0c14]/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/90 font-medium">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Description & Entity</th>
                  <th className="px-6 py-3.5 font-semibold">Category</th>
                  <th className="px-6 py-3.5 font-semibold">Account Flow</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => {
                  const isIncome = tx.transaction_type === "income";
                  const isTransfer = tx.transaction_type === "transfer";
                  const acc = accounts.find((a) => a.id === tx.account_id);
                  const destAcc = tx.transfer_account_id ? accounts.find((a) => a.id === tx.transfer_account_id) : null;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {formatDate(tx.transaction_date)}
                      </td>

                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome
                                ? "bg-emerald-500/10 text-emerald-400"
                                : isTransfer
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : isTransfer ? (
                              <ArrowRightLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="block truncate">{tx.description}</span>
                            {tx.merchant_name && (
                              <span className="text-[11px] text-slate-400 font-normal block truncate">
                                {tx.merchant_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            isIncome
                              ? "success"
                              : isTransfer
                              ? "default"
                              : "danger"
                          }
                          size="sm"
                        >
                          {isTransfer ? "Transfer" : tx.transaction_type}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {isTransfer && destAcc ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-300">
                            <span className="text-slate-400">{acc?.name || "Source"}</span>
                            <ArrowRight className="w-3 h-3 text-blue-400" />
                            <span className="text-white">{destAcc.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">{acc?.name || "Depository"}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-sm sm:text-base">
                        <span
                          className={
                            isIncome
                              ? "text-emerald-400"
                              : isTransfer
                              ? "text-blue-400"
                              : "text-rose-400"
                          }
                        >
                          {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(tx.id, tx.description)}
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
        title="Record Ledger Transaction"
        subtitle="Insert a balanced double-entry transaction record into your accounts"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-[#0a0c14] p-1 rounded-xl border border-slate-800">
            {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTxType(t)}
                className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${
                  txType === t
                    ? t === "expense"
                      ? "bg-rose-600 text-white shadow-sm"
                      : t === "income"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {txType === "transfer" ? "Source Account" : "Account"} <span className="text-rose-400">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            {txType === "transfer" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Destination Account <span className="text-rose-400">*</span>
                </label>
                <select
                  value={transferAccountId}
                  onChange={(e) => setTransferAccountId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Select Target Account...</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.current_balance)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category (Optional)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">No specific category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Swiggy food delivery, Monthly Salary, Rent Transfer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Merchant / Entity (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Amazon, Employer, Landlord"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
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
              disabled={submitting || !amount || !description.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              {submitting ? "Recording..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
