import React, { useState, useMemo } from "react";
import { BuyerRow, LearningRule, TransactionType, VendorRow } from "../types";
import { formatCurrency, formatDateShort, toIsoDateString, parseDate, parseNumber } from "../utils/dateAndNumber";
import { downloadWorkbook } from "../utils/excelExport";
import {
  FileSpreadsheet,
  Download,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Zap,
  Info,
  X,
} from "lucide-react";

interface ParsedDataEditorProps {
  vendorRows: VendorRow[];
  buyerRows: BuyerRow[];
  onUpdateVendorRow: (idOrIdx: string | number, field: string, value: any) => void;
  onUpdateBuyerRow: (idOrIdx: string | number, field: string, value: any) => void;
  onApplyEditsAndRecon: () => void;
  onRevertEdits: () => void;
  onAddLearningRule: (rule: LearningRule) => void;
  editCount: number;
}

const CLASS_OPTIONS: TransactionType[] = [
  "Invoice",
  "Payment",
  "TDS",
  "Debit Note",
  "Credit Note",
  "Adjustment JV",
  "Opening Balance",
  "Closing Balance",
  "Excluded",
  "Unknown",
];

export const ParsedDataEditor: React.FC<ParsedDataEditorProps> = ({
  vendorRows,
  buyerRows,
  onUpdateVendorRow,
  onUpdateBuyerRow,
  onApplyEditsAndRecon,
  onRevertEdits,
  onAddLearningRule,
  editCount,
}) => {
  const [activeSide, setActiveSide] = useState<"Vendor" | "Buyer">("Vendor");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const handleExportVendor = () => {
    const aoa: (string | number)[][] = [
      ["# Parsed Vendor Ledger (Tally)"],
      ["Date", "Dr/Cr", "Particulars", "Vch Type", "Vch No", "Amount", "Classification"],
    ];
    for (const v of vendorRows) {
      aoa.push([
        v.date ? toIsoDateString(v.date) : "",
        v.dc,
        v.particulars,
        v.vchType,
        v.ref,
        v.amount,
        v.type,
      ]);
    }
    downloadWorkbook([["Vendor Ledger", aoa]], "Parsed_Vendor_Ledger.xlsx");
  };

  const handleExportBuyer = () => {
    const aoa: (string | number)[][] = [
      ["# Parsed SAP Ledger"],
      ["Doc No", "Doc Date", "Posting Date", "Reference", "Doc Type", "Dr/Cr", "Amount", "TDS", "Classification"],
    ];
    for (const b of buyerRows) {
      aoa.push([
        b.docNo,
        b.date ? toIsoDateString(b.date) : "",
        b.postingDate ? toIsoDateString(b.postingDate) : "",
        b.ref,
        b.docType,
        b.ind,
        b.amount,
        b.tds,
        b.type,
      ]);
    }
    downloadWorkbook([["SAP Ledger", aoa]], "Parsed_SAP_Ledger.xlsx");
  };

  const [learnTarget, setLearnTarget] = useState<{
    side: "Vendor" | "Buyer";
    row: VendorRow | BuyerRow;
  } | null>(null);
  const [learnPattern, setLearnPattern] = useState("");
  const [learnMode, setLearnMode] = useState<"contains" | "startsWith" | "exact" | "regex">("contains");
  const [learnClass, setLearnClass] = useState<TransactionType>("Invoice");
  const [learnNote, setLearnNote] = useState("");
  const [learnToast, setLearnToast] = useState<string | null>(null);

  const handleOpenLearn = (row: VendorRow | BuyerRow, side: "Vendor" | "Buyer") => {
    setLearnTarget({ side, row });
    if ("particulars" in row) {
      setLearnPattern(row.vchType || row.particulars || row.ref || "");
      setLearnClass(row.type || "Invoice");
      setLearnNote(`Rule learned from Vendor row: ${row.ref || row.id}`);
    } else {
      setLearnPattern(row.docType || row.ref || row.docNo || "");
      setLearnClass(row.type || "Invoice");
      setLearnNote(`Rule learned from SAP row: ${row.docNo || row.ref || row.id}`);
    }
    setLearnMode("contains");
  };

  const handleSaveLearnRule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!learnPattern.trim()) return;

    onAddLearningRule({
      id: `rule-${Date.now()}`,
      pattern: learnPattern.trim(),
      mode: learnMode,
      field: "type",
      value: learnClass,
      note: learnNote || `Learned from row`,
      createdAt: new Date().toISOString(),
    });

    setLearnToast(`New rule saved for "${learnPattern.trim()}" → classified as "${learnClass}".`);
    setTimeout(() => setLearnToast(null), 4500);
    setLearnTarget(null);
  };

  // Filtered lists for fast searching
  const filteredVendorRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendorRows.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (!q) return true;
      const refStr = String(r.ref || "").toLowerCase();
      const partStr = String(r.particulars || "").toLowerCase();
      const amtStr = String(r.amount || "");
      const vchStr = String(r.vchType || "").toLowerCase();
      return refStr.includes(q) || partStr.includes(q) || amtStr.includes(q) || vchStr.includes(q);
    });
  }, [vendorRows, searchQuery, typeFilter]);

  const filteredBuyerRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return buyerRows.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (!q) return true;
      const docStr = String(r.docNo || "").toLowerCase();
      const refStr = String(r.ref || "").toLowerCase();
      const amtStr = String(r.amount || "");
      const typeStr = String(r.docType || "").toLowerCase();
      return docStr.includes(q) || refStr.includes(q) || amtStr.includes(q) || typeStr.includes(q);
    });
  }, [buyerRows, searchQuery, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Live Synchronization Notice Banner */}
      <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong className="font-semibold text-indigo-950">Live Engine Synchronization Active:</strong> Any edits to voucher numbers, amounts, dates, or classifications immediately recalculate the Reconciliation Matrix, Balance Discrepancies, and Statutory Conclusion Statement.
          </span>
        </div>
        {editCount > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold font-mono">
              {editCount} pending change{editCount > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Side Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/60">
            <button
              onClick={() => {
                setActiveSide("Vendor");
                setSearchQuery("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSide === "Vendor"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vendor Ledger ({vendorRows.length})
            </button>
            <button
              onClick={() => {
                setActiveSide("Buyer");
                setSearchQuery("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSide === "Buyer"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Buyer / SAP Ledger ({buyerRows.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${activeSide === "Vendor" ? "Vendor" : "SAP"} records...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium cursor-pointer"
          >
            <option value="ALL">All Classifications</option>
            {CLASS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeSide === "Vendor" ? (
            <button
              onClick={handleExportVendor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Export Vendor Excel
            </button>
          ) : (
            <button
              onClick={handleExportBuyer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Export SAP Excel
            </button>
          )}

          {editCount > 0 && (
            <button
              onClick={onRevertEdits}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revert Edits
            </button>
          )}

          <button
            onClick={onApplyEditsAndRecon}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Apply & Re-Reconcile
          </button>
        </div>
      </div>

      {/* Editable Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          {activeSide === "Vendor" ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Doc Date</th>
                  <th className="py-2.5 px-3">Dr/Cr</th>
                  <th className="py-2.5 px-3">Particulars / Narration</th>
                  <th className="py-2.5 px-3">Voucher Type</th>
                  <th className="py-2.5 px-3">Voucher No</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-center">Learn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredVendorRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No matching vendor rows found.
                    </td>
                  </tr>
                ) : (
                  filteredVendorRows.map((row) => {
                    const isEdited = row._edited;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isEdited ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {isEdited ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Edited item" />
                          ) : (
                            row.id
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <input
                            type="date"
                            value={toIsoDateString(row.date)}
                            onChange={(e) => onUpdateVendorRow(row.id, "date", parseDate(e.target.value))}
                            className={`px-2 py-1 rounded border text-xs w-32 font-mono bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.dc}
                            onChange={(e) => onUpdateVendorRow(row.id, "dc", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs font-bold bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          >
                            <option value="Dr">Dr</option>
                            <option value="Cr">Cr</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.particulars}
                            onChange={(e) => onUpdateVendorRow(row.id, "particulars", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs w-full min-w-[200px] bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">
                          {row.vchType || "—"}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <input
                            type="text"
                            value={row.ref}
                            onChange={(e) => onUpdateVendorRow(row.id, "ref", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs w-36 font-mono font-bold bg-white ${
                              isEdited ? "border-amber-400 ring-1 ring-amber-300" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => onUpdateVendorRow(row.id, "amount", parseNumber(e.target.value))}
                            className={`px-2 py-1 rounded border text-xs w-28 text-right font-mono font-semibold bg-white ${
                              isEdited ? "border-amber-400 ring-1 ring-amber-300" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.type}
                            onChange={(e) => onUpdateVendorRow(row.id, "type", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs font-medium bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          >
                            {CLASS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleOpenLearn(row, "Vendor")}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                            title="Create automated rule matching this row"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            Learn
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">SAP Doc No</th>
                  <th className="py-2.5 px-3">Document Date</th>
                  <th className="py-2.5 px-3">Posting Date</th>
                  <th className="py-2.5 px-3">SAP Reference</th>
                  <th className="py-2.5 px-3">Doc Type</th>
                  <th className="py-2.5 px-3">Ind.</th>
                  <th className="py-2.5 px-3 text-right">Net Amount (₹)</th>
                  <th className="py-2.5 px-3 text-right">TDS (₹)</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-center">Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredBuyerRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No matching SAP rows found.
                    </td>
                  </tr>
                ) : (
                  filteredBuyerRows.map((row) => {
                    const isEdited = row._edited;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isEdited ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {isEdited ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Edited item" />
                          ) : (
                            row.id
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {row.docNo || "—"}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <input
                            type="date"
                            value={toIsoDateString(row.date)}
                            onChange={(e) => onUpdateBuyerRow(row.id, "date", parseDate(e.target.value))}
                            className={`px-2 py-1 rounded border text-xs w-32 font-mono bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {row.postingDate ? formatDateShort(row.postingDate) : "—"}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <input
                            type="text"
                            value={row.ref}
                            onChange={(e) => onUpdateBuyerRow(row.id, "ref", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs w-36 font-mono font-bold bg-white ${
                              isEdited ? "border-amber-400 ring-1 ring-amber-300" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                          {row.docType}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.ind}
                            onChange={(e) => onUpdateBuyerRow(row.id, "ind", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs font-bold bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          >
                            <option value="Cr">Cr</option>
                            <option value="Dr">Dr</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => onUpdateBuyerRow(row.id, "amount", parseNumber(e.target.value))}
                            className={`px-2 py-1 rounded border text-xs w-28 text-right font-mono font-semibold bg-white ${
                              isEdited ? "border-amber-400 ring-1 ring-amber-300" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          <input
                            type="number"
                            step="0.01"
                            value={row.tds}
                            onChange={(e) => onUpdateBuyerRow(row.id, "tds", parseNumber(e.target.value))}
                            className={`px-2 py-1 rounded border text-xs w-24 text-right font-mono text-indigo-700 bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.type}
                            onChange={(e) => onUpdateBuyerRow(row.id, "type", e.target.value)}
                            className={`px-2 py-1 rounded border text-xs font-medium bg-white ${
                              isEdited ? "border-amber-400" : "border-slate-200"
                            }`}
                          >
                            {CLASS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleOpenLearn(row, "Buyer")}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                            title="Create automated rule matching this SAP row"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            Learn
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Toast Notification when Rule is Learned */}
      {learnToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span>{learnToast}</span>
          <button
            onClick={() => setLearnToast(null)}
            className="text-slate-400 hover:text-white ml-2 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Learn Classification Modal (No window.prompt, 100% iframe safe) */}
      {learnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Learn Classification Rule
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Source: {learnTarget.side} Ledger Line
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLearnTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLearnRule} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Text Pattern or Keyword to Match:
                </label>
                <input
                  type="text"
                  required
                  value={learnPattern}
                  onChange={(e) => setLearnPattern(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Sales, Payment, TDS, RE, KR, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Matching Mode:
                  </label>
                  <select
                    value={learnMode}
                    onChange={(e) => setLearnMode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="contains">Contains substring</option>
                    <option value="startsWith">Starts with</option>
                    <option value="exact">Exact match</option>
                    <option value="regex">Regex pattern</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Classify As:
                  </label>
                  <select
                    value={learnClass}
                    onChange={(e) => setLearnClass(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500"
                  >
                    {CLASS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rule Note / Description:
                </label>
                <input
                  type="text"
                  value={learnNote}
                  onChange={(e) => setLearnNote(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional rule description"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLearnTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save & Apply Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
