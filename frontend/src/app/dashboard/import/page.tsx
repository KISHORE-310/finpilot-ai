"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { SectionHeader, Badge, EmptyState, LoadingSkeleton } from "@/components/ui";
import type { Account } from "@/types";

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const loadAccounts = useCallback(async () => {
    try {
      setPageLoading(true);
      const accs = await api.get<Account[]>("/accounts");
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
      }
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setImportResult(null);
      setStep(1);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv") || droppedFile.type.includes("csv")) {
        setFile(droppedFile);
        setPreviewData(null);
        setImportResult(null);
        setStep(1);
      } else {
        alert("Please upload a standard .csv statement file.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handlePreview = async () => {
    if (!file || !selectedAccountId) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("account_id", selectedAccountId);

      const res = await api.post<any>("/imports/preview", formData);
      setPreviewData(res);
      setImportResult(null);
      setStep(2);
    } catch (err: any) {
      alert(err.message || "Failed to parse and preview CSV statement.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!file || !selectedAccountId || !previewData) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("account_id", selectedAccountId);
      formData.append("mapping", JSON.stringify(previewData.suggested_mapping || previewData.detected_columns || {}));
      formData.append("skip_duplicates", skipDuplicates ? "true" : "false");

      const res = await api.post<any>("/imports/execute", formData);
      setImportResult(res);
      setStep(3);
    } catch (err: any) {
      alert(err.message || "Failed to execute CSV import.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setStep(1);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const previewRows = previewData?.preview_rows || previewData?.preview_records || previewData?.preview || [];
  const totalRows = previewData?.total_rows ?? previewRows.length;
  const duplicateCount = previewRows.filter((r: any) => r.is_duplicate).length;

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="CSV Statement Importer"
          subtitle="Direct bank & brokerage statement synchronization with SHA-256 deduplication"
        />
        <EmptyState
          title="No Accounts Found for Import"
          description="You need at least one depository, card, or investment account to target for statement reconciliation."
          actionText="+ Create Target Account"
          actionHref="/dashboard/accounts"
          icon="account"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="CSV Statement Importer"
        subtitle="Automated column detection, SHA-256 fingerprint deduplication, and direct double-entry ledger ingestion"
      >
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="md">Bank-Grade Ingestion</Badge>
          <Badge variant="neutral" size="md">Deterministic Deduplication</Badge>
        </div>
      </SectionHeader>

      {/* Progress Steps Header */}
      <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            step === 1 ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : step > 1 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-[#0a0c14] border-slate-800 text-slate-500"
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step === 1 ? "bg-blue-600 text-white" : step > 1 ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {step > 1 ? "✓" : "1"}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Select Account & Upload</p>
              <p className="text-[11px] text-slate-400">Choose destination & CSV file</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            step === 2 ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : step > 2 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-[#0a0c14] border-slate-800 text-slate-500"
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step === 2 ? "bg-blue-600 text-white" : step > 2 ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {step > 2 ? "✓" : "2"}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Schema Preview & Audit</p>
              <p className="text-[11px] text-slate-400">Verify mappings & hash conflicts</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            step === 3 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#0a0c14] border-slate-800 text-slate-500"
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step === 3 ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {step === 3 ? "✓" : "3"}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Ledger Synchronized</p>
              <p className="text-[11px] text-slate-400">Transactions committed to database</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 & 2: Configuration & Dropzone */}
      {step !== 3 && (
        <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Selector Card */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                1. Select Destination Ledger Account <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setPreviewData(null);
                  setStep(1);
                }}
                className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} • {a.institution || a.account_type.toUpperCase()} ({formatCurrency(a.current_balance)})
                  </option>
                ))}
              </select>

              {selectedAccount && (
                <div className="mt-3 p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-300 font-medium">{selectedAccount.name}</span>
                  </div>
                  <span className="font-mono text-slate-400">Current Balance: <strong className="text-white">{formatCurrency(selectedAccount.current_balance)}</strong></span>
                </div>
              )}
            </div>

            {/* Supported Banks / Formats pill container */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Supported Institution Schemas
              </label>
              <div className="p-3 bg-[#0a0c14] border border-slate-800/80 rounded-xl flex flex-wrap gap-1.5 text-[11px]">
                {["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Zerodha", "Groww", "Generic CSV"].map((inst) => (
                  <span key={inst} className="px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50">
                    {inst}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                FinPilot automatic column inference maps Date, Description, Withdrawal/Deposit, and Balance columns.
              </p>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              2. Upload Bank or Credit Card Statement (.csv) <span className="text-rose-400">*</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive
                  ? "border-blue-500 bg-blue-500/10 scale-[1.005]"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-800 hover:border-slate-700 bg-[#0a0c14]/60"
              }`}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  file ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • Ready for schema analysis
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-white">
                      Drag and drop your statement CSV here, or <span className="text-blue-400 underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">UTF-8 comma-separated values up to 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-800/80">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-[#0a0c14] border-slate-700 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-300">Prevent Duplicate Ingestion (Recommended)</span>
                <p className="text-[11px] text-slate-500">Calculates SHA-256 fingerprint per transaction timestamp & amount</p>
              </div>
            </label>

            <div className="flex items-center gap-3">
              {file && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
                >
                  Clear File
                </button>
              )}
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || !selectedAccountId || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Analyzing Schema..." : "Step 2: Preview & Validate →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Schema Preview Table */}
      {step === 2 && previewData && (
        <div className="bg-[#111420] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl space-y-4">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Statement Schema Validation</h2>
                <Badge variant="purple" size="sm">{totalRows} records found</Badge>
                {duplicateCount > 0 && (
                  <Badge variant="warning" size="sm">{duplicateCount} potential duplicate(s)</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Verify inferred column mappings and sampled records before committing changes to your double-entry ledger.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                ← Back
              </button>
              <button
                onClick={handleExecute}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? "Ingesting Records..." : "Confirm & Import to Ledger ✓"}
              </button>
            </div>
          </div>

          {/* Mappings Pills */}
          <div className="px-6 py-3 bg-[#0a0c14] border-y border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">Mapped Attributes:</span>
            {Object.entries(previewData.suggested_mapping || previewData.detected_columns || {}).map(([k, v]) => (
              <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-blue-300 font-mono text-[11px]">
                {k} <span className="text-slate-500">&rarr;</span> <strong className="text-white">{String(v)}</strong>
              </span>
            ))}
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0a0c14] text-xs uppercase text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {previewRows.slice(0, 15).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">{row.date}</td>
                    <td className="px-6 py-3.5 text-white font-medium max-w-md truncate">{row.description}</td>
                    <td className="px-6 py-3.5 capitalize">
                      <Badge variant={row.transaction_type === "income" || row.type === "income" ? "success" : "danger"} size="sm">
                        {row.transaction_type || row.type || "expense"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-white">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {row.is_duplicate ? (
                        <Badge variant="warning" size="sm">DUPLICATE HASH</Badge>
                      ) : (
                        <Badge variant="success" size="sm">NEW ENTRY</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewRows.length > 15 && (
            <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-800">
              Showing preview of first 15 of {totalRows} records. All rows will be processed upon confirmation.
            </div>
          )}
        </div>
      )}

      {/* Step 3: Success Result Summary */}
      {step === 3 && importResult && (
        <div className="bg-[#111420] border border-emerald-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold shadow-lg shadow-emerald-500/20">
            ✓
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Ledger Import Successful</h2>
            <p className="text-sm text-slate-400 mt-1">
              Your statement entries have been balanced and ingested into the double-entry accounting ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 max-w-md mx-auto gap-4 text-left">
            <div className="p-4 bg-[#0a0c14] border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-500 block">Committed Transactions</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {importResult.imported_count ?? 0}
              </span>
            </div>
            <div className="p-4 bg-[#0a0c14] border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-500 block">Skipped Duplicate Hashes</span>
              <span className="text-2xl font-bold font-mono text-amber-400">
                {importResult.skipped_duplicates_count ?? importResult.skipped_duplicates ?? 0}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard/transactions"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/20"
            >
              View Updated Transactions Ledger →
            </Link>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
            >
              Import Another Statement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
