import React, { useState, useMemo } from "react";
import { ReconcileItem } from "../types";
import {
  formatCurrency,
  formatDateShort,
  formatDateFull,
} from "../utils/dateAndNumber";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2Off,
  Filter,
  ArrowUpDown,
  Sparkles,
  Check,
  Ban,
  RotateCcw,
} from "lucide-react";

interface ReconcileTableProps {
  items: ReconcileItem[];
  onUnlink?: (itemId: string) => void;
  onAddExceptionFromItem?: (item: ReconcileItem) => void;
  onExcludeItem?: (item: ReconcileItem, reason?: string) => void;
  onRestoreItem?: (item: ReconcileItem) => void;
}

export const ReconcileTable: React.FC<ReconcileTableProps> = ({
  items,
  onUnlink,
  onAddExceptionFromItem,
  onExcludeItem,
  onRestoreItem,
}) => {
  const [filterTab, setFilterTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"date" | "amount" | "diff" | "score">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [excludeTargetItem, setExcludeTargetItem] = useState<ReconcileItem | null>(null);
  const [exclusionReasonInput, setExclusionReasonInput] = useState<string>("");

  // Filter out internal opening/closing rows from the primary table view
  const activeItems = useMemo(() => items.filter((x) => !x.internal), [items]);

  const counts = useMemo(() => {
    return {
      all: activeItems.length,
      matched: activeItems.filter((x) => x.status.startsWith("Matched")).length,
      partial: activeItems.filter((x) => x.status.startsWith("Partial")).length,
      vendorOnly: activeItems.filter((x) => x.status.startsWith("Vendor Only")).length,
      buyerOnly: activeItems.filter((x) => x.status.startsWith("Buyer Only")).length,
      manual: activeItems.filter((x) => x.status.includes("Manual")).length,
      excluded: activeItems.filter((x) => x.status === "Excluded from Reconciliation").length,
    };
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    let result = activeItems;

    // Filter by tab
    if (filterTab === "matched") {
      result = result.filter((x) => x.status.startsWith("Matched"));
    } else if (filterTab === "partial") {
      result = result.filter((x) => x.status.startsWith("Partial"));
    } else if (filterTab === "vendorOnly") {
      result = result.filter((x) => x.status.startsWith("Vendor Only"));
    } else if (filterTab === "buyerOnly") {
      result = result.filter((x) => x.status.startsWith("Buyer Only"));
    } else if (filterTab === "manual") {
      result = result.filter((x) => x.status.includes("Manual"));
    } else if (filterTab === "excluded") {
      result = result.filter((x) => x.status === "Excluded from Reconciliation");
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((x) => {
        const vRef = (x.a?.ref || "").toLowerCase();
        const vDesc = (x.a?.particulars || "").toLowerCase();
        const bRef = (x.b?.ref || "").toLowerCase();
        const bDoc = (x.b?.docNo || "").toLowerCase();
        const bDesc = (x.b?.desc || "").toLowerCase();
        const vAmt = x.a?.amount.toString() || "";
        const bAmt = x.b?.amount.toString() || "";
        const basis = (x.basis || "").toLowerCase();

        return (
          vRef.includes(q) ||
          vDesc.includes(q) ||
          bRef.includes(q) ||
          bDoc.includes(q) ||
          bDesc.includes(q) ||
          vAmt.includes(q) ||
          bAmt.includes(q) ||
          basis.includes(q)
        );
      });
    }

    // Sort
    result = [...result].sort((m1, m2) => {
      let v1 = 0;
      let v2 = 0;

      if (sortField === "date") {
        const d1 = m1.a?.date || m1.b?.date;
        const d2 = m2.a?.date || m2.b?.date;
        v1 = d1 ? d1.getTime() : 0;
        v2 = d2 ? d2.getTime() : 0;
      } else if (sortField === "amount") {
        v1 = m1.a?.amount || m1.b?.amount || 0;
        v2 = m2.a?.amount || m2.b?.amount || 0;
      } else if (sortField === "diff") {
        v1 = Math.abs(m1.diff || 0);
        v2 = Math.abs(m2.diff || 0);
      } else if (sortField === "score") {
        v1 = m1.score;
        v2 = m2.score;
      }

      return sortOrder === "asc" ? v1 - v2 : v2 - v1;
    });

    return result;
  }, [activeItems, filterTab, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Excluded from Reconciliation") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Ban className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (status.startsWith("Matched — Exact") || status.startsWith("Matched — TDS Adjusted")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (status.startsWith("Matched")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <Sparkles className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (status.startsWith("Partial")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (status.includes("Manual")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Layers className="w-3 h-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "All Items", count: counts.all },
            { id: "matched", label: "Matched", count: counts.matched },
            { id: "partial", label: "Partial / Variance", count: counts.partial },
            { id: "vendorOnly", label: "Vendor Only", count: counts.vendorOnly },
            { id: "buyerOnly", label: "SAP Only", count: counts.buyerOnly },
            { id: "manual", label: "Manual Linked", count: counts.manual },
            { id: "excluded", label: "Excluded", count: counts.excluded },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterTab === tab.id
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === tab.id
                    ? "bg-slate-700 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ref, SAP doc, amount…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
            <tr className="text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-10 text-center">#</th>
              <th className="py-3 px-4">Status & Logic</th>
              <th className="py-3 px-4">Type</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("date")}
              >
                <div className="flex items-center gap-1">
                  Vendor Date
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Vendor Ref</th>
              <th
                className="py-3 px-4 text-right cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1">
                  Vendor Gross (₹)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">SAP Doc No / Date</th>
              <th className="py-3 px-4">SAP Ref</th>
              <th className="py-3 px-4 text-right">SAP Net (₹)</th>
              <th className="py-3 px-4 text-right">TDS (₹)</th>
              <th
                className="py-3 px-4 text-right cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("diff")}
              >
                <div className="flex items-center justify-end gap-1">
                  Diff (₹)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-medium text-slate-600 text-sm">No reconciliation records found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try adjusting your search query or filter tab.
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const isExpanded = expandedId === item.id;
                const hasDiff = Math.abs(item.diff) > 0.01;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isExpanded ? "bg-indigo-50/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(item.status)}
                          <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]" title={item.basis}>
                            {item.basis}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {item.a?.type || item.b?.type || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.a?.date ? formatDateShort(item.a.date) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {item.a?.ref || "—"}
                        {item.extraVendorRows && item.extraVendorRows.length > 0 && (
                          <span className="block text-[10px] text-indigo-600">
                            +{item.extraVendorRows.length} batch invoice(s)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-semibold text-slate-800">
                        {item.a ? formatCurrency(Math.abs(item.a.amount), false) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800 font-semibold">
                          {item.b?.docNo || "—"}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {item.b?.date ? formatDateShort(item.b.date) : "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {item.b?.ref || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-medium text-slate-800">
                        {item.b ? formatCurrency(Math.abs(item.b.amount), false) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-slate-600">
                        {item.tds && item.tds > 0 ? (
                          <span className="text-indigo-600 font-medium">
                            {formatCurrency(item.tds, false)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-bold">
                        {hasDiff ? (
                          <span
                            className={
                              Math.abs(item.diff) <= 5.0
                                ? "text-amber-600"
                                : "text-rose-600"
                            }
                          >
                            {formatCurrency(Math.abs(item.diff), false)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                          title="Inspect match calculation details"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Match Calculation Drawer */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30 border-b border-indigo-100">
                        <td colSpan={12} className="py-4 px-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Calculation Formula */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Reconciliation Calculation
                              </span>
                              <div className="font-mono text-slate-800 space-y-1">
                                <div className="flex justify-between">
                                  <span>Vendor Gross:</span>
                                  <span className="font-semibold">
                                    {item.a ? formatCurrency(item.a.amount) : "₹0.00"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>- SAP Net Amount:</span>
                                  <span>{item.b ? formatCurrency(item.b.amount) : "₹0.00"}</span>
                                </div>
                                <div className="flex justify-between text-indigo-700">
                                  <span>- Booked TDS:</span>
                                  <span>{item.tds ? formatCurrency(item.tds) : "₹0.00"}</span>
                                </div>
                                <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                                  <span>Net Difference:</span>
                                  <span className={hasDiff ? "text-rose-600" : "text-emerald-600"}>
                                    {formatCurrency(Math.abs(item.diff))}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Matching Metadata */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Match Engine Diagnostics
                              </span>
                              <div className="text-slate-600 space-y-1">
                                <div>
                                  <span className="font-medium">Algorithm Pass:</span>{" "}
                                  <span className="text-slate-800">{item.matchPass || "Direct"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Match Score:</span>{" "}
                                  <span className="font-semibold text-indigo-600">{item.score}/100</span>
                                </div>
                                <div>
                                  <span className="font-medium">Date Variance:</span>{" "}
                                  <span>{item.days != null ? `${item.days} days lag` : "No date pair"}</span>
                                </div>
                                {item.b?.tdsSec && (
                                  <div>
                                    <span className="font-medium">TDS Statutory Section:</span>{" "}
                                    <span className="font-mono font-semibold text-slate-800">{item.b.tdsSec}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Narration & Actions */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                              <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Narrations & Texts
                                </span>
                                <p className="text-slate-600 text-[11px] line-clamp-2">
                                  <strong className="text-slate-700">Vendor:</strong> {item.a?.particulars || "—"}
                                </p>
                                <p className="text-slate-600 text-[11px] line-clamp-2 mt-1">
                                  <strong className="text-slate-700">SAP:</strong> {item.b?.desc || "—"}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2">
                                {item.status === "Excluded from Reconciliation" ? (
                                  onRestoreItem && (
                                    <button
                                      onClick={() => onRestoreItem(item)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      Restore to Reconciliation
                                    </button>
                                  )
                                ) : (
                                  <>
                                    {item.status.startsWith("Matched") && onUnlink && (
                                      <button
                                        onClick={() => onUnlink(item.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs transition-colors cursor-pointer"
                                      >
                                        <Link2Off className="w-3.5 h-3.5" />
                                        Unlink Pair
                                      </button>
                                    )}

                                    {onAddExceptionFromItem && (
                                      <button
                                        onClick={() => onAddExceptionFromItem(item)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
                                      >
                                        Log as Exception
                                      </button>
                                    )}

                                    {onExcludeItem && (
                                      <button
                                        onClick={() => {
                                          setExcludeTargetItem(item);
                                          setExclusionReasonInput(
                                            item.a?.particulars?.toLowerCase().includes("hold") || item.b?.desc?.toLowerCase().includes("hold")
                                              ? "Hold amount / disputed entry"
                                              : "Excluded from current reconciliation cycle"
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-xs transition-colors cursor-pointer"
                                        title="Exclude this entry from period balance and matching"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        Exclude Row
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Row Counter */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Showing {filteredItems.length} of {activeItems.length} reconciliation entries
        </span>
        <span className="font-mono text-[11px]">
          Matching Tolerance: ₹2.00 | Date Tolerance: 15 days
        </span>
      </div>

      {/* Exclusion Reason Modal */}
      {excludeTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2 text-purple-700">
              <Ban className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">
                Exclude Entry from Reconciliation
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              This entry will be excluded from the period movement and matching pool. It will be reported separately under Excluded Items in the Balance Reconciliation Statement.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Document/Ref:</span>
                <span className="font-bold text-slate-800">
                  {excludeTargetItem.a?.ref || excludeTargetItem.b?.docNo || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(excludeTargetItem.a?.amount || excludeTargetItem.b?.amount || 0)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for Exclusion
              </label>
              <input
                type="text"
                value={exclusionReasonInput}
                onChange={(e) => setExclusionReasonInput(e.target.value)}
                placeholder="e.g. Hold payment, separate vendor dispute, wrong ledger entry"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-purple-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExcludeTargetItem(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onExcludeItem && excludeTargetItem) {
                    onExcludeItem(excludeTargetItem, exclusionReasonInput.trim());
                  }
                  setExcludeTargetItem(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Confirm Exclusion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
