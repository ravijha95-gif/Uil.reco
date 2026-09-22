import React, { useState, useMemo, useEffect } from "react";
import {
  BuyerRow,
  ConclusionStatementData,
  ReconcileItem,
  SecondaryReconciliationSchedule,
  VendorRow,
} from "../types";
import { ReconcileResult } from "../utils/reconciliationEngine";
import { buildConclusionData, ConclusionDrilldown, round2 } from "../utils/conclusionHelper";
import { exportConclusionToExcel } from "../utils/excelExport";
import { formatCurrency, formatDateShort } from "../utils/dateAndNumber";
import {
  FileSpreadsheet,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ExternalLink,
  Edit3,
  Sparkles,
  Calculator,
  Layers,
  FileCheck,
  Building2,
  Calendar,
  Tag,
  Hash,
  X,
} from "lucide-react";

interface ConclusionPanelProps {
  reconResult: ReconcileResult;
  vendorRows: VendorRow[];
  buyerRows: BuyerRow[];
  storedTotals: any;
  overrides?: Partial<ConclusionStatementData> | null;
  onUpdateOverrides?: (overrides: Partial<ConclusionStatementData> | null) => void;
}

// Printable HTML Generator for Statutory Utkarsh India Limited Conclusion Statement
export function generatePrintableHtml(data: ConclusionStatementData): string {
  const isBalanced = Math.abs(data.netDifference) < 0.01;
  const statusColor = isBalanced ? "#15803d" : "#b91c1c";
  const statusText = isBalanced
    ? "RECONCILED (Net Difference ₹0.00)"
    : `VARIANCE: ₹${Math.abs(data.netDifference).toFixed(2)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Statutory Reconciliation Statement - ${data.vendorName || "Vendor"} (${data.vendorCode || "SAP"})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 10px;
      font-size: 10.5pt;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .org-name {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: -0.3px;
    }
    .doc-title {
      font-size: 11pt;
      font-weight: 600;
      color: #475569;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 9pt;
      font-weight: 700;
      border-radius: 4px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #1e293b;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 16px;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      font-size: 9.5pt;
    }
    .meta-table td {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
    }
    .meta-lbl {
      color: #64748b;
      font-weight: 600;
      width: 25%;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 700;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
    }
    table.data-table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
      text-align: left;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .subtotal-row {
      background: #fef3c7 !important;
      font-weight: bold;
      border-top: 2px solid #d97706 !important;
      border-bottom: 2px solid #d97706 !important;
    }
    .supplier-row {
      background: #ecfdf5 !important;
      font-weight: bold;
      border-bottom: 2px solid #059669 !important;
    }
    .difference-row {
      background: #fef08a !important;
      font-weight: 800;
      border: 2.5px solid #ca8a04 !important;
    }
    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 28%;
      text-align: center;
      border-top: 1px dashed #64748b;
      padding-top: 6px;
      font-size: 8.5pt;
      color: #475569;
    }
    .sig-title {
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="org-name">UTKARSH INDIA LIMITED</h1>
      <p class="doc-title">Creditor Reconciliation & Closing Balance Conclusion Statement</p>
    </div>
    <div style="text-align: right;">
      <span class="badge">STATUTORY AUDIT FORMAT</span>
      <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">Statement Date: ${data.statementDate}</div>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-lbl">Vendor Code (SAP):</td>
      <td class="meta-val">${data.vendorCode || "—"}</td>
      <td class="meta-lbl">Vendor / Party Name:</td>
      <td class="meta-val">${data.vendorName || "—"}</td>
    </tr>
    <tr>
      <td class="meta-lbl">Closing Period:</td>
      <td class="meta-val">As on ${data.statementDate}</td>
      <td class="meta-lbl">Opening Balance Date:</td>
      <td class="meta-val">As on ${data.openingDate}</td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 50%;">Line Item / Calculation Description</th>
        <th style="width: 15%; text-align: right;">Ref Amount (₹)</th>
        <th style="width: 25%; text-align: right;">Audited Amount (₹)</th>
        <th style="width: 10%; text-align: center;">Side</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold">Closing Balance as per UIL (${data.statementDate})${data.rowNotes?.closingBalUil ? `<br/><small style="color:#64748b;font-weight:normal;">${data.rowNotes.closingBalUil}</small>` : ""}</td>
        <td class="text-right font-mono">${Math.round(data.closingBalUil).toLocaleString("en-IN")}</td>
        <td class="text-right font-mono font-bold">${data.closingBalUil.toFixed(2)}</td>
        <td class="text-center font-bold">${data.closingBalUilDc}</td>
      </tr>
      <tr>
        <td><strong>ADD:</strong> Invoice booking pending at UIL Account${data.rowNotes?.invoicePendingUil ? `<br/><small style="color:#64748b;">${data.rowNotes.invoicePendingUil}</small>` : ""}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">${data.invoicePendingUil > 0 ? data.invoicePendingUil.toFixed(2) : "0.00"}</td>
        <td class="text-center">—</td>
      </tr>
      <tr style="background:#fffbeb;">
        <td><strong>ADD:</strong> TDS Debited by UIL but not Credited by Supplier${data.tdsParticulars ? `<br/><small style="color:#64748b;">${data.tdsParticulars}</small>` : ""}</td>
        <td class="text-right font-mono">${data.tdsDebitedUilNotSupplier > 0 ? data.tdsDebitedUilNotSupplier.toFixed(2) : "—"}</td>
        <td class="text-right font-mono font-bold">${data.tdsDebitedUilNotSupplier.toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr>
        <td><strong>LESS:</strong> TDS Credited By Supplier But Not Debited By UIL${data.rowNotes?.tdsCreditedSupplierNotUil ? `<br/><small style="color:#64748b;">${data.rowNotes.tdsCreditedSupplierNotUil}</small>` : ""}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">${data.tdsCreditedSupplierNotUil.toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr>
        <td><strong>ADD:</strong> Payment made by UIL but not Credited by Supplier${data.rowNotes?.paymentMadeUilNotSupplier ? `<br/><small style="color:#64748b;">${data.rowNotes.paymentMadeUilNotSupplier}</small>` : ""}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">${data.paymentMadeUilNotSupplier.toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr>
        <td><strong>LESS:</strong> Payment not made by UIL but Credited by Supplier${data.rowNotes?.paymentNotMadeUilCreditedSupplier ? `<br/><small style="color:#64748b;">${data.rowNotes.paymentNotMadeUilCreditedSupplier}</small>` : ""}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">${data.paymentNotMadeUilCreditedSupplier.toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr>
        <td><strong>LESS:</strong> Invoice Credited by UIL but not Issued by Supplier${data.rowNotes?.invoiceCreditedUilNotSupplier ? `<br/><small style="color:#64748b;">${data.rowNotes.invoiceCreditedUilNotSupplier}</small>` : ""}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">${data.invoiceCreditedUilNotSupplier.toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr>
        <td colspan="4" style="background:#f8fafc; font-weight:bold;">ADD: Difference in Opening Balance As On ${data.openingDate}${data.rowNotes?.openingBalDiff ? `<br/><small style="color:#64748b;font-weight:normal;">${data.rowNotes.openingBalDiff}</small>` : ""}</td>
      </tr>
      <tr style="color:#475569; font-size:9pt;">
        <td style="padding-left: 20px;">As Per UIL As On ${data.openingDate}</td>
        <td class="text-right font-mono">${Math.abs(data.openingBalUil).toFixed(2)}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-center">—</td>
      </tr>
      <tr style="color:#475569; font-size:9pt;">
        <td style="padding-left: 20px;">As Per Supplier As On ${data.openingDate}</td>
        <td class="text-right font-mono">${Math.abs(data.openingBalSupplier).toFixed(2)}</td>
        <td class="text-right font-mono font-bold" style="color:#b91c1c;">${Math.abs(data.openingBalDiff).toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr>
        <td>Rounding off difference ${data.autoRoundOffApplied ? '<span style="color:#059669;font-weight:bold;">(Auto Round-off &lt; ₹10)</span>' : ''}${data.rowNotes?.roundingOffDiff ? `<br/><small style="color:#64748b;">${data.rowNotes.roundingOffDiff}</small>` : ""}</td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono">${data.roundingOffDiff.toFixed(2)}</td>
        <td class="text-center">—</td>
      </tr>
      <tr class="subtotal-row">
        <td><strong>Calculated Reconciled Balance (Subtotal)</strong></td>
        <td class="text-right font-mono">${Math.round(data.calculatedReconciledBalance).toLocaleString("en-IN")}</td>
        <td class="text-right font-mono font-bold" style="font-size:11pt;">${data.calculatedReconciledBalance.toFixed(2)}</td>
        <td class="text-center font-bold">Subtotal</td>
      </tr>
      <tr class="supplier-row">
        <td><strong>Closing Balance as per Supplier (${data.statementDate})</strong>${data.rowNotes?.closingBalSupplier ? `<br/><small style="color:#64748b;font-weight:normal;">${data.rowNotes.closingBalSupplier}</small>` : ""}</td>
        <td class="text-right font-mono">${Math.round(data.closingBalSupplier).toLocaleString("en-IN")}</td>
        <td class="text-right font-mono font-bold" style="font-size:11pt;">${data.closingBalSupplier.toFixed(2)}</td>
        <td class="text-center font-bold">${data.closingBalSupplierDc}</td>
      </tr>
      <tr class="difference-row">
        <td><strong style="font-size:11pt; text-transform:uppercase;">Net Difference</strong></td>
        <td class="text-right font-mono">—</td>
        <td class="text-right font-mono font-bold" style="font-size:13pt;">${data.netDifference.toFixed(2)}</td>
        <td class="text-center font-bold" style="color:${statusColor};">${isBalanced ? "✓ ₹0.00" : "VARIANCE"}</td>
      </tr>
    </tbody>
  </table>

  <div style="background:#f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 24px; font-size: 9pt;">
    <strong>Audit Conclusion Status: </strong>
    <span style="color:${statusColor}; font-weight:bold;">${statusText}</span>
    ${data.autoRoundOffApplied ? '<span style="color:#059669; margin-left: 12px;">• Standard sub-10 rupee rounding absorbed into line E36</span>' : ''}
  </div>

  <div class="footer">
    <div class="sig-box">
      <div>Prepared by</div>
      <div class="sig-title">Accounts Executive</div>
    </div>
    <div class="sig-box">
      <div>Verified by</div>
      <div class="sig-title">Finance Manager</div>
    </div>
    <div class="sig-box">
      <div>Authorized Signatory</div>
      <div class="sig-title">Utkarsh India Limited</div>
    </div>
  </div>
</body>
</html>`;
}

