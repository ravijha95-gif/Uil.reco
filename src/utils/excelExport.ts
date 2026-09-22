import * as XLSX from "xlsx";
import { BalanceSummary, BuyerRow, ManualException, ReconcileItem, VendorRow } from "../types";
import { formatDateFull, formatCurrency, toDate } from "./dateAndNumber";

function autoWidth(ws: XLSX.WorkSheet, aoa: (string | number)[][]) {
  const cols: { wch: number }[] = [];
  for (const row of aoa) {
    row.forEach((v, i) => {
      const len = String(v ?? "").length;
      const current = cols[i]?.wch || 10;
      cols[i] = { wch: Math.max(current, Math.min(50, len + 3)) };
    });
  }
  ws["!cols"] = cols;
}

export function downloadWorkbook(sheets: [string, (string | number)[][]][], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    autoWidth(ws, aoa);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel 31 char sheet limit
  }
  XLSX.writeFile(wb, filename);
}

export function exportReconciliationFull(
  items: ReconcileItem[],
  vendorRows: VendorRow[],
  buyerRows: BuyerRow[],
  balance: BalanceSummary,
  manualExceptions: ManualException[] = [],
  period: string = "Current Period"
) {
  const active = items.filter((x) => !x.internal);
  const matched = active.filter((x) => x.status.startsWith("Matched")).length;
  const partial = active.filter((x) => x.status.startsWith("Partial")).length;
  const unmatched = active.filter((x) => /Only|Exception/.test(x.status)).length;

  // 1. Summary Sheet
  const summaryAOA: (string | number)[][] = [
    ["VENDOR LEDGER RECONCILIATION STATEMENT"],
    ["Generated via Vendor Reconciliation Engine"],
    [],
    ["Reconciliation Period", period],
    ["Total Records Reconciled", active.length],
    ["Matched Items", matched],
    ["Partial / Discrepancies", partial],
    ["Unmatched Items", unmatched],
    [],
    ["A. BALANCE RECONCILIATION SUMMARY"],
    ["Metric", "Vendor (Tally)", "Buyer (SAP)", "Net Variance"],
    [
      "Opening Balance",
      balance.vendorOpen ? `${balance.vendorOpen.side} ${balance.vendorOpen.amount.toFixed(2)}` : "—",
      balance.buyerOpen ? `${balance.buyerOpen.side} ${balance.buyerOpen.amount.toFixed(2)}` : "—",
      (
        (balance.vendorOpen ? (balance.vendorOpen.side === "Dr" ? 1 : -1) * balance.vendorOpen.amount : 0) +
        (balance.buyerOpen ? (balance.buyerOpen.side === "Cr" ? -1 : 1) * balance.buyerOpen.amount : 0)
      ).toFixed(2),
    ],
    [
      "Net Movement (Signed)",
      balance.vendorMovement.toFixed(2),
      balance.buyerMovement.toFixed(2),
      balance.netMovementDiff.toFixed(2),
    ],
    [
      "Closing Balance",
      balance.vendorClose ? `${balance.vendorClose.side} ${balance.vendorClose.amount.toFixed(2)}` : "—",
      balance.buyerClose ? `${balance.buyerClose.side} ${balance.buyerClose.amount.toFixed(2)}` : "—",
      balance.closingDiff.toFixed(2),
    ],
    [],
    ["B. SIGN CONVENTION NOTE"],
    [
      "Vendor Invoices: Dr (+) | Vendor Receipts: Cr (-)",
      "SAP Invoices: Cr (-) | SAP Payments: Dr (+)",
      "A fully reconciled statement yields Net ₹0.00 variance.",
    ],
  ];

  // 2. Reconcile Sheet
  const reconAOA: (string | number)[][] = [
    [
      "Status",
      "Classification",
      "Vendor Date",
      "Vendor Ref",
      "Vendor Amount (₹)",
      "SAP Doc Date",
      "SAP Doc No",
      "SAP Ref",
      "SAP Amount (₹)",
      "TDS Amount (₹)",
      "Variance / Diff (₹)",
      "Days Gap",
      "Matching Basis & Logic",
    ],
  ];

  for (const item of items) {
    reconAOA.push([
      item.status,
      item.a?.type || item.b?.type || "—",
      item.a?.date ? formatDateFull(item.a.date) : "—",
      item.a?.ref || "—",
      item.a ? item.a.amount : "",
      item.b?.date ? formatDateFull(item.b.date) : "—",
      item.b?.docNo || "—",
      item.b?.ref || "—",
      item.b ? item.b.amount : "",
      item.tds || 0,
      item.diff ? Math.abs(item.diff) : 0,
      item.days != null ? item.days : "—",
      item.basis,
    ]);
  }

  // 3. Parsed Vendor Sheet
  const vendorAOA: (string | number)[][] = [
    ["Date", "Dr/Cr", "Particulars / Narration", "Voucher Type", "Voucher No", "Amount (₹)", "Classification"],
  ];
  for (const v of vendorRows) {
    vendorAOA.push([
      v.date ? formatDateFull(v.date) : "—",
      v.dc,
      v.particulars,
      v.vchType,
      v.ref,
      v.amount,
      v.type,
    ]);
  }

  // 4. Parsed SAP Sheet
  const sapAOA: (string | number)[][] = [
    [
      "Document No",
      "Document Date",
      "Posting Date",
      "Reference",
      "Doc Type",
      "Dr/Cr",
      "Amount (₹)",
      "TDS Amount (₹)",
      "Classification",
      "Item Text",
    ],
  ];
  for (const b of buyerRows) {
    sapAOA.push([
      b.docNo,
      b.date ? formatDateFull(b.date) : "—",
      b.postingDate ? formatDateFull(b.postingDate) : "—",
      b.ref,
      b.docType,
      b.ind,
      b.amount,
      b.tds,
      b.type,
      b.desc,
    ]);
  }

  // 5. Manual Exceptions Sheet
  const manualAOA: (string | number)[][] = [
    ["Type", "Vendor Ref", "Vendor Amount (₹)", "Buyer Ref", "Buyer Amount (₹)", "Reason / Audit Note", "Logged Date"],
  ];
  for (const m of manualExceptions) {
    manualAOA.push([m.type, m.vRef, m.vAmt, m.yRef, m.yAmt, m.note, m.createdAt]);
  }

  downloadWorkbook(
    [
      ["Summary", summaryAOA],
      ["Reconciliation", reconAOA],
      ["Parsed Vendor Ledger", vendorAOA],
      ["Parsed SAP Ledger", sapAOA],
      ["Manual Exceptions", manualAOA],
    ],
    `Vendor_Reconciliation_Full_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function downloadVendorTemplate() {
  const aoa: (string | number)[][] = [
    ["Date", "Dr/Cr", "Particulars", "Vch Type", "Vch No", "Amount"],
    ["01-Apr-2024", "Dr", "Opening Balance", "Opening Balance", "OP-01", 50000.0],
    ["25-May-2024", "Dr", "GST SALES(1)-PRINCIPAL PLACE", "GST SALES", "INV/24-25/101", 15104.0],
    ["04-Jul-2024", "Cr", "HDFC BANK LTD - RTGS", "Receipt", "REC/412", 15091.0],
    ["18-Jul-2024", "Dr", "GST SALES(1)-SPARES", "GST SALES", "INV/24-25/185", 4154.0],
    ["30-Sep-2024", "Cr", "HDFC BANK LTD - RTGS", "Receipt", "REC/870", 14150.0],
    ["31-Mar-2025", "Dr", "Closing Balance", "Closing Balance", "CL-01", 50000.0],
    [],
    ["COLUMN INSTRUCTIONS:"],
    ["Date", "Format as DD-MMM-YYYY (e.g. 25-May-2024) or DD/MM/YYYY."],
    ["Dr/Cr", "Enter 'Dr' for Invoices and charges; enter 'Cr' for Receipts and payments."],
    ["Particulars", "Detailed narration or customer line text."],
    ["Vch Type", "Voucher type: GST SALES, Sales New, Receipt, Bank Receipt, Credit Note, Debit Note, Journal."],
    ["Vch No", "Vendor invoice or voucher reference number."],
    ["Amount", "Positive numeric figure. The tool applies Dr/Cr sign automatically."],
  ];

  downloadWorkbook([["Vendor Ledger Template", aoa]], "Vendor_Ledger_Template.xlsx");
}

export function downloadSAPTemplate() {
  const aoa: (string | number)[][] = [
    [
      "Document No",
      "Document Date",
      "Posting Date",
      "Reference",
      "Doc Type",
      "Ind.",
      "Amount",
      "TDS Sec.",
      "TDS Amt.",
      "Payment Document",
      "Item Text",
    ],
    ["5100003881", "01-Apr-2024", "01-Apr-2024", "Opening Balance", "SA", "Cr", 50000.0, "", "", "", "Opening Balance"],
    ["5100003888", "25-May-2024", "12-Jun-2024", "INV/24-25/101", "RE", "Cr", 15091.0, "194Q", 13.0, "1500003111", "STORES SPARES"],
    ["1500003111", "01-Jul-2024", "01-Jul-2024", "BILL PAYMENT", "KZ", "Dr", 15091.0, "", "", "1500003111", "RTGS PAYMENT"],
    ["5100006920", "18-Jul-2024", "24-Jul-2024", "INV/24-25/185", "RE", "Cr", 4150.0, "194Q", 4.0, "1500006926", "SPARES"],
    ["1500006926", "30-Sep-2024", "30-Sep-2024", "BILL PAYMENT", "KZ", "Dr", 14150.0, "", "", "1500006926", "RTGS PAYMENT"],
    [],
    ["SAP FBL1N COLUMN INSTRUCTIONS:"],
    ["Document No", "10-digit SAP financial document number."],
    ["Document Date", "Vendor invoice date (primary matching date). Format: DD-MMM-YYYY."],
    ["Posting Date", "Date transaction was posted in SAP General Ledger."],
    ["Reference", "Vendor invoice number entered in SAP header reference field."],
    ["Doc Type", "KR/RE = Vendor Invoice; KZ/ZP = Vendor Payment; SA/SU = Journal adjustments."],
    ["Ind.", "'Cr' for liabilities/invoices, 'Dr' for payments/advances."],
    ["Amount", "Net invoice or payment amount in INR."],
    ["TDS Sec.", "Tax deduction section code (e.g. 194Q, 194C, 194J)."],
    ["TDS Amt.", "Withholding tax deducted at source."],
  ];

  downloadWorkbook([["SAP Ledger Template", aoa]], "SAP_Ledger_Template.xlsx");
}

export function exportConclusionToExcel(
  data: import("../types").ConclusionStatementData,
  secondary: import("../types").SecondaryReconciliationSchedule
) {
  const wb = XLSX.utils.book_new();

  // Primary Utkarsh India Limited Sheet matching PDF layout
  const primaryRows: (string | number)[][] = [
    ["Reconciliation Statement Utkarsh India Limited"],
    [],
    ["VENDOR CODE", data.vendorCode],
    ["VENDOR NAME", data.vendorName],
    [],
    ["Particulars", "Amount in Rs (D)", "Amount in Rs (E)", "Dr/Cr (F)"],
    [
      `Closing Balance As Per UIL As On ${data.statementDate}`,
      Math.round(data.closingBalUil),
      Number(data.closingBalUil.toFixed(2)),
      data.closingBalUilDc,
    ],
    [],
    ["ADD:"],
    ["Invoice booking pending at UIL Account", "", Number(data.invoicePendingUil.toFixed(2)), ""],
    [],
    ["ADD:"],
    ["Tds Debited by UIL but not Credited by Supplier", data.tdsParticulars || "TDS FY 24-25", Number(data.tdsDebitedUilNotSupplier.toFixed(2)), ""],
    [],
    ["LESS:"],
    ["TDS Credited By Supplier But Not Debited By UIL", "TDS FY 24-25", Number(data.tdsCreditedSupplierNotUil.toFixed(2)), ""],
    [],
    ["ADD:"],
    ["Payment made by UIL but not Credited by Supplier", "", Number(data.paymentMadeUilNotSupplier.toFixed(2)), ""],
    [],
    ["LESS:"],
    ["Payment Not made by UIL but Credited by Supplier", "", Number(data.paymentNotMadeUilCreditedSupplier.toFixed(2)), ""],
    [],
    ["LESS:"],
    ["Invoice Credited by UIL but not Issue by Supplier", "", Number(data.invoiceCreditedUilNotSupplier.toFixed(2)), ""],
    [],
    ["ADD:"],
    [`Difference in Opening Balance As On ${data.openingDate}`],
    [`As Per UIL As On ${data.openingDate}`, Number(data.openingBalUil.toFixed(2)), ""],
    [`As Per Supplier As On ${data.openingDate}`, Number(data.openingBalSupplier.toFixed(2)), Number(data.openingBalDiff.toFixed(2))],
    [],
    ["Rounding off difference", "", Number(data.roundingOffDiff.toFixed(2)), ""],
    [],
    ["Subtotal (Calculated Reconciled Balance)", "", Number(data.calculatedReconciledBalance.toFixed(2)), ""],
    [`Closing Balance as per Supplier ${data.statementDate}`, Math.round(data.closingBalSupplier), Number(data.closingBalSupplier.toFixed(2)), data.closingBalSupplierDc],
    [],
    ["Net Difference", "", Number(data.netDifference.toFixed(2)), Math.abs(data.netDifference) < 0.01 ? "Balanced (₹0.00)" : "Variance"],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(primaryRows);
  autoWidth(ws1, primaryRows);
  XLSX.utils.book_append_sheet(wb, ws1, "UIL Reconciliation");

  // Secondary Working Schedule (Columns H-I)
  const secondaryRows: (string | number)[][] = [
    ["Secondary Reconciliation Working Schedule (Columns H-I)"],
    ["Itemized schedule reconciling internal book balances to vendor statement"],
    [],
    ["Line Item Description", "Amount (₹)"],
    ["Book Balance (UIL)", Number(secondary.bookBalance.toFixed(2))],
    ["+ Unbooked Invoice", Number(secondary.unbookedInvoice.toFixed(2))],
    ["+ Uncredited TDS", Number(secondary.uncreditedTds.toFixed(2))],
    ["- TDS Credited by Supplier", Number(secondary.tdsCreditedSupplier.toFixed(2))],
    ["+ Unupdated Payment", Number(secondary.unupdatedPayment.toFixed(2))],
    ["- Unmade Payment", Number(secondary.unmadePayment.toFixed(2))],
    ["- Wrong Invoice Booked", Number(secondary.wrongInvoiceBooked.toFixed(2))],
    ["+ Opening Balance Diff", Number(secondary.openingBalanceDiff.toFixed(2))],
    ["Adjusted Total (Sum of Adjusted Items)", Number(secondary.adjustedTotal.toFixed(2))],
    ["Vendor Closing Balance", Number(secondary.vendorClosingBalance.toFixed(2))],
    ["Variance / Difference (Vendor Closing - Adjusted)", Number(secondary.variance.toFixed(2))],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(secondaryRows);
  autoWidth(ws2, secondaryRows);
  XLSX.utils.book_append_sheet(wb, ws2, "Working Schedule (H-I)");

  XLSX.writeFile(wb, `Reconciliation_Conclusion_UIL_${data.vendorCode || "1200001029"}.xlsx`);
}
