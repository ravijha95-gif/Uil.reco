import React, { useState, useMemo, useEffect } from "react";
import { BuyerRow, VendorRow } from "../types";
import { formatCurrency, formatDateShort, dateGapDays, normalizeReference } from "../utils/dateAndNumber";
import { detectTdsDeduction, TdsMatch } from "../utils/reconciliationEngine";
import {
  Link2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";

interface InteractiveMatcherProps {
  unmatchedVendor: VendorRow[];
  unmatchedBuyer: BuyerRow[];
  onManualPair: (
    vendorId: (string | number) | (string | number)[],
    buyerId: (string | number) | (string | number)[],
    note: string
  ) => void;
}

export const InteractiveMatcher: React.FC<InteractiveMatcherProps> = ({
  unmatchedVendor,
  unmatchedBuyer,
  onManualPair,
}) => {
  const [selectedVendorIds, setSelectedVendorIds] = useState<(string | number)[]>([]);
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<(string | number)[]>([]);
  const [vendorSearch, setVendorSearch] = useState<string>("");
  const [buyerSearch, setBuyerSearch] = useState<string>("");
  const [reasonCode, setReasonCode] = useState<string>("TDS Deduction");
  const [customNote, setCustomNote] = useState<string>("");

  const selectedVendors = useMemo(
    () => unmatchedVendor.filter((x) => selectedVendorIds.includes(x.id)),
    [unmatchedVendor, selectedVendorIds]
  );

  const selectedBuyers = useMemo(
    () => unmatchedBuyer.filter((x) => selectedBuyerIds.includes(x.id)),
    [unmatchedBuyer, selectedBuyerIds]
  );

  // Filtered lists
  const filteredVendor = useMemo(() => {
    if (!vendorSearch.trim()) return unmatchedVendor;
    const q = vendorSearch.toLowerCase();
    return unmatchedVendor.filter(
      (v) =>
        v.ref.toLowerCase().includes(q) ||
        v.particulars.toLowerCase().includes(q) ||
        v.amount.toString().includes(q)
    );
  }, [unmatchedVendor, vendorSearch]);

  const filteredBuyer = useMemo(() => {
    if (!buyerSearch.trim()) return unmatchedBuyer;
    const q = buyerSearch.toLowerCase();
    return unmatchedBuyer.filter(
      (b) =>
        b.ref.toLowerCase().includes(q) ||
        b.docNo.toLowerCase().includes(q) ||
        b.desc.toLowerCase().includes(q) ||
        b.amount.toString().includes(q)
    );
  }, [unmatchedBuyer, buyerSearch]);

  // Toggle single vendor row selection
  const toggleVendorRow = (id: string | number) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Group buyer rows by docNo to identify companion lines (Dr gross + Cr hold)
  const buyerDocGroups = useMemo(() => {
    const map = new Map<string, BuyerRow[]>();
    for (const b of unmatchedBuyer) {
      if (!b.docNo || b.docNo === "—" || b.docNo.length < 3) continue;
      const list = map.get(b.docNo) || [];
      list.push(b);
      map.set(b.docNo, list);
    }
    return map;
  }, [unmatchedBuyer]);

  // Toggle single buyer row selection
  const toggleBuyerRow = (id: string | number) => {
    setSelectedBuyerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Select all companion lines for a document number
  const selectAllCompanionsForDoc = (docNo: string) => {
    const companions = buyerDocGroups.get(docNo) || [];
    const companionIds = companions.map((c) => c.id);
    setSelectedBuyerIds((prev) => {
      const set = new Set([...prev, ...companionIds]);
      return Array.from(set);
    });
  };

  // Compute vendor Dr / Cr breakdown and net amount
  const { vDrTotal, vCrTotal, netVendorAmount, isVendorSplit } = useMemo(() => {
    const dr = selectedVendors.filter((v) => v.dc === "Dr").reduce((s, v) => s + v.amount, 0);
    const cr = selectedVendors.filter((v) => v.dc === "Cr").reduce((s, v) => s + v.amount, 0);
    const isSplit = selectedVendors.length > 1 && dr > 0 && cr > 0;
    const net = isSplit ? Math.abs(dr - cr) : selectedVendors.reduce((s, v) => s + v.amount, 0);
    return {
      vDrTotal: dr,
      vCrTotal: cr,
      netVendorAmount: net,
      isVendorSplit: isSplit,
    };
  }, [selectedVendors]);

  // Detect Dr / Cr split in selected buyer rows
  const { drTotal, crTotal, netBuyerAmount, isHoldSplit } = useMemo(() => {
    const dr = selectedBuyers.filter((b) => b.ind === "Dr").reduce((s, b) => s + b.amount, 0);
    const cr = selectedBuyers.filter((b) => b.ind === "Cr").reduce((s, b) => s + b.amount, 0);
    const isSplit = selectedBuyers.length > 1 && dr > 0 && cr > 0;
    const net = isSplit ? Math.abs(dr - cr) : selectedBuyers.reduce((s, b) => s + b.amount, 0);
    return {
      drTotal: dr,
      crTotal: cr,
      netBuyerAmount: net,
      isHoldSplit: isSplit,
    };
  }, [selectedBuyers]);

  // Total booked TDS in selected buyer rows
  const totalBookedTds = useMemo(() => {
    return selectedBuyers.reduce((s, b) => s + (b.tds || 0), 0);
  }, [selectedBuyers]);

  // Detect statutory Indian TDS deduction if applicable (only when not already hold split)
  const tdsMatch = useMemo(() => {
    if (selectedVendors.length === 0 || selectedBuyers.length === 0 || isHoldSplit) return null;
    return detectTdsDeduction(
      netVendorAmount,
      netBuyerAmount,
      3.0
    );
  }, [selectedVendors, selectedBuyers, netVendorAmount, netBuyerAmount, isHoldSplit]);

  // Real-time calculation: compare net amounts and account for booked or detected TDS / hold amounts
  const variance = useMemo(() => {
    if (selectedVendors.length === 0 || selectedBuyers.length === 0) return null;
    if (isHoldSplit) {
      return netVendorAmount - netBuyerAmount;
    }
    const buyerTds = totalBookedTds > 0 ? totalBookedTds : (tdsMatch ? tdsMatch.tdsAmount : 0);
    const grossSAP = netBuyerAmount + buyerTds;
    return netVendorAmount - grossSAP;
  }, [selectedVendors, selectedBuyers, isHoldSplit, netVendorAmount, netBuyerAmount, totalBookedTds, tdsMatch]);

  // Auto-fill reason code and remark when statutory TDS or Hold Split is identified
  useEffect(() => {
    if (isHoldSplit) {
      setReasonCode("Hold Payment Settlement");
      const doc = selectedBuyers[0]?.docNo || "";
      setCustomNote(
        `SAP Doc #${doc} Net Disbursement: Gross Dr ₹${drTotal.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} less Partial Hold Cr ₹${crTotal.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} = ₹${netBuyerAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      );
    } else if (selectedVendors.length > 1) {
      setReasonCode("Advance Settlement");
      setCustomNote(
        `Tally Multi-Line Match (${selectedVendors.length} items totaling ₹${netVendorAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`
      );
    } else if (tdsMatch) {
      setReasonCode("TDS Deduction");
      setCustomNote(`${tdsMatch.section}: ${tdsMatch.basis}`);
    } else {
      setReasonCode("TDS Deduction");
      setCustomNote("");
    }
  }, [isHoldSplit, tdsMatch, selectedVendors.length, selectedBuyers.length, drTotal, crTotal, netBuyerAmount, netVendorAmount]);

  const daysGap = useMemo(() => {
    if (selectedVendors.length === 0 || selectedBuyers.length === 0) return null;
    return dateGapDays(selectedVendors[0].date, selectedBuyers[0].date);
  }, [selectedVendors, selectedBuyers]);

  const handlePairSubmit = () => {
    if (selectedVendorIds.length === 0 || selectedBuyerIds.length === 0) return;
    let note = customNote.trim();
    if (!note) {
      if (isHoldSplit) {
        note = `SAP Split Payment with Hold: Dr ₹${drTotal.toFixed(2)} - Cr ₹${crTotal.toFixed(2)} = ₹${netBuyerAmount.toFixed(2)}`;
      } else if (selectedVendorIds.length > 1) {
        note = `Vendor Multi-line (${selectedVendorIds.length} items totaling ₹${netVendorAmount.toFixed(2)}) matched with SAP`;
      } else if (tdsMatch) {
        note = `${tdsMatch.section}: ${tdsMatch.basis}`;
      } else {
        note = `${reasonCode} (Variance: ₹${variance ? Math.abs(variance).toFixed(2) : "0.00"})`;
      }
    }
    onManualPair(selectedVendorIds, selectedBuyerIds, note);
    setSelectedVendorIds([]);
    setSelectedBuyerIds([]);
    setCustomNote("");
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Guide */}
      <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-white p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Manual Matcher Workbench
            </h3>
            <p className="text-xs text-slate-600">
              Select one unmatched item from Vendor ledger and one from SAP to pair them with an adjustment reason code.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Unmatched Pool: <span className="text-indigo-700 font-bold">{unmatchedVendor.length}</span> Vendor /{" "}
          <span className="text-indigo-700 font-bold">{unmatchedBuyer.length}</span> SAP
        </div>
      </div>

      {/* Split-Screen Selection Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Unmatched Vendor Rows */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-[480px]">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Unmatched Vendor Ledger (Tally)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {selectedVendorIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedVendorIds([])}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                >
                  Clear ({selectedVendorIds.length})
                </button>
              )}
              <span className="text-xs font-mono text-slate-500">
                {filteredVendor.length} row(s)
              </span>
            </div>
          </div>

          <div className="p-2 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search vendor ref, narration, amount…"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded text-xs border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredVendor.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No unmatched vendor rows found.
              </div>
            ) : (
              filteredVendor.map((v) => {
                const isSelected = selectedVendorIds.includes(v.id);
                return (
                  <div
                    key={v.id}
                    onClick={() => toggleVendorRow(v.id)}
                    className={`p-3 transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? "bg-indigo-50 border-l-4 border-indigo-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div onClick
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-bold text-slate-800">{v.ref || "No Ref"}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 font-mono">
                          {formatCurrency(v.amount)}
                        </span>
                        <span
                          className={`ml-1 text-[11px] font-bold ${
                            v.dc === "Dr" ? "text-blue-600" : "text-amber-600"
                          }`}
                        >
                          {v.dc}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 mt-1 text-[11px] pl-6">
                      <span>{v.date ? formatDateShort(v.date) : "—"}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                        {v.type} ({v.dc})
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] line-clamp-1 mt-1 pl-6">
                      {v.particulars}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Unmatched Buyer Rows */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-[480px]">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Unmatched Buyer Ledger (SAP FBL1N)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {selectedBuyerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBuyerIds([])}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                >
                  Clear ({selectedBuyerIds.length})
                </button>
              )}
              <span className="text-xs font-mono text-slate-500">
                {filteredBuyer.length} row(s)
              </span>
            </div>
          </div>

          <div className="p-2 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search SAP doc, reference, amount…"
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded text-xs border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredBuyer.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No unmatched SAP rows found.
              </div>
            ) : (
              filteredBuyer.map((b) => {
                const isSelected = selectedBuyerIds.includes(b.id);
                const docGroup = b.docNo && b.docNo !== "—" ? buyerDocGroups.get(b.docNo) : null;
                const hasCompanion = docGroup && docGroup.length > 1;
                const companionDrCr = hasCompanion && docGroup.some((x) => x.ind === "Dr") && docGroup.some((x) => x.ind === "Cr");

                return (
                  <div
                    key={b.id}
                    onClick={() => toggleBuyerRow(b.id)}
                    className={`p-3 transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? "bg-indigo-50 border-l-4 border-indigo-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div onClick
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-800">{b.docNo || "No Doc"}</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            (Ref: {b.ref || "—"})
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 font-mono">
                          {formatCurrency(Math.abs(b.amount))}
                        </span>
                        <span
                          className={`ml-1 text-[11px] font-bold ${
                            b.ind === "Dr" ? "text-blue-600" : "text-amber-600"
                          }`}
                        >
                          {b.ind}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 mt-1 text-[11px] pl-6">
                      <span>{b.date ? formatDateShort(b.date) : "—"}</span>
                      <div className="flex items-center gap-1">
                        {b.tds > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium">
                            TDS {formatCurrency(b.tds)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                          {b.type} ({b.ind})
                        </span>
                      </div>
                    </div>

                    {/* Companion Line Prompt for Multi-Row Payment Documents (Dr gross + Cr hold) */}
                    {companionDrCr && (
                      <div className="mt-1.5 pl-6 flex items-center justify-between">
                        <span className="text-[10.5px] text-amber-700 font-medium">
                          ⚡ Multi-line SAP Payment Doc (Dr Gross + Cr Hold)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllCompanionsForDoc(b.docNo);
                          }}
                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Select Both Lines
                        </button>
                      </div>
                    )}

                    <p className="text-slate-500 text-[11px] line-clamp-1 mt-1 pl-6">
                      {b.desc || "—"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Active Pairing Resolution Deck */}
      {selectedVendors.length > 0 && selectedBuyers.length > 0 ? (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Confirm Manual Pair Alignment
              </h4>
              {isHoldSplit ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  SAP Multi-Row Payment with Hold Amount
                </span>
              ) : selectedVendors.length > 1 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Vendor Multi-line ({selectedVendors.length} items)
                </span>
              ) : tdsMatch ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {tdsMatch.section} TDS Matched
                </span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">
              Days Gap: <span className="font-semibold text-slate-700">{daysGap ?? "—"} days</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Vendor Item Summary (Supports single or multi-row) */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Vendor Entry ({selectedVendors.length} selected row{selectedVendors.length > 1 ? "s" : ""})
              </span>
              {selectedVendors.length === 1 ? (
                <>
                  <div className="font-bold text-slate-800 text-sm">{selectedVendors[0].ref || "Payment"}</div>
                  <div className="text-slate-600 mt-1">
                    Amount: <span className="font-semibold text-slate-900">{formatCurrency(Math.abs(selectedVendors[0].amount))}</span>{" "}
                    <span className="text-slate-500 font-bold text-[11px]">({selectedVendors[0].dc})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Date: {selectedVendors[0].date ? formatDateShort(selectedVendors[0].date) : "—"} | {selectedVendors[0].vchType || selectedVendors[0].type}
                  </div>
                  {selectedVendors[0].particulars && (
                    <div className="text-[10.5px] text-slate-500 mt-1 line-clamp-1">
                      {selectedVendors[0].particulars}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-xs">
                    Vouchers: {selectedVendors.map((v) => v.ref || "No Ref").slice(0, 3).join(", ")}
                    {selectedVendors.length > 3 ? ` +${selectedVendors.length - 3} more` : ""}
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Vendor Amount:</span>
                    <span className="text-indigo-700">{formatCurrency(netVendorAmount)}</span>
                  </div>
                  {isVendorSplit && (
                    <div className="text-[10.5px] text-slate-500">
                      Dr: {formatCurrency(vDrTotal)} | Cr: {formatCurrency(vCrTotal)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Buyer Item Summary (Supports single or multi-row with Dr + Cr hold) */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                SAP Document ({selectedBuyers.length} selected row{selectedBuyers.length > 1 ? "s" : ""})
              </span>
              <div className="font-bold text-slate-800 text-sm">
                Doc #{selectedBuyers.map((b) => b.docNo).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
              </div>

              {isHoldSplit ? (
                <div className="space-y-1 mt-1 text-[11.5px]">
                  <div className="flex justify-between text-blue-700">
                    <span>Dr Gross Disbursement:</span>
                    <span className="font-semibold">{formatCurrency(drTotal)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Less Cr Hold Amount:</span>
                    <span className="font-semibold">−{formatCurrency(crTotal)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                    <span>Net Disbursed Cash:</span>
                    <span className="text-emerald-700">{formatCurrency(netBuyerAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 mt-1">
                  Net: <span className="font-semibold text-slate-900">{formatCurrency(netBuyerAmount)}</span>{" "}
                  {totalBookedTds > 0 ? (
                    <span className="text-emerald-700 font-medium">+ TDS {formatCurrency(totalBookedTds)}</span>
                  ) : tdsMatch ? (
                    <span className="text-indigo-600 font-semibold block text-[11px] mt-0.5">
                      + TDS ({tdsMatch.section}): {formatCurrency(tdsMatch.tdsAmount)}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="text-[11px] text-slate-500 mt-1">
                Ref: {selectedBuyers[0].ref || "—"} | Date: {selectedBuyers[0].date ? formatDateShort(selectedBuyers[0].date) : "—"}
              </div>
            </div>

            {/* Calculated Variance */}
            <div
              className={`p-3 rounded-lg border flex flex-col justify-between ${
                variance != null && Math.abs(variance) <= 3.0
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Net Pair Variance
                </span>
                <div
                  className={`text-lg font-bold font-mono ${
                    variance != null && Math.abs(variance) <= 3.0
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {formatCurrency(variance != null ? Math.abs(variance) : 0)}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                {isHoldSplit && Math.abs(variance || 0) <= 3.0
                  ? `Dr ₹${drTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} less Cr ₹${crTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Hold equals Vendor Payment ₹${netVendorAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Exactly!`
                  : tdsMatch && Math.abs(variance || 0) <= 3.0
                  ? "Auto-reconciled with TDS @10% U/s 194J"
                  : variance != null && Math.abs(variance) <= 3.0
                  ? "Within tolerance threshold"
                  : "Will be logged with your custom reason code"}
              </p>
            </div>
          </div>

          {/* Reason Code & Submit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Adjustment Reason Code
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                <option>Hold Payment Settlement</option>
                <option>TDS Deduction</option>
                <option>Bank Processing Charges</option>
                <option>Timing / Month-End Carryover</option>
                <option>Rate Variance / Price Revision</option>
                <option>Agreed Commercial Discount</option>
                <option>Quality Rejection Debit</option>
                <option>Minor Rounding Variance</option>
                <option>Advance Settlement</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Audit Note / Remark
              </label>
              <input
                type="text"
                placeholder="e.g. Approved by vendor via email on 12-Aug"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handlePairSubmit}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Pair & Reconcile
              </button>
              <button
                onClick={() => {
                  setSelectedVendorIds([]);
                  setSelectedBuyerIds([]);
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
          Select one or more unmatched Vendor items on the left and one or more unmatched SAP items on the right to link them together.
        </div>
      )}
    </div>
  );
};
