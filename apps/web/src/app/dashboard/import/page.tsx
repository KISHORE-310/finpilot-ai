"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Account, ImportPreviewResponse, ImportExecuteResponse } from "@/types";

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const loadAccounts = useCallback(async () => {
    try {
      const accs = await api.get<Account[]>("/accounts");
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
      }
    } catch (err) {
      console.error("Failed to load accounts", err);
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
    }
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
    } catch (err: any) {
      alert(err.message || "Failed to parse and preview CSV file.");
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
    } catch (err: any) {
      alert(err.message || "Failed to execute CSV import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">CSV Statement Importer</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload bank or credit card statements with automated column auto-detection and SHA-256 deduplication
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Select Target Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0f1117] border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.institution || a.account_type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Upload CSV File</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full px-3.5 py-2 bg-[#0f1117] border border-slate-700 rounded-lg text-slate-300 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-700/40">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-[#0f1117] border-slate-700 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-300">Skip previously imported transactions (SHA-256 Hash Matching)</span>
          </label>

          <button
            onClick={handlePreview}
            disabled={!file || !selectedAccountId || loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Preview & Validate"}
          </button>
        </div>
      </div>

      {/* Success / Result Alert */}
      {importResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-emerald-400">
          <div className="flex items-center gap-3">
            <span className="text-lg">✓</span>
            <div>
              <p className="font-semibold text-white">Import Execution Complete!</p>
              <p className="text-xs text-slate-300 mt-1">
                Successfully imported <strong>{importResult.imported_count ?? 0}</strong> transactions.{" "}
                Skipped <strong>{importResult.skipped_duplicates_count ?? importResult.skipped_duplicates ?? 0}</strong> duplicate records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {previewData && !importResult && (
        <div className="bg-[#1a1d2e] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Statement Preview</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Found {previewData.total_rows ?? 0} total records.
              </p>
            </div>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Importing..." : "Confirm & Import to Ledger"}
            </button>
          </div>

          <div className="p-4 bg-[#131622] border-b border-slate-700/50 flex flex-wrap gap-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-500">Detected Mappings: </span>
              {Object.entries(previewData.suggested_mapping || previewData.detected_columns || {}).map(([k, v]) => (
                <span key={k} className="ml-2 px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono">
                  {k} &rarr; {String(v)}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#131622] text-xs uppercase text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Duplicate?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {(previewData.preview_records || previewData.preview || []).slice(0, 10).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="px-6 py-3 text-slate-400">{row.date}</td>
                    <td className="px-6 py-3 text-white font-medium">{row.description}</td>
                    <td className="px-6 py-3 text-slate-400 capitalize">{row.transaction_type || row.type || "expense"}</td>
                    <td className="px-6 py-3 text-right font-mono text-white">{formatCurrency(row.amount)}</td>
                    <td className="px-6 py-3 text-center">
                      {row.is_duplicate ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">Duplicate</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