export const ConclusionPanel: React.FC<ConclusionPanelProps> = ({
  reconResult,
  vendorRows,
  buyerRows,
  storedTotals,
  overrides: propOverrides,
  onUpdateOverrides,
}) => {
  const [activeView, setActiveView] = useState<"primary" | "secondary" | "formula">("primary");
  const [localOverrides, setLocalOverrides] = useState<Partial<ConclusionStatementData> | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Use lifted state from App.tsx if provided to persist across tab switches
  const overrides = propOverrides !== undefined ? propOverrides : localOverrides;
  const setOverrides = (updater: any) => {
    const nextVal = typeof updater === "function" ? updater(overrides) : updater;
    if (onUpdateOverrides) {
      onUpdateOverrides(nextVal);
    } else {
      setLocalOverrides(nextVal);
    }
  };

  const [selectedDrilldown, setSelectedDrilldown] = useState<{
    title: string;
    items: { ref: string; date?: Date | null; amount: number; desc?: string }[];
  } | null>(null);

  // Derive conclusion data with any user overrides
  const { data, secondary, drilldown } = useMemo(() => {
    return buildConclusionData(
      reconResult,
      vendorRows,
      buyerRows,
      storedTotals,
      overrides || undefined
    );
  }, [reconResult, vendorRows, buyerRows, storedTotals, overrides]);

  const isBalanced = Math.abs(data.netDifference) < 0.01;

  // Handler to load the exact benchmark numbers from the attached PDF
  const handleLoadPdfBenchmark = () => {
    setOverrides({
      vendorCode: "1200001029",
      vendorName: "Rohan Enterprises",
      statementDate: "31.03.25",
      openingDate: "01.04.2024",
      closingBalUil: 29796.13,
      closingBalUilDc: "Cr",
      invoicePendingUil: 0.0,
      tdsDebitedUilNotSupplier: 716.0,
      tdsParticulars: "TDS DEDUCTED ON BOTH ADVANCE & INVOICE / TDS FY 24-25",
      tdsCreditedSupplierNotUil: 0.0,
      paymentMadeUilNotSupplier: 0.0,
      paymentNotMadeUilCreditedSupplier: 0.0,
      invoiceCreditedUilNotSupplier: 0.0,
      openingBalUil: 181.87,
      openingBalSupplier: 0.0,
      openingBalDiff: 181.87,
      roundingOffDiff: 0.0,
      closingBalSupplier: 30694.0,
      closingBalSupplierDc: "Dr",
    });
  };

  const handleResetToEngine = () => {
    setOverrides(null);
  };

  const handleFieldChange = (field: keyof ConclusionStatementData, val: any) => {
    const cleanVal = typeof val === "number" ? round2(val) : val;
    setOverrides((prev: any) => ({
      ...(prev || {}),
      [field]: cleanVal,
    }));
  };

  const handleRowNoteChange = (rowKey: string, note: string) => {
    setOverrides((prev: any) => ({
      ...(prev || {}),
      rowNotes: {
        ...(prev?.rowNotes || {}),
        [rowKey]: note,
      },
    }));
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const handleDirectBrowserPrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn("Direct window.print() failed, opening printable window:", e);
      handleOpenPrintWindow();
    }
  };

  // Enable Ctrl+P / Cmd+P shortcut to trigger native print dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleDirectBrowserPrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data]);

  const handleOpenPrintWindow = () => {
    const printWindow = window.open("", "_blank", "width=900,height=800");
    const htmlContent = generatePrintableHtml(data);
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleDownloadPrintableHtml = () => {
    const htmlContent = generatePrintableHtml(data);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reconciliation_Statement_${data.vendorCode || "Vendor"}_${data.statementDate.replace(/\./g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    exportConclusionToExcel(data, secondary);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Reconciliation Statement Utkarsh India Limited
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Statutory Audit Format
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Official closing balance conclusion model based on UIL financial statement standards
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLoadPdfBenchmark}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors cursor-pointer"
            title="Populate statement with the exact numbers from the Utkarsh India Limited PDF"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Load PDF Benchmark Example
          </button>

          {overrides && (
            <button
              onClick={handleResetToEngine}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Reset all fields back to live data derived by the reconciliation engine"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Live Data
            </button>
          )}

          <button
            onClick={handleDirectBrowserPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-2xs cursor-pointer"
            title="Print (Ctrl+P) via native print dialog with print-isolated CSS (@media print)."
          >
            <Printer className="w-3.5 h-3.5" />
            Print (Ctrl+P)
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="View statement preview modal"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Statement Preview
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Hash className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase">
                Vendor Code
              </span>
              {data.isVendorFromSap && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  From SAP
                </span>
              )}
            </div>
            <div className="relative flex items-center mt-0.5">
              <input
                type="text"
                value={data.vendorCode ?? ""}
                onChange={(e) => handleFieldChange("vendorCode", e.target.value)}
                placeholder="Vendor Code..."
                className="font-mono font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white px-2 py-1 pr-6 rounded border border-slate-200 focus:border-indigo-500 w-full text-xs transition-colors"
              />
              {Boolean(data.vendorCode) && (
                <button
                  type="button"
                  onClick={() => handleFieldChange("vendorCode", "")}
                  title="Clear Vendor Code"
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase">
                Vendor Name
              </span>
              {data.isVendorFromSap && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  From SAP
                </span>
              )}
            </div>
            <div className="relative flex items-center mt-0.5">
              <input
                type="text"
                value={data.vendorName ?? ""}
                onChange={(e) => handleFieldChange("vendorName", e.target.value)}
                placeholder="Vendor / Party Name..."
                className="font-semibold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white px-2 py-1 pr-6 rounded border border-slate-200 focus:border-indigo-500 w-full text-xs transition-colors"
              />
              {Boolean(data.vendorName) && (
                <button
                  type="button"
                  onClick={() => handleFieldChange("vendorName", "")}
                  title="Clear Vendor Name"
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">
              Closing Date (As on)
            </span>
            <input
              type="text"
              value={data.statementDate}
              onChange={(e) => handleFieldChange("statementDate", e.target.value)}
              className="font-mono font-semibold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white px-2 py-0.5 rounded border border-transparent focus:border-indigo-500 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">
              Balancing Status
            </span>
            <div className="flex items-center gap-1.5 font-bold">
              {isBalanced ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Balanced (₹0.00 Net Diff)
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Variance: {formatCurrency(data.netDifference)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveView("primary")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeView === "primary"
              ? "border-amber-500 text-amber-800 bg-amber-50/40"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Primary Statutory Statement (Utkarsh India Layout)
        </button>
        <button
          onClick={() => setActiveView("secondary")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeView === "secondary"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Secondary Working Schedule (Columns H–I)
        </button>
        <button
          onClick={() => setActiveView("formula")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeView === "formula"
              ? "border-sky-500 text-sky-700 bg-sky-50/40"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Mathematical Logic & Cell E40 Walkthrough
        </button>
      </div>

      {/* VIEW 1: Primary Statutory Statement (PDF Format) */}
      {activeView === "primary" && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          {/* Header Banner matching PDF */}
          <div className="bg-amber-100/90 px-6 py-2.5 border-b border-amber-300 text-center font-bold text-xs uppercase tracking-wider text-slate-800">
            Reconciliation Statement Utkarsh India Limited
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-amber-50/90 border-b border-amber-300 text-slate-900 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-1/2 border-r border-amber-300">Particulars</th>
                  <th className="py-2.5 px-4 text-right border-r border-amber-300 w-36">
                    Amount in Rs (D)
                  </th>
                  <th className="py-2.5 px-4 text-right border-r border-amber-300 w-44">
                    Amount in Rs (E)
                  </th>
                  <th className="py-2.5 px-4 text-center w-20">Dr/Cr (F)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 1. Closing Balance As Per UIL */}
                <tr className="bg-amber-50/30 font-bold text-slate-900">
                  <td className="py-3 px-4 border-r border-slate-200">
                    <span className="block font-bold text-slate-900">
                      Closing Balance As Per UIL As On {data.statementDate}
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (optional)..."
                      value={data.rowNotes?.closingBalUil || ""}
                      onChange={(e) => handleRowNoteChange("closingBalUil", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-3 px-4 text-right font-mono border-r border-slate-200">
                    {Math.round(data.closingBalUil).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      value={round2(data.closingBalUil)}
                      onChange={(e) =>
                        handleFieldChange("closingBalUil", round2(parseFloat(e.target.value) || 0))
                      }
                      className="w-32 px-2 py-1 text-right rounded font-mono font-bold border border-slate-300 bg-white"
                    />
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <select
                      value={data.closingBalUilDc}
                      onChange={(e) =>
                        handleFieldChange("closingBalUilDc", e.target.value as "Dr" | "Cr")
                      }
                      className="px-2 py-1 rounded border border-slate-300 font-bold bg-white text-xs"
                    >
                      <option value="Cr">Cr</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </td>
                </tr>

                {/* 2. ADD: Invoice booking pending at UIL Account */}
                <tr>
                  <td className="py-2 px-4 border-r border-slate-200">
                    <span className="font-bold text-slate-700">ADD:</span>
                    <span className="block font-normal text-slate-800">
                      Invoice booking pending at UIL Account
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (optional)..."
                      value={data.rowNotes?.invoicePendingUil || ""}
                      onChange={(e) => handleRowNoteChange("invoicePendingUil", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200">
                    <div className="flex items-center justify-end gap-1.5">
                      {drilldown.unbookedInvoices.length > 0 && (
                        <button
                          onClick={() =>
                            setSelectedDrilldown({
                              title: "Invoice booking pending at UIL Account",
                              items: drilldown.unbookedInvoices,
                            })
                          }
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-mono transition-colors"
                          title="Inspect underlying invoices"
                        >
                          {drilldown.unbookedInvoices.length} inv
                        </button>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        value={round2(data.invoicePendingUil)}
                        onChange={(e) =>
                          handleFieldChange("invoicePendingUil", round2(parseFloat(e.target.value) || 0))
                        }
                        className="w-28 px-2 py-1 text-right rounded font-mono border border-slate-200 bg-white"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400 border-slate-200">—</td>
                </tr>

                {/* 3. ADD: TDS Debited by UIL but not Credited by Supplier */}
                <tr className="bg-slate-50/40">
                  <td className="py-2 px-4 border-r border-slate-200">
                    <span className="font-bold text-slate-700 block">ADD:</span>
                    <span className="font-normal text-slate-800 block">
                      TDS Debited by UIL but not Credited by Supplier
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (e.g. TDS FY 24-25)..."
                      value={data.tdsParticulars || ""}
                      onChange={(e) => handleFieldChange("tdsParticulars", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-amber-300 bg-white focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 font-semibold text-slate-700">
                    {data.tdsDebitedUilNotSupplier > 0
                      ? data.tdsDebitedUilNotSupplier.toFixed(2)
                      : "—"}
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 bg-amber-50/50">
                    <div className="flex items-center justify-end gap-1.5">
                      {drilldown.uncreditedTds.length > 0 && (
                        <button
                          onClick={() =>
                            setSelectedDrilldown({
                              title: "TDS Debited by UIL but not Credited by Supplier",
                              items: drilldown.uncreditedTds,
                            })
                          }
                          className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-mono transition-colors"
                          title="Inspect TDS lines"
                        >
                          {drilldown.uncreditedTds.length} lines
                        </button>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        value={round2(data.tdsDebitedUilNotSupplier)}
                        onChange={(e) =>
                          handleFieldChange(
                            "tdsDebitedUilNotSupplier",
                            round2(parseFloat(e.target.value) || 0)
                          )
                        }
                        className="w-28 px-2 py-1 text-right rounded font-mono font-semibold border border-amber-300 bg-white"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400">—</td>
                </tr>

                {/* 4. LESS: TDS Credited By Supplier But Not Debited By UIL */}
                <tr>
                  <td className="py-2 px-4 border-r border-slate-200">
                    <span className="font-bold text-rose-700 block">LESS:</span>
                    <span className="font-normal text-slate-800 block">
                      TDS Credited By Supplier But Not Debited By UIL
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (optional)..."
                      value={data.rowNotes?.tdsCreditedSupplierNotUil || ""}
                      onChange={(e) => handleRowNoteChange("tdsCreditedSupplierNotUil", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      value={round2(data.tdsCreditedSupplierNotUil)}
                      onChange={(e) =>
                        handleFieldChange(
                          "tdsCreditedSupplierNotUil",
                          round2(parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-28 px-2 py-1 text-right rounded font-mono border border-slate-200 bg-white"
                    />
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400">—</td>
                </tr>

                {/* 5. ADD: Payment made by UIL but not Credited by Supplier */}
                <tr className="bg-slate-50/40">
                  <td className="py-2 px-4 border-r border-slate-200">
                    <span className="font-bold text-slate-700 block">ADD:</span>
                    <span className="font-normal text-slate-800 block">
                      Payment made by UIL but not Credited by Supplier
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (optional)..."
                      value={data.rowNotes?.paymentMadeUilNotSupplier || ""}
                      onChange={(e) => handleRowNoteChange("paymentMadeUilNotSupplier", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200">
                    <div className="flex items-center justify-end gap-1.5">
                      {drilldown.uncreditedPayments.length > 0 && (
                        <button
                          onClick={() =>
                            setSelectedDrilldown({
                              title: "Payments made by UIL not Credited by Supplier",
                              items: drilldown.uncreditedPayments,
                            })
                          }
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-mono transition-colors"
                          title="Inspect payments"
                        >
                          {drilldown.uncreditedPayments.length} pay
                        </button>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        value={round2(data.paymentMadeUilNotSupplier)}
                        onChange={(e) =>
                          handleFieldChange(
                            "paymentMadeUilNotSupplier",
                            round2(parseFloat(e.target.value) || 0)
                          )
                        }
                        className="w-28 px-2 py-1 text-right rounded font-mono border border-slate-200 bg-white"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400">—</td>
                </tr>

                {/* 6. LESS: Payment Not made by UIL but Credited by Supplier */}
                <tr>
                  <td className="py-2 px-4 border-r border-slate-200">
                    <span className="font-bold text-rose-700 block">LESS:</span>
                    <span className="font-normal text-slate-800 block">
                      Payment Not made by UIL but Credited by Supplier
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (optional)..."
                      value={data.rowNotes?.paymentNotMadeUilCreditedSupplier || ""}
                      onChange={(e) => handleRowNoteChange("paymentNotMadeUilCreditedSupplier", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      value={round2(data.paymentNotMadeUilCreditedSupplier)}
                      onChange={(e) =>
                        handleFieldChange(
                          "paymentNotMadeUilCreditedSupplier",
                          round2(parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-28 px-2 py-1 text-right rounded font-mono border border-slate-200 bg-white"
                    />
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400">—</td>
                </tr>

                {/* 7. LESS: Invoice Credited by UIL but not Issue by Supplier */}
                <tr className="bg-slate-50/40">
                  <td className="py-2 px-4 border-r border-slate-200">
                    <span className="font-bold text-rose-700 block">LESS:</span>
                    <span className="font-normal text-slate-800 block">
                      Invoice Credited by UIL but not Issue by Supplier
                    </span>
                    <input
                      type="text"
                      placeholder="Particulars note (optional)..."
                      value={data.rowNotes?.invoiceCreditedUilNotSupplier || ""}
                      onChange={(e) => handleRowNoteChange("invoiceCreditedUilNotSupplier", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      value={round2(data.invoiceCreditedUilNotSupplier)}
                      onChange={(e) =>
                        handleFieldChange(
                          "invoiceCreditedUilNotSupplier",
                          round2(parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-28 px-2 py-1 text-right rounded font-mono border border-slate-200 bg-white"
                    />
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400">—</td>
                </tr>

                {/* 8. ADD: Difference in Opening Balance */}
                <tr>
                  <td className="py-2 px-4 border-r border-slate-200" colSpan={4}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-700">ADD:</span> Difference in Opening
                        Balance As On {data.openingDate}
                      </div>
                      <input
                        type="text"
                        placeholder="Opening balance note (optional)..."
                        value={data.rowNotes?.openingBalDiff || ""}
                        onChange={(e) => handleRowNoteChange("openingBalDiff", e.target.value)}
                        className="w-full sm:w-64 text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                      />
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50/30 text-slate-600">
                  <td className="py-1.5 px-6 border-r border-slate-200 text-xs">
                    As Per UIL As On {data.openingDate}
                  </td>
                  <td className="py-1.5 px-4 text-right font-mono border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={round2(Math.abs(data.openingBalUil))}
                      onChange={(e) =>
                        handleFieldChange("openingBalUil", round2(Math.abs(parseFloat(e.target.value) || 0)))
                      }
                      className="w-24 px-1.5 py-0.5 text-right rounded font-mono border border-slate-300 bg-white"
                    />
                  </td>
                  <td className="py-1.5 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-1.5 px-4 text-center text-slate-400">—</td>
                </tr>
                <tr className="bg-slate-50/30 text-slate-600">
                  <td className="py-1.5 px-6 border-r border-slate-200 text-xs">
                    As Per Supplier As On {data.openingDate}
                  </td>
                  <td className="py-1.5 px-4 text-right font-mono border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={round2(Math.abs(data.openingBalSupplier))}
                      onChange={(e) =>
                        handleFieldChange("openingBalSupplier", round2(Math.abs(parseFloat(e.target.value) || 0)))
                      }
                      className="w-24 px-1.5 py-0.5 text-right rounded font-mono border border-slate-300 bg-white"
                    />
                  </td>
                  <td className="py-1.5 px-4 text-right font-mono font-bold text-rose-700 border-r border-slate-200 bg-rose-50/60">
                    <span title="Difference in Opening Balance">
                      {round2(Math.abs(data.openingBalDiff)).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                    —
                  </td>
                </tr>

                {/* 9. Rounding off difference */}
                <tr>
                  <td className="py-2 px-4 border-r border-slate-200 text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <span>Rounding off difference</span>
                        <input
                          type="text"
                          placeholder="Rounding note (optional)..."
                          value={data.rowNotes?.roundingOffDiff || ""}
                          onChange={(e) => handleRowNoteChange("roundingOffDiff", e.target.value)}
                          className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-slate-200 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                        />
                      </div>
                      {data.autoRoundOffApplied && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                          Auto Round-Off (&lt; ₹10)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200 text-slate-400">
                    —
                  </td>
                  <td className="py-2 px-4 text-right font-mono border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      value={round2(data.roundingOffDiff)}
                      onChange={(e) =>
                        handleFieldChange("roundingOffDiff", round2(parseFloat(e.target.value) || 0))
                      }
                      className="w-28 px-2 py-1 text-right rounded font-mono border border-slate-200 bg-white"
                    />
                  </td>
                  <td className="py-2 px-4 text-center text-slate-400">—</td>
                </tr>

                {/* 10. Subtotal: Calculated Reconciled Balance */}
                <tr className="bg-amber-100/70 border-t-2 border-b-2 border-amber-300 font-bold text-slate-900">
                  <td className="py-3 px-4 border-r border-amber-300 text-slate-800">
                    Calculated Reconciled Balance (Subtotal)
                  </td>
                  <td className="py-3 px-4 text-right font-mono border-r border-amber-300 font-bold">
                    {Math.round(data.calculatedReconciledBalance).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm border-r border-amber-300 text-indigo-950">
                    {data.calculatedReconciledBalance.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                    Subtotal
                  </td>
                </tr>

                {/* 11. Closing Balance as per Supplier */}
                <tr className="bg-emerald-50/80 border-b-2 border-emerald-300 font-bold text-slate-900">
                  <td className="py-3 px-4 border-r border-emerald-300 text-slate-800">
                    <span>Closing Balance as per Supplier {data.statementDate}</span>
                    <input
                      type="text"
                      placeholder="Supplier balance note (optional)..."
                      value={data.rowNotes?.closingBalSupplier || ""}
                      onChange={(e) => handleRowNoteChange("closingBalSupplier", e.target.value)}
                      className="mt-1 w-full text-[11px] font-normal px-2 py-0.5 rounded border border-emerald-300 bg-white/80 focus:bg-white focus:border-indigo-400 text-slate-700 placeholder:text-slate-300 transition-colors"
                    />
                  </td>
                  <td className="py-3 px-4 text-right font-mono border-r border-emerald-300 font-bold">
                    {Math.round(data.closingBalSupplier).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm border-r border-emerald-300 text-emerald-950">
                    <input
                      type="number"
                      step="0.01"
                      value={round2(data.closingBalSupplier)}
                      onChange={(e) =>
                        handleFieldChange("closingBalSupplier", round2(parseFloat(e.target.value) || 0))
                      }
                      className="w-32 px-2 py-1 text-right rounded font-mono font-bold border border-emerald-400 bg-white"
                    />
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-900">
                    {data.closingBalSupplierDc}
                  </td>
                </tr>

                {/* 12. Net Difference */}
                <tr className="bg-yellow-300 border-t-2 border-b-2 border-yellow-500 font-bold text-slate-950">
                  <td className="py-3.5 px-4 border-r border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-extrabold uppercase tracking-wide">
                          Net Difference
                        </span>
                      </div>
                      {Math.abs(data.netDifference) > 0.001 && Math.abs(data.netDifference) < 10 && (
                        <button
                          onClick={() => {
                            const newRounding = round2((data.roundingOffDiff || 0) + data.netDifference);
                            handleFieldChange("roundingOffDiff", newRounding);
                          }}
                          className="px-2 py-1 rounded bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                          title="Difference is under ₹10. Click to absorb into Rounding Off Difference (E36)"
                        >
                          Auto Round Off (&lt; ₹10)
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono border-r border-yellow-500 text-slate-800">
                    —
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-base border-r border-yellow-500 text-slate-950">
                    {round2(data.netDifference).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-xs">
                    {isBalanced ? (
                      <span className="text-emerald-900 font-black">₹0.00 ✓</span>
                    ) : (
                      <span className="text-rose-900 font-black">VAR</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Status Banner */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isBalanced ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="font-semibold text-slate-700">
                Status:{" "}
                {isBalanced
                  ? "The main reconciliation model balances out to ₹0.00."
                  : `Unadjusted variance of ₹${Math.abs(data.netDifference).toFixed(2)} exists between ledgers.`}
              </span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Utkarsh India Limited Statutory Statement Engine
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Secondary Working Schedule (Columns H-I) */}
      {activeView === "secondary" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Secondary Reconciliation Table (Columns H–I)
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Itemized Working Schedule
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Reconciling internal book balances directly to the vendor's closing statement
              </p>
            </div>
            <div className="font-mono text-xs font-bold text-slate-700">
              Formula: =SUM(I14:I21) & Variance = I23 - I22
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                  <th className="py-2.5 px-4 font-sans">Line Item / Working Particulars</th>
                  <th className="py-2.5 px-4 text-center w-28">Sign</th>
                  <th className="py-2.5 px-4 text-right w-48">Amount (₹)</th>
                  <th className="py-2.5 px-4 text-left font-sans w-64">Excel Cell & Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                    Book Balance (UIL)
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-500 font-bold">+</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                    {secondary.bookBalance.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I14 (Starting UIL Closing Book Balance)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">+ Unbooked Invoice</td>
                  <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">+</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700">
                    {secondary.unbookedInvoice.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I15 (Invoices issued by vendor, not in UIL books)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">+ Uncredited TDS</td>
                  <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">+</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700">
                    {secondary.uncreditedTds.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I16 (TDS debited by UIL but not in vendor ledger)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">
                    - TDS Credited by Supplier
                  </td>
                  <td className="py-2.5 px-4 text-center text-rose-600 font-bold">-</td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {secondary.tdsCreditedSupplier.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I17 (Direct negative value for =SUM() direct calculation)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">+ Unupdated Payment</td>
                  <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">+</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700">
                    {secondary.unupdatedPayment.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I18 (Payments made by UIL in transit / uncredited)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">- Unmade Payment</td>
                  <td className="py-2.5 px-4 text-center text-rose-600 font-bold">-</td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {secondary.unmadePayment.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I19 (Direct negative value for wrongful receipt credit)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">- Wrong Invoice Booked</td>
                  <td className="py-2.5 px-4 text-center text-rose-600 font-bold">-</td>
                  <td className="py-2.5 px-4 text-right text-rose-700">
                    {secondary.wrongInvoiceBooked.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I20 (Direct negative value for erroneous UIL booking)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-sans text-slate-800">
                    + Opening Balance Diff (D34 - D33)
                  </td>
                  <td className="py-2.5 px-4 text-center text-indigo-600 font-bold">+</td>
                  <td className="py-2.5 px-4 text-right font-bold text-indigo-700">
                    {secondary.openingBalanceDiff.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I21 (Negative offset handling adds OB gap back)
                  </td>
                </tr>

                {/* Sum of Adjusted Items */}
                <tr className="bg-indigo-50/70 border-t-2 border-b-2 border-indigo-200 font-bold text-indigo-950">
                  <td className="py-3 px-4 font-sans text-sm font-bold">
                    Adjusted Total (Sum of Adjusted Items)
                  </td>
                  <td className="py-3 px-4 text-center font-bold">=</td>
                  <td className="py-3 px-4 text-right font-black text-sm">
                    {secondary.adjustedTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-sans text-indigo-800 text-[11px]">
                    Cell I22 = SUM(I14:I21)
                  </td>
                </tr>

                {/* Vendor Closing Balance */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2.5 px-4 font-sans">Vendor Closing Balance</td>
                  <td className="py-2.5 px-4 text-center text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                    {secondary.vendorClosingBalance.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    Cell I23 (Vendor statement closing position)
                  </td>
                </tr>

                {/* Variance / Difference */}
                <tr
                  className={`font-bold border-t-2 ${
                    Math.abs(secondary.variance) < 0.01
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : "bg-amber-50 text-amber-950 border-amber-300"
                  }`}
                >
                  <td className="py-3 px-4 font-sans text-sm font-extrabold">
                    Variance / Difference (I23 - I22)
                  </td>
                  <td className="py-3 px-4 text-center">—</td>
                  <td className="py-3 px-4 text-right font-black text-sm">
                    {secondary.variance.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-sans text-[11px]">
                    Cell I24 = I23 - I22 (
                    {Math.abs(secondary.variance) < 0.01
                      ? "Reconciliation in balance"
                      : "Unadjusted working schedule variance"}
                    )
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Mathematical Logic & Formula Proof */}
      {activeView === "formula" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-6 text-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-600" />
              Mathematical Formula Structure & Proof
            </h3>
            <p className="text-xs text-slate-500">
              The exact arithmetic rules defined in the Utkarsh India Limited audit standard
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
            <div className="text-sky-400 font-bold mb-1">
              // Cell E40 Master Net Difference Formula:
            </div>
            <div>
              Net Difference = (E9 + E15 + E18 + E14 - E20 + E23 - E27 - E30 + E34 - E36) - E38
            </div>
            <div className="text-slate-400 mt-2">
              where Subtotal = E9 (UIL Closing) + E14 (Unbooked Invoices) + E18 (Uncredited TDS) -
              E20 (Supplier TDS) + E23 (In-transit Payments) - E27 (Unmade Payments) - E30 (Wrong
              Invoices) + E34 (Opening Diff) - E36 (Roundoff)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                Dynamic Balance Classification (Cell F9)
              </h4>
              <p className="text-slate-600 leading-normal">
                Uses <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">=IF(D9&gt;0,"Cr","Dr")</code> to
                dynamically determine whether the closing book balance is a Credit or Debit balance
                relative to vendor account liabilities.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                Negative Offset Handling (Cell E34)
              </h4>
              <p className="text-slate-600 leading-normal">
                Computes <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">=D34-D33</code>. Since UIL's
                opening balance discrepancy is negative liability (-₹181.87), subtracting a negative
                number yields <span className="font-bold text-emerald-700">+181.87</span>, correctly
                adding the opening balance gap back to the reconciliation total.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Modal Drawer */}
      {selectedDrilldown && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-xs font-bold text-slate-900">{selectedDrilldown.title}</h4>
              <button
                onClick={() => setSelectedDrilldown(null)}
                className="text-slate-400 hover:text-slate-700 p-1 text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
              {selectedDrilldown.items.map((it, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-800">{it.ref}</span>
                    {it.date && (
                      <span className="text-slate-400 ml-2">({formatDateShort(it.date)})</span>
                    )}
                    <span className="block text-[11px] font-sans text-slate-500">{it.desc}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-right">
                    ₹{it.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedDrilldown(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Statutory Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Print Statutory Reconciliation Statement</h3>
                  <p className="text-[11px] text-slate-400">
                    Utkarsh India Limited • Statutory Audit Format
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDirectBrowserPrint}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print (Ctrl+P)
                </button>
                <button
                  onClick={handleOpenPrintWindow}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Open isolated printable tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Window
                </button>
                <button
                  onClick={handleDownloadPrintableHtml}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Download standalone HTML document"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save HTML
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Preview Canvas */}
            <div
              id="printable-statement-container"
              className="p-8 max-h-[75vh] overflow-y-auto bg-white text-slate-900 printable-statement-area"
            >
              <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    UTKARSH INDIA LIMITED
                  </h1>
                  <p className="text-xs font-semibold text-slate-600">
                    Creditor Reconciliation & Closing Balance Conclusion Statement
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    STATUTORY AUDIT FORMAT
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Statement Date: {data.statementDate}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-5">
                <div>
                  <span className="text-slate-500 font-semibold">Vendor Code (SAP): </span>
                  <span className="font-mono font-bold text-slate-900">{data.vendorCode || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Vendor / Party Name: </span>
                  <span className="font-bold text-slate-900">{data.vendorName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Closing Period: </span>
                  <span className="font-medium text-slate-900">As on {data.statementDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Opening Balance Date: </span>
                  <span className="font-medium text-slate-900">As on {data.openingDate}</span>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <th className="p-2 border-r border-slate-300">Line Item / Particulars</th>
                    <th className="p-2 text-right border-r border-slate-300 w-28">Ref Amount (₹)</th>
                    <th className="p-2 text-right border-r border-slate-300 w-36">Audited Amount (₹)</th>
                    <th className="p-2 text-center w-16">Dr/Cr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="font-bold bg-amber-50/40">
                    <td className="p-2 border-r border-slate-300">
                      Closing Balance as per UIL ({data.statementDate})
                      {data.rowNotes?.closingBalUil && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.closingBalUil}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {Math.round(data.closingBalUil).toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 font-bold">
                      {data.closingBalUil.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 font-bold">
                      {data.closingBalUilDc}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300">
                      <strong>ADD:</strong> Invoice booking pending at UIL Account
                      {data.rowNotes?.invoicePendingUil && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.invoicePendingUil}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.invoicePendingUil > 0 ? data.invoicePendingUil.toFixed(2) : "0.00"}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr className="bg-amber-50/20">
                    <td className="p-2 border-r border-slate-300">
                      <strong>ADD:</strong> TDS Debited by UIL but not Credited by Supplier
                      {data.tdsParticulars && (
                        <div className="text-[11px] text-slate-500 font-mono">{data.tdsParticulars}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.tdsDebitedUilNotSupplier > 0 ? data.tdsDebitedUilNotSupplier.toFixed(2) : "—"}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 font-bold">
                      {data.tdsDebitedUilNotSupplier.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300">
                      <strong>LESS:</strong> TDS Credited By Supplier But Not Debited By UIL
                      {data.rowNotes?.tdsCreditedSupplierNotUil && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.tdsCreditedSupplierNotUil}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.tdsCreditedSupplierNotUil.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300">
                      <strong>ADD:</strong> Payment made by UIL but not Credited by Supplier
                      {data.rowNotes?.paymentMadeUilNotSupplier && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.paymentMadeUilNotSupplier}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.paymentMadeUilNotSupplier.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300">
                      <strong>LESS:</strong> Payment not made by UIL but Credited by Supplier
                      {data.rowNotes?.paymentNotMadeUilCreditedSupplier && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.paymentNotMadeUilCreditedSupplier}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.paymentNotMadeUilCreditedSupplier.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300">
                      <strong>LESS:</strong> Invoice Credited by UIL but not Issued by Supplier
                      {data.rowNotes?.invoiceCreditedUilNotSupplier && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.invoiceCreditedUilNotSupplier}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.invoiceCreditedUilNotSupplier.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={4} className="p-2 border-r border-slate-300">
                      ADD: Difference in Opening Balance As On {data.openingDate}
                      {data.rowNotes?.openingBalDiff && (
                        <span className="ml-2 font-normal text-slate-500 text-xs">({data.rowNotes.openingBalDiff})</span>
                      )}
                    </td>
                  </tr>
                  <tr className="text-slate-600 text-[11px]">
                    <td className="p-1.5 pl-6 border-r border-slate-300">
                      As Per UIL As On {data.openingDate}
                    </td>
                    <td className="p-1.5 text-right font-mono border-r border-slate-300">
                      {Math.abs(data.openingBalUil).toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-1.5 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr className="text-slate-600 text-[11px]">
                    <td className="p-1.5 pl-6 border-r border-slate-300">
                      As Per Supplier As On {data.openingDate}
                    </td>
                    <td className="p-1.5 text-right font-mono border-r border-slate-300">
                      {Math.abs(data.openingBalSupplier).toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right font-mono font-bold text-rose-700 border-r border-slate-300">
                      {Math.abs(data.openingBalDiff).toFixed(2)}
                    </td>
                    <td className="p-1.5 text-center border-slate-300 text-slate-400 font-mono text-[10px]">—</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300">
                      Rounding off difference
                      {data.rowNotes?.roundingOffDiff && (
                        <div className="text-[11px] font-normal text-slate-500">{data.rowNotes.roundingOffDiff}</div>
                      )}
                      {data.autoRoundOffApplied && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Auto Round-Off (&lt; ₹10)
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-400">—</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">
                      {data.roundingOffDiff.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-slate-300 text-slate-400">—</td>
                  </tr>
                  <tr className="bg-amber-100/90 font-bold border-t-2 border-b-2 border-amber-300 text-slate-900">
                    <td className="p-2.5 border-r border-slate-300">
                      Calculated Reconciled Balance (Subtotal)
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">
                      {Math.round(data.calculatedReconciledBalance).toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-right font-mono text-sm font-bold border-r border-slate-300">
                      {data.calculatedReconciledBalance.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center border-slate-300 font-bold">Subtotal</td>
                  </tr>
                  <tr className="bg-emerald-50/90 font-bold border-b-2 border-emerald-300 text-slate-900">
                    <td className="p-2.5 border-r border-slate-300">
                      Closing Balance as per Supplier ({data.statementDate})
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">
                      {Math.round(data.closingBalSupplier).toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-right font-mono text-sm font-bold border-r border-slate-300">
                      {data.closingBalSupplier.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center border-slate-300 font-bold text-emerald-900">
                      {data.closingBalSupplierDc}
                    </td>
                  </tr>
                  <tr className="bg-yellow-300 font-bold border-2 border-yellow-500 text-slate-950">
                    <td className="p-3 border-r border-yellow-500 uppercase tracking-wide">
                      Net Difference (Cell E40)
                    </td>
                    <td className="p-3 text-right font-mono border-r border-yellow-500 text-slate-600">—</td>
                    <td className="p-3 text-right font-mono text-base font-black border-r border-yellow-500">
                      {data.netDifference.toFixed(2)}
                    </td>
                    <td className="p-3 text-center border-yellow-500 font-bold text-xs">
                      {isBalanced ? "✓ ₹0.00" : "VARIANCE"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-8 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="w-32 text-center border-t border-dashed border-slate-400 pt-1">
                  Prepared By
                  <div className="font-bold text-slate-800">Accounts Executive</div>
                </div>
                <div className="w-32 text-center border-t border-dashed border-slate-400 pt-1">
                  Verified By
                  <div className="font-bold text-slate-800">Finance Manager</div>
                </div>
                <div className="w-40 text-center border-t border-dashed border-slate-400 pt-1">
                  Authorized Signatory
                  <div className="font-bold text-slate-800">Utkarsh India Limited</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={handleDirectBrowserPrint}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
