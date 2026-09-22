import {
  BuyerRow,
  ConclusionStatementData,
  ReconcileItem,
  SecondaryReconciliationSchedule,
  VendorRow,
} from "../types";
import { ReconcileResult } from "./reconciliationEngine";
import { cleanText, formatDateShort, toIsoDateString } from "./dateAndNumber";

export interface ConclusionDrilldown {
  unbookedInvoices: { ref: string; date?: Date | null; amount: number; desc?: string }[];
  uncreditedTds: { ref: string; date?: Date | null; amount: number; desc?: string }[];
  supplierTds: { ref: string; date?: Date | null; amount: number; desc?: string }[];
  uncreditedPayments: { ref: string; date?: Date | null; amount: number; desc?: string }[];
  unmadePayments: { ref: string; date?: Date | null; amount: number; desc?: string }[];
  wrongInvoices: { ref: string; date?: Date | null; amount: number; desc?: string }[];
}

/**
 * Standard rounding to 2 decimal places to avoid floating-point representation anomalies
 * and prevent infinite fractions in input cells.
 */
export function round2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Robust extractor for Vendor Code & Vendor Name from the SAP Ledger.
 * Pulls from storedTotals or scans SAP buyer rows/headers.
 */
export function extractVendorInfoFromSap(
  buyerRows: BuyerRow[],
  storedTotals: any,
  vendorRows: VendorRow[] = []
): { vendorCode: string; vendorName: string; isFromSap: boolean } {
  let code = storedTotals?.vendorCode ? cleanText(storedTotals.vendorCode) : "";
  let name = storedTotals?.vendorName ? cleanText(storedTotals.vendorName) : "";

  // 1. If code or name missing, scan buyer rows for header annotations or raw text
  if (!code || !name) {
    for (const b of buyerRows) {
      const text = `${b.desc || ""} ${b._rawText || ""} ${b.ref || ""}`.trim();
      if (!text) continue;

      if (!code) {
        const mc = text.match(/(?:Vendor|Account|Creditor)?[:\s#]*(\b1\d{9}\b|\b1200\d{6}\b|\b\d{6,14}\b)/i);
        if (mc) code = mc[1];
      }
      if (!name) {
        const mn = text.match(/(?:Vendor|Name|Account|Party)[:\s]+([A-Za-z0-9\s.,&-]{3,})/i);
        if (mn && !/^(RE|KR|KZ|Doc|Page|Line|Invoice|Payment|Bill|Advance|Opening|Closing)/i.test(mn[1])) {
          name = cleanText(mn[1]);
        }
      }
      if (code && name) break;
    }
  }

  // 2. If name is still missing, scan vendor rows (e.g. from vendor statements)
  if (!name) {
    for (const v of vendorRows) {
      const text = `${v.particulars || ""} ${v._rawText || ""}`.trim();
      const mn = text.match(/(?:M\/s\s+|Party:\s*|Vendor:\s*)([A-Za-z0-9\s.,&-]{3,})/i);
      if (mn) {
        name = cleanText(mn[1]);
        break;
      }
    }
  }

  return {
    vendorCode: code,
    vendorName: name,
    isFromSap: Boolean(code && name),
  };
}

/**
 * Computes the Utkarsh India Limited Statutory Conclusion Statement (Columns D-F)
 * and the Secondary Reconciliation Schedule (Columns H-I) from active reconciliation data.
 */
export function buildConclusionData(
  reconResult: ReconcileResult,
  vendorRows: VendorRow[],
  buyerRows: BuyerRow[],
  storedTotals: any,
  overrides?: Partial<ConclusionStatementData>
): {
  data: ConclusionStatementData;
  secondary: SecondaryReconciliationSchedule;
  drilldown: ConclusionDrilldown;
} {
  const { balanceSummary, items } = reconResult;

  // Track matched row IDs to identify unmatched items
  const matchedVendorIds = new Set<string | number>();
  const matchedBuyerIds = new Set<string | number>();

  items.forEach((it) => {
    if (it.status.startsWith("Matched") || it.status.startsWith("Partial")) {
      if (it.a?.id) matchedVendorIds.add(it.a.id);
      it.extraVendorRows?.forEach((ev) => matchedVendorIds.add(ev.id));
      if (it.b?.id) matchedBuyerIds.add(it.b.id);
      it.extraBuyerRows?.forEach((eb) => matchedBuyerIds.add(eb.id));
    }
  });

  // 1. Unbooked Invoices (Vendor issued, but pending booking at UIL Account)
  const unbookedInvoices = vendorRows
    .filter(
      (v) =>
        (v.type === "Invoice" || v.type === "Debit Note") &&
        !v.excluded &&
        !matchedVendorIds.has(v.id)
    )
    .map((v) => ({
      ref: v.ref || "No Ref",
      date: v.date,
      amount: round2(v.amount),
      desc: v.particulars || "Invoice in vendor ledger not found in UIL account",
    }));

  const unbookedInvoiceAmt = round2(unbookedInvoices.reduce((s, x) => s + x.amount, 0));

  // 2. TDS Debited by UIL but not Credited by Supplier
  const tdsItems: { ref: string; date?: Date | null; amount: number; desc?: string }[] = [];

  items.forEach((it) => {
    if (it.tds && it.tds > 0) {
      tdsItems.push({
        ref: it.b?.ref || it.a?.ref || "TDS Entry",
        date: it.b?.date || it.a?.date,
        amount: round2(it.tds),
        desc: it.basis || "TDS Deducted by UIL (FY 24-25)",
      });
    }
  });

  buyerRows
    .filter((b) => b.type === "TDS" && !matchedBuyerIds.has(b.id))
    .forEach((b) => {
      tdsItems.push({
        ref: b.ref || b.docNo || "SAP TDS",
        date: b.date,
        amount: round2(b.amount),
        desc: "Direct TDS booking in SAP",
      });
    });

  const tdsDebitedAmt = round2(tdsItems.reduce((s, x) => s + x.amount, 0));

  // 3. TDS Credited by Supplier but not Debited by UIL
  const supplierTds = vendorRows
    .filter((v) => v.type === "TDS" && !matchedVendorIds.has(v.id))
    .map((v) => ({
      ref: v.ref || "TDS",
      date: v.date,
      amount: round2(v.amount),
      desc: v.particulars || "TDS claimed in vendor ledger",
    }));
  const supplierTdsAmt = round2(supplierTds.reduce((s, x) => s + x.amount, 0));

  // 4. Payments made by UIL but not Credited by Supplier (Payment in transit)
  const uncreditedPayments = buyerRows
    .filter((b) => b.type === "Payment" && !b.excluded && !matchedBuyerIds.has(b.id))
    .map((b) => ({
      ref: b.ref || b.docNo || "SAP Payment",
      date: b.date,
      amount: round2(b.amount),
      desc: `Payment Doc #${b.docNo} by UIL not reflected in Supplier ledger`,
    }));
  const uncreditedPayAmt = round2(uncreditedPayments.reduce((s, x) => s + x.amount, 0));

  // 5. Payment not made by UIL but Credited by Supplier (Wrong credit / third-party receipt)
  const unmadePayments = vendorRows
    .filter((v) => v.type === "Payment" && !v.excluded && !matchedVendorIds.has(v.id))
    .map((v) => ({
      ref: v.ref || "Receipt",
      date: v.date,
      amount: round2(v.amount),
      desc: v.particulars || "Payment credited in vendor books without matching UIL disbursement",
    }));
  const unmadePayAmt = round2(unmadePayments.reduce((s, x) => s + x.amount, 0));

  // 6. Invoices credited by UIL but not issued by Supplier (Wrongly booked invoice / credit in SAP)
  const wrongInvoices = buyerRows
    .filter((b) => b.type === "Invoice" && !b.excluded && !matchedBuyerIds.has(b.id))
    .map((b) => ({
      ref: b.ref || b.docNo || "SAP Invoice",
      date: b.date,
      amount: round2(b.amount),
      desc: `Invoice Doc #${b.docNo} booked in UIL books but not found in Supplier statement`,
    }));
  const wrongInvoiceAmt = round2(wrongInvoices.reduce((s, x) => s + x.amount, 0));

  // 7. Statement Period Dates
  const allDates = vendorRows
    .concat(buyerRows as any)
    .map((x) => x.date)
    .filter(Boolean) as Date[];

  let statementDateStr = "31.03.2025";
  let openingDateStr = "01.04.2024";

  if (allDates.length > 0) {
    const maxD = new Date(Math.max(...allDates.map((d) => d.getTime())));
    statementDateStr = formatDateShort(maxD);
    const minD = new Date(Math.min(...allDates.map((d) => d.getTime())));
    openingDateStr = formatDateShort(minD);
  }

  // 8. Closing Balances (UIL / Buyer vs Supplier / Vendor)
  const closingBalUilRaw = round2(
    balanceSummary.buyerClose?.amount ??
    Math.abs(
      (balanceSummary.buyerOpen ? (balanceSummary.buyerOpen.side === "Cr" ? -1 : 1) * balanceSummary.buyerOpen.amount : 0) +
        balanceSummary.buyerMovement
    )
  );

  const closingBalUil = round2(overrides?.closingBalUil ?? closingBalUilRaw);
  const closingBalUilDc: "Dr" | "Cr" =
    overrides?.closingBalUilDc ??
    (balanceSummary.buyerClose?.side || (closingBalUilRaw >= 0 ? "Cr" : "Dr"));

  const closingBalSupplierRaw = round2(
    balanceSummary.vendorClose?.amount ??
    Math.abs(
      (balanceSummary.vendorOpen ? (balanceSummary.vendorOpen.side === "Dr" ? 1 : -1) * balanceSummary.vendorOpen.amount : 0) +
        balanceSummary.vendorMovement
    )
  );

  const closingBalSupplier = round2(overrides?.closingBalSupplier ?? closingBalSupplierRaw);
  const closingBalSupplierDc: "Dr" | "Cr" =
    overrides?.closingBalSupplierDc ??
    (balanceSummary.vendorClose?.side || (closingBalSupplierRaw >= 0 ? "Dr" : "Cr"));

  // 9. Opening Balance Difference (As It Is, NO + or - Sign)
  // Both UIL Opening Balance and Supplier Opening Balance are represented as positive, unsigned natural numbers.
  const bOpenAmt = round2(Math.abs(balanceSummary.buyerOpen?.amount || 0));
  const vOpenAmt = round2(Math.abs(balanceSummary.vendorOpen?.amount || 0));

  const openingBalUil = round2(
    overrides?.openingBalUil !== undefined
      ? Math.abs(overrides.openingBalUil)
      : bOpenAmt
  );
  const openingBalSupplier = round2(
    overrides?.openingBalSupplier !== undefined
      ? Math.abs(overrides.openingBalSupplier)
      : vOpenAmt
  );

  // Difference in Opening Balance: strictly unsigned natural magnitude
  const openingBalDiff = round2(
    overrides?.openingBalDiff !== undefined
      ? Math.abs(overrides.openingBalDiff)
      : Math.abs(openingBalSupplier - openingBalUil)
  );

  // Line items
  const invoicePendingUil = round2(overrides?.invoicePendingUil ?? unbookedInvoiceAmt);
  const tdsDebitedUilNotSupplier = round2(overrides?.tdsDebitedUilNotSupplier ?? tdsDebitedAmt);
  const tdsCreditedSupplierNotUil = round2(overrides?.tdsCreditedSupplierNotUil ?? supplierTdsAmt);
  const paymentMadeUilNotSupplier = round2(overrides?.paymentMadeUilNotSupplier ?? uncreditedPayAmt);
  const paymentNotMadeUilCreditedSupplier = round2(overrides?.paymentNotMadeUilCreditedSupplier ?? unmadePayAmt);
  const invoiceCreditedUilNotSupplier = round2(overrides?.invoiceCreditedUilNotSupplier ?? wrongInvoiceAmt);

  // Statutory Statement Subtotal Formula:
  // Subtotal = E9 + E14 + E18 - E20 + E23 - E27 - E30 + E34 - E36
  const subtotalBeforeRounding = round2(
    closingBalUil +
    invoicePendingUil +
    tdsDebitedUilNotSupplier -
    tdsCreditedSupplierNotUil +
    paymentMadeUilNotSupplier -
    paymentNotMadeUilCreditedSupplier -
    invoiceCreditedUilNotSupplier +
    openingBalDiff
  );

  // Difference before applying rounding off:
  const rawDiffBeforeRounding = round2(subtotalBeforeRounding - closingBalSupplier);

  // "Net Difference Less than 10 Should Auto Round Off"
  let roundingOffDiff = round2(overrides?.roundingOffDiff ?? 0.0);
  let autoRoundOffApplied = false;

  if (overrides?.roundingOffDiff === undefined) {
    if (Math.abs(rawDiffBeforeRounding) > 0.001 && Math.abs(rawDiffBeforeRounding) < 10) {
      roundingOffDiff = rawDiffBeforeRounding;
      autoRoundOffApplied = true;
    }
  } else {
    // If user provided a manual rounding off, check if remaining difference is < 10 and auto round off
    const remainingDiff = round2(rawDiffBeforeRounding - roundingOffDiff);
    if (Math.abs(remainingDiff) > 0.001 && Math.abs(remainingDiff) < 10) {
      roundingOffDiff = round2(roundingOffDiff + remainingDiff);
      autoRoundOffApplied = true;
    }
  }

  const calculatedReconciledBalance = round2(subtotalBeforeRounding - roundingOffDiff);
  const netDifference = round2(calculatedReconciledBalance - closingBalSupplier);

  // Vendor Code & Vendor Name from SAP Ledger
  const sapVendor = extractVendorInfoFromSap(buyerRows, storedTotals, vendorRows);
  const vendorCode = overrides?.vendorCode !== undefined ? overrides.vendorCode : (sapVendor.vendorCode || "");
  const vendorName = overrides?.vendorName !== undefined ? overrides.vendorName : (sapVendor.vendorName || "");

  const data: ConclusionStatementData = {
    vendorCode,
    vendorName,
    isVendorFromSap: sapVendor.isFromSap,
    statementDate: overrides?.statementDate || statementDateStr,
    openingDate: overrides?.openingDate || openingDateStr,
    closingBalUil,
    closingBalUilDc,
    invoicePendingUil,
    invoicePendingItems: unbookedInvoices,
    tdsDebitedUilNotSupplier,
    tdsParticulars: overrides?.tdsParticulars !== undefined ? overrides.tdsParticulars : "",
    tdsDebitedUilItems: tdsItems,
    tdsCreditedSupplierNotUil,
    paymentMadeUilNotSupplier,
    paymentMadeUilItems: uncreditedPayments,
    paymentNotMadeUilCreditedSupplier,
    paymentNotMadeUilItems: unmadePayments,
    invoiceCreditedUilNotSupplier,
    invoiceCreditedUilItems: wrongInvoices,
    openingBalUil,
    openingBalSupplier,
    openingBalDiff,
    roundingOffDiff,
    calculatedReconciledBalance,
    closingBalSupplier,
    closingBalSupplierDc,
    netDifference,
    autoRoundOffApplied,
    rowNotes: overrides?.rowNotes || {},
  };

  // Secondary Reconciliation Schedule (Columns H-I)
  const secondary: SecondaryReconciliationSchedule = {
    bookBalance: closingBalUil,
    unbookedInvoice: invoicePendingUil,
    uncreditedTds: tdsDebitedUilNotSupplier,
    tdsCreditedSupplier: -round2(Math.abs(tdsCreditedSupplierNotUil)),
    unupdatedPayment: paymentMadeUilNotSupplier,
    unmadePayment: -round2(Math.abs(paymentNotMadeUilCreditedSupplier)),
    wrongInvoiceBooked: -round2(Math.abs(invoiceCreditedUilNotSupplier)),
    openingBalanceDiff: openingBalDiff,
    adjustedTotal: calculatedReconciledBalance,
    vendorClosingBalance: closingBalSupplier,
    variance: round2(closingBalSupplier - calculatedReconciledBalance),
  };

  const drilldown: ConclusionDrilldown = {
    unbookedInvoices,
    uncreditedTds: tdsItems,
    supplierTds,
    uncreditedPayments,
    unmadePayments,
    wrongInvoices,
  };

  return { data, secondary, drilldown };
}
