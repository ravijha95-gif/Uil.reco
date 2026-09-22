import React, { useState } from "react";
import { BuyerRow, LearningRule, TransactionType, VendorRow } from "../types";
import { testRule } from "../utils/parsers";
import {
  Sparkles,
  Trash2,
  Plus,
  Eye,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface RulesManagerProps {
  rules: LearningRule[];
  onAddRule: (rule: LearningRule) => void;
  onDeleteRule: (index: number) => void;
  onClearRules: () => void;
  vendorRows: VendorRow[];
  buyerRows: BuyerRow[];
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
  "Unknown",
];

export const RulesManager: React.FC<RulesManagerProps> = ({
  rules,
  onAddRule,
  onDeleteRule,
  onClearRules,
  vendorRows,
  buyerRows,
}) => {
  const [pattern, setPattern] = useState<string>("");
  const [mode, setMode] = useState<"contains" | "regex" | "startsWith" | "exact">("contains");
  const [value, setValue] = useState<string>("Invoice");
  const [note, setNote] = useState<string>("");
  const [previewResult, setPreviewResult] = useState<string | null>(null);

  const handlePreview = () => {
    if (!pattern.trim()) {
      setPreviewResult("Please enter text to match first.");
      return;
    }
    const tempRule: LearningRule = {
      id: "preview",
      pattern: pattern.trim(),
      mode,
      field: "type",
      value,
      createdAt: new Date().toISOString(),
    };

    let vMatches = 0;
    let bMatches = 0;

    for (const v of vendorRows) {
      const hay = `${v.vchType} ${v.particulars} ${v.ref}`;
      if (testRule(tempRule, hay)) vMatches++;
    }

    for (const b of buyerRows) {
      const hay = `${b.docType} ${b.ref} ${b.desc}`;
      if (testRule(tempRule, hay)) bMatches++;
    }

    setPreviewResult(
      `Would match ${vMatches} Vendor row(s) and ${bMatches} SAP row(s).`
    );
  };

  const handleAdd = () => {
    if (!pattern.trim()) return;

    if (mode === "regex") {
      try {
        new RegExp(pattern.trim());
      } catch (e: any) {
        alert("Invalid regular expression: " + e.message);
        return;
      }
    }

    onAddRule({
      id: `rule-${Date.now()}`,
      pattern: pattern.trim(),
      mode,
      field: "type",
      value,
      note: note.trim() || `Pattern rule: ${pattern.trim()}`,
      createdAt: new Date().toISOString(),
    });

    setPattern("");
    setNote("");
    setPreviewResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Classification Learning Rules Engine
            </h3>
            <p className="text-xs text-slate-500">
              Rules run automatically upon ledger import to classify voucher narrations into Invoices, Payments, TDS, or Notes.
            </p>
          </div>
        </div>
      </div>

      {/* Add Rule Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Create New Automated Rule
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Match Pattern / Text
            </label>
            <input
              type="text"
              placeholder="e.g. SERVICE or REIMBURSEMENT"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Match Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="contains">Contains (Case-insensitive)</option>
              <option value="startsWith">Starts With</option>
              <option value="exact">Exact Match</option>
              <option value="regex">Regular Expression</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Classify Transaction As
            </label>
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Vendor consulting invoice category"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={handleAdd}
            disabled={!pattern.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
          <button
            onClick={handlePreview}
            disabled={!pattern.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Match Count
          </button>

          {previewResult && (
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              {previewResult}
            </span>
          )}
        </div>
      </div>

      {/* Active Rules List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Active Learning Rules ({rules.length})
            </h4>
          </div>
          {rules.length > 0 && (
            <button
              onClick={onClearRules}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Clear All Rules
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No learning rules defined yet. Add a rule above or click "Learn" on any parsed row.
            </div>
          ) : (
            rules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {rule.value}
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">
                      Pattern: "{rule.pattern}"
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({rule.mode})
                    </span>
                  </div>
                  {rule.note && (
                    <p className="text-[11px] text-slate-500">{rule.note}</p>
                  )}
                </div>

                <button
                  onClick={() => onDeleteRule(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                  title="Remove rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
