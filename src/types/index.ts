export type LedgerSide = "Vendor" | "Buyer";

export type TransactionType =
  | "Invoice"
  | "Payment"
  | "TDS"
  | "Debit Note"
  | "Credit Note"
  | "Adjustment JV"
  | "Opening Balance"
  | "Closing Balance"
  | "Excluded"
  | "Unknown";

export type MatchStatus =
  | "Matched — Exact"
  | "Matched — TDS Adjusted"
  | "Matched — Normalized Ref"
  | "Matched — Proximity Fallback"
  | "Matched — Split / Batch"
  | "Matched — Split Payment with Hold"
  | "Matched — Multi-line Group"
  | "Matched — Manual Link"
  | "Partial — Amount Variance"
  | "Partial — Payment Difference"
  | "Vendor Only — Invoice"
  | "Vendor Only — Payment"
  | "Vendor Only — Note"
  | "Buyer Only — Invoice"
  | "Buyer Only — Payment"
  | "Buyer Only — Adjustment"
  | "Opening Balance (Vendor)"
  | "Opening Balance (Buyer)"
  | "Manual Exception"
  | "Excluded from Reconciliation";

export interface VendorRow {
  id: string | number;
  source?: "Vendor" | "Tally";
  date: Date | null;
  dc: "Dr" | "Cr";
  particulars: string;
  vchType: string;
  ref: string;
  amount: number;
  signed: number; // Dr is positive, Cr is negative for Vendor
  type: TransactionType;
  file?: string;
  _page?: number;
  _rawText?: string;
  _original?: { dc: "Dr" | "Cr"; type: TransactionType };
  _edited?: boolean;
  excluded?: boolean;
  exclusionReason?: string;
}

export interface BuyerRow {
  id: string | number;
  source?: "Buyer" | "SAP";
  docNo: string;
  date: Date | null; // Document date (used for matching)
  docDate?: Date | null;
  postingDate: Date | null;
  ref: string; // Reference (Vendor invoice number in SAP)
  docType: string; // KR, RE, KZ, ZP, SA, SU
  ind: "Dr" | "Cr";
  amount: number; // Absolute net amount
  signed: number; // Cr is negative (invoice liability), Dr is positive (payment asset/clearing)
  type: TransactionType;
  tds: number; // TDS amount booked
  tdsSec?: string; // e.g. 194Q, 194C, 194J
  paymentDoc?: string;
  desc?: string; // Item text
  file?: string;
  _page?: number;
  _rawText?: string;
  _original?: { ind: "Dr" | "Cr"; type: TransactionType };
  _edited?: boolean;
  excluded?: boolean;
  exclusionReason?: string;
}

export interface ReconcileItem {
  id: string;
  status: MatchStatus;
  a: VendorRow | null; // Vendor row(s)
  b: BuyerRow | null; // Buyer row(s)
  extraVendorRows?: VendorRow[]; // For batch/split matching
  extraBuyerRows?: BuyerRow[];
  basis: string;
  diff: number;
  score: number; // 0 to 100
  days: number | null;
  tds?: number;
  review?: boolean;
  internal?: boolean;
  manual?: boolean;
  note?: string;
  matchPass?: string;
}

export type AnomalySeverity = "high" | "medium" | "low";

export interface AnomalyItem {
  id: string;
  code:
    | "DUPLICATE_REF"
    | "TDS_RATE_MISMATCH"
    | "SIGN_INVERSION"
    | "HIGH_DATE_LAG"
    | "MINOR_ROUNDOFF"
    | "OLD_UNMATCHED"
    | "BALANCE_DISCREPANCY";
  title: string;
  description: string;
  severity: AnomalySeverity;
  side?: LedgerSide | "Both";
  targetRef?: string;
  amount?: number;
  suggestedAction?: string;
  resolved?: boolean;
}

export interface LearningRule {
  id: string;
  pattern: string;
  mode: "contains" | "regex" | "startsWith" | "exact";
  field: "type" | "dc";
  value: string;
  note?: string;
  createdAt: string;
}

export type AppTheme = "light" | "dark" | "navy";

export interface MatchSettings {
  amtTol: number; // Default 2.00
  dateTol: number; // Default 15 days
  fallbackWindow: number; // Default 60 days
  autoRoundOffLimit: number; // Default 5.00
  allowBatchMatching: boolean; // Default true
  showLearningTab?: boolean; // Default true - Toggle to show/hide Learning Rules panel
  showExclusionsTab?: boolean; // Default true - Toggle to show/hide Manual Exceptions (Exclusions) panel
  theme?: AppTheme; // Default "light"
}

export interface MovementComponentBreakup {
  vendorAmount: number;
  buyerAmount: number;
  vendorCount: number;
  buyerCount: number;
  variance: number;
  status: "Aligned" | "Variance" | "Notice";
}

export interface MovementBreakup {
  invoices: MovementComponentBreakup;
  payments: MovementComponentBreakup;
  tds: MovementComponentBreakup;
  adjustments: MovementComponentBreakup;
  excluded?: MovementComponentBreakup;
}

export interface BalanceSummary {
  vendorOpen: { side: "Dr" | "Cr"; amount: number; date?: Date | null } | null;
  buyerOpen: { side: "Dr" | "Cr"; amount: number; count?: number; date?: Date | null } | null;
  vendorClose: { side: "Dr" | "Cr"; amount: number; derived?: boolean } | null;
  buyerClose: { side: "Dr" | "Cr"; amount: number; derived?: boolean } | null;
  vendorMovement: number;
  buyerMovement: number;
  netMovementDiff: number;
  closingDiff: number;
  breakup?: MovementBreakup;
}

export interface ManualLinkPair {
  vendorId: string | number;
  vendorIds?: (string | number)[];
  buyerId: string | number;
  buyerIds?: (string | number)[];
  note?: string;
}

export interface ManualException {
  id: string;
  type: TransactionType;
  vRef: string;
  vAmt: number;
  yRef: string;
  yAmt: number;
  note: string;
  createdAt: string;
}

export interface ConclusionStatementData {
  vendorCode: string;
  vendorName: string;
  statementDate: string; // e.g. "31.03.2025"
  openingDate: string; // e.g. "01.04.2024"

  // Primary Table (Columns D, E, F)
  closingBalUil: number; // Cell E9 (= D9)
  closingBalUilDc: "Dr" | "Cr"; // Cell F9 (= IF(D9>0,"Cr","Dr"))

  invoicePendingUil: number; // Cell E14 (= D14 + D15)
  invoicePendingItems?: { ref: string; date?: Date | null; amount: number; desc?: string }[];

  tdsDebitedUilNotSupplier: number; // Cell E18 (= D18)
  tdsParticulars?: string; // "TDS DEDUCTED ON BOTH ADVANCE & INVOICE / TDS FY 24-25"
  tdsDebitedUilItems?: { ref: string; amount: number; desc?: string }[];

  tdsCreditedSupplierNotUil: number; // Cell E20 (= D20)

  paymentMadeUilNotSupplier: number; // Cell E23 (= D23)
  paymentMadeUilItems?: { ref: string; date?: Date | null; amount: number; desc?: string }[];

  paymentNotMadeUilCreditedSupplier: number; // Cell E27 (= D26 + D27)
  paymentNotMadeUilItems?: { ref: string; date?: Date | null; amount: number; desc?: string }[];

  invoiceCreditedUilNotSupplier: number; // Cell E30 (= SUM(D29:D30))
  invoiceCreditedUilItems?: { ref: string; date?: Date | null; amount: number; desc?: string }[];

  openingBalUil: number; // Cell D33
  openingBalSupplier: number; // Cell D34
  openingBalDiff: number; // Cell E34 (= D34 - D33)

  roundingOffDiff: number; // Cell E36

  calculatedReconciledBalance: number; // Subtotal = E9 + E14 + E18 - E20 + E23 - E27 - E30 + E34 - E36

  closingBalSupplier: number; // Cell E38 (= D38)
  closingBalSupplierDc: "Dr" | "Cr";

  netDifference: number; // Cell E40 = Subtotal - E38
  autoRoundOffApplied?: boolean;
  isVendorFromSap?: boolean;
  rowNotes?: Record<string, string>;
}

export interface SecondaryReconciliationSchedule {
  bookBalance: number; // 876,491.33
  unbookedInvoice: number; // + 10,248.00
  uncreditedTds: number; // + 2,019.00
  tdsCreditedSupplier: number; // - 792.00
  unupdatedPayment: number; // + 103,491.00
  unmadePayment: number; // - 73,800.00
  wrongInvoiceBooked: number; // - 76,155.00
  openingBalanceDiff: number; // + 50,823.19
  adjustedTotal: number; // Cell I22 = SUM(I14:I21)
  vendorClosingBalance: number; // Cell I23 = 892,136.52
  variance: number; // Cell I24 = I23 - I22 = -189.00
}
