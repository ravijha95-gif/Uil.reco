import {
  AnomalyItem,
  BalanceSummary,
  BuyerRow,
  MatchSettings,
  MatchStatus,
  MovementBreakup,
  ManualLinkPair,
  ReconcileItem,
  VendorRow,
} from "../types";
import {
  dateGapDays,
  looseReference,
  normalizeReference,
  getReferenceTail,
  isMeaningfulRef,
} from "./dateAndNumber";

export interface ReconcileResult {
  items: ReconcileItem[];
  anomalies: AnomalyItem[];
  balanceSummary: BalanceSummary;
  matchedCount: number;
  partialCount: number;
  unmatchedCount: number;
  totalVendorAmount: number;
  totalBuyerAmount: number;
  reconciledRate: number;
  netDiscrepancy: number;
}

export function testRefMatch(aRef: string, bRef: string): "strict" | "normalized" | "tail" | null {
  if (!isMeaningfulRef(aRef) || !isMeaningfulRef(bRef)) return null;

  const normA = normalizeReference(aRef);
  const normB = normalizeReference(bRef);
  if (normA && normB && normA === normB) return "strict";

  const looseA = looseReference(aRef);
  const looseB = looseReference(bRef);
  if (looseA && looseB && looseA === looseB) return "normalized";

  const tailA = getReferenceTail(aRef);
  const tailB = getReferenceTail(bRef);
  if (tailA && tailB && tailA.length >= 3 && tailA === tailB) return "tail";

  return null;
}

function calculateAmountTierScore(actual: number, expected: number, tolerance: number): number {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) return 100;
  if (diff <= 10) return 90;
  if (diff <= 50) return 75;
  if (diff <= 200) return 55;
  const pct = diff / Math.max(1, Math.abs(expected));
  if (pct <= 0.01) return 60;
  if (pct <= 0.05) return 35;
  return 0;
}

function calculateDateDecayScore(days: number | null, maxWindow: number): number {
  if (days === null) return 0;
  if (days <= 2) return 30;
  if (days <= 7) return 25;
  if (days <= 15) return 20;
  if (days <= 30) return 15;
  if (days <= maxWindow) return 10;
  return 0;
}

export interface TdsMatch {
  rate: number;
  section: string;
  basis: string;
  tdsAmount: number;
  impliedGross: number;
  diff: number;
  gstRate: number;
}

/**
 * Detects whether the numerical difference between Vendor gross amount and Buyer net amount
 * accurately reflects statutory Indian TDS deductions (e.g. u/s 194J 10%, 194C 2%/1%, 194Q 0.1%, etc.)
 * either on basic invoice value (excluding standard GST rates like 18%, 12%, 5%) or on gross value.
 */
export function detectTdsDeduction(
  vendorGross: number,
  buyerNet: number,
  tolerance: number = 3.0
): TdsMatch | null {
  const gross = Math.abs(vendorGross);
  const net = Math.abs(buyerNet);
  if (gross <= 0 || net <= 0 || net >= gross) return null;

  // Potential GST rates in India (18% standard, 12%, 5%, 0%)
  const gstRates = [0.18, 0.12, 0.05, 0.28, 0.0];
  const tdsRates = [
    { rate: 0.10, section: "194J", label: "TDS @10% U/s 194J (Fees for Professional/Technical Services)" },
    { rate: 0.02, section: "194C/194J", label: "TDS @2% U/s 194C/194J (Contractor/Technical Services)" },
    { rate: 0.01, section: "194C", label: "TDS @1% U/s 194C (Individual/HUF Contractor)" },
    { rate: 0.05, section: "194H/194-I", label: "TDS @5% U/s 194H/194-I (Commission/Rent)" },
    { rate: 0.001, section: "194Q", label: "TDS @0.1% U/s 194Q (Purchase of Goods)" },
  ];

  for (const gst of gstRates) {
    const base = gst > 0 ? gross / (1 + gst) : gross;
    for (const t of tdsRates) {
      const calcTds = Math.round(base * t.rate * 100) / 100;
      const expectedNet = gross - calcTds;
      const err = Math.abs(net - expectedNet);
      if (err <= tolerance) {
        const gstLabel =
          gst > 0
            ? ` on Basic Value (excl. ${Math.round(gst * 100)}% GST)`
            : ` on Gross Value`;
        return {
          rate: t.rate,
          section: t.section,
          basis: `${t.label}${gstLabel}: TDS ₹${calcTds.toFixed(2)} (Net ₹${net.toFixed(2)})`,
          tdsAmount: calcTds,
          impliedGross: net + calcTds,
          diff: err,
          gstRate: gst,
        };
      }
    }
  }

  return null;
}

export function runReconciliation(
  vendorRows: VendorRow[],
  buyerRows: BuyerRow[],
  settings: MatchSettings,
  manualLinks: Array<ManualLinkPair> = [],
  storedTotals?: {
    vendorOpen?: { side: "Dr" | "Cr"; amount: number; date?: Date | null } | null;
    buyerOpen?: { side: "Dr" | "Cr"; amount: number; count?: number; date?: Date | null } | null;
    vendorClose?: { side: "Dr" | "Cr"; amount: number; derived?: boolean } | null;
    buyerClose?: { side: "Dr" | "Cr"; amount: number; derived?: boolean } | null;
  }
): ReconcileResult {
  const items: ReconcileItem[] = [];
  const anomalies: AnomalyItem[] = [];
  const usedBuyerIds = new Set<string | number>();
  const usedVendorIds = new Set<string | number>();

  // Filter excluded rows from standard item matching
  const excludedVendor = vendorRows.filter(
    (x) => x.excluded || x.type === "Excluded"
  );
  const excludedBuyer = buyerRows.filter(
    (x) => x.excluded || x.type === "Excluded"
  );

  // Exclude Opening/Closing balances and Excluded rows from standard matching pool
  const activeVendor = vendorRows.filter(
    (x) =>
      !x.excluded &&
      x.type !== "Excluded" &&
      x.type !== "Opening Balance" &&
      x.type !== "Closing Balance"
  );
  const activeBuyer = buyerRows.filter(
    (x) =>
      !x.excluded &&
      x.type !== "Excluded" &&
      x.type !== "Opening Balance" &&
      x.type !== "Closing Balance"
  );

  // Populate items for Excluded rows so they appear in dedicated views with full audit trail
  for (const ev of excludedVendor) {
    items.push({
      id: `excluded-v-${ev.id}`,
      status: "Excluded from Reconciliation",
      a: ev,
      b: null,
      basis: ev.exclusionReason || "Excluded from active reconciliation by user/rule",
      diff: 0,
      score: 0,
      days: null,
      internal: false,
      matchPass: "Exclusion",
    });
  }
  for (const eb of excludedBuyer) {
    items.push({
      id: `excluded-b-${eb.id}`,
      status: "Excluded from Reconciliation",
      a: null,
      b: eb,
      basis: eb.exclusionReason || "Excluded from active reconciliation by user/rule",
      diff: 0,
      score: 0,
      days: null,
      internal: false,
      matchPass: "Exclusion",
    });
  }

  // 1. Process Manual Links (Supports 1-to-1, Many-to-1, 1-to-Many, and Many-to-Many matches)
  for (const link of manualLinks) {
    // Collect all target vendor row IDs
    const targetVendorIds: (string | number)[] = [];
    if (link.vendorIds && link.vendorIds.length > 0) {
      targetVendorIds.push(...link.vendorIds);
    } else if (link.vendorId) {
      targetVendorIds.push(link.vendorId);
    }

    const vRows = activeVendor.filter((x) => targetVendorIds.includes(x.id));
    if (vRows.length === 0) continue;

    // Collect all target buyer row IDs
    const targetBuyerIds: (string | number)[] = [];
    if (link.buyerIds && link.buyerIds.length > 0) {
      targetBuyerIds.push(...link.buyerIds);
    } else if (link.buyerId) {
      targetBuyerIds.push(link.buyerId);
    }

    const bRows = activeBuyer.filter((x) => targetBuyerIds.includes(x.id));
    if (bRows.length === 0) continue;

    vRows.forEach((v) => usedVendorIds.add(v.id));
    bRows.forEach((b) => usedBuyerIds.add(b.id));

    const primaryV = vRows[0];
    const extraV = vRows.slice(1);
    const primaryB = bRows[0];
    const extraB = bRows.slice(1);

    // Compute vendor net amount (Dr minus Cr if mixed, or gross sum)
    const vDr = vRows.filter((v) => v.dc === "Dr").reduce((s, v) => s + v.amount, 0);
    const vCr = vRows.filter((v) => v.dc === "Cr").reduce((s, v) => s + v.amount, 0);
    const vAmt = (vDr > 0 && vCr > 0) ? Math.abs(vDr - vCr) : vRows.reduce((s, v) => s + v.amount, 0);

    // Compute buyer net amount (Dr minus Cr if companion hold lines, or gross sum)
    const bDr = bRows.filter((b) => b.ind === "Dr").reduce((s, b) => s + b.amount, 0);
    const bCr = bRows.filter((b) => b.ind === "Cr").reduce((s, b) => s + b.amount, 0);
    const netBAmt = (bDr > 0 && bCr > 0) ? Math.abs(bDr - bCr) : bRows.reduce((s, b) => s + b.amount, 0);
    const totalTds = bRows.reduce((s, b) => s + (b.tds || 0), 0);

    const tdsCheck = totalTds > 0 ? null : detectTdsDeduction(vAmt, netBAmt, settings.amtTol);
    const effectiveTds = totalTds > 0 ? totalTds : (tdsCheck ? tdsCheck.tdsAmount : 0);
    const diff = vAmt - (netBAmt + effectiveTds);

    let basis = link.note;
    if (!basis) {
      if (bRows.length > 1 && bDr > 0 && bCr > 0) {
        basis = `SAP Doc #${primaryB.docNo} Net Disbursement (Dr ₹${bDr.toLocaleString("en-IN", { minimumFractionDigits: 2 })} less Cr ₹${bCr.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Hold = ₹${netBAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`;
      } else if (vRows.length > 1) {
        basis = `Vendor Multi-Line Match (${vRows.length} items totaling ₹${vAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`;
      } else if (tdsCheck) {
        basis = tdsCheck.basis;
      } else {
        basis = "Manually linked by user";
      }
    }

    const isHoldSplit = bRows.length > 1 && bDr > 0 && bCr > 0;
    const isMultiVendor = vRows.length > 1;

    items.push({
      id: `manual-${primaryV.id}-${primaryB.id}`,
      status: isHoldSplit ? "Matched — Split Payment with Hold" : isMultiVendor ? "Matched — Multi-line Group" : "Matched — Manual Link",
      a: primaryV,
      extraVendorRows: extraV.length > 0 ? extraV : undefined,
      b: primaryB,
      extraBuyerRows: extraB.length > 0 ? extraB : undefined,
      basis,
      diff,
      score: 100,
      days: dateGapDays(primaryV.date, primaryB.date),
      tds: effectiveTds,
      manual: true,
      matchPass: isHoldSplit ? "Payment with Hold" : isMultiVendor ? "Multi-line Match" : "Manual",
    });
  }

  // 2. PASS 1: INVOICES WITH REFERENCE MATCHING (Exact Ref, TDS-adjusted, Normalized Ref)
  // Reconciles all invoices that have valid, matching references first so no row without
  // an invoice number can steal candidates intended for exact reference matches.
  for (const v of activeVendor) {
    if (usedVendorIds.has(v.id)) continue;
    if (v.type !== "Invoice" && v.type !== "Debit Note" && v.type !== "Credit Note") continue;
    if (!isMeaningfulRef(v.ref)) continue;

    // Find candidate buyer invoices with meaningful references
    const candidates = activeBuyer.filter(
      (b) =>
        !usedBuyerIds.has(b.id) &&
        (b.type === v.type || b.type === "Invoice" || b.type === "Unknown") &&
        isMeaningfulRef(b.ref)
    );

    let matchedCandidate: BuyerRow | null = null;
    let matchType: "strict" | "normalized" | "tail" | null = null;

    for (const b of candidates) {
      const matchKind = testRefMatch(v.ref, b.ref);
      if (matchKind) {
        matchedCandidate = b;
        matchType = matchKind;
        break;
      }
    }

    if (matchedCandidate) {
      usedVendorIds.add(v.id);
      usedBuyerIds.add(matchedCandidate.id);

      const sapGross = matchedCandidate.amount + matchedCandidate.tds;
      const diff = v.amount - sapGross;
      const days = dateGapDays(v.date, matchedCandidate.date);

      if (Math.abs(diff) <= settings.amtTol) {
        const isTds = matchedCandidate.tds > 0;
        const status: MatchStatus = isTds
          ? "Matched — TDS Adjusted"
          : matchType === "strict"
          ? "Matched — Exact"
          : "Matched — Normalized Ref";

        items.push({
          id: `match-${v.id}-${matchedCandidate.id}`,
          status,
          a: v,
          b: matchedCandidate,
          basis: isTds
            ? `Gross = Net (${matchedCandidate.amount.toFixed(2)}) + TDS (${matchedCandidate.tds.toFixed(2)})`
            : `Ref match (${matchType}): ${matchedCandidate.ref}`,
          diff: 0,
          score: matchType === "strict" ? 100 : 95,
          days,
          tds: matchedCandidate.tds,
          matchPass: "Ref Match",
        });
      } else {
        // Check if discrepancy is an unbooked or separate TDS deduction (e.g. 194J 10%, 194C 2%)
        const tdsCheck = detectTdsDeduction(v.amount, matchedCandidate.amount, settings.amtTol);
        if (tdsCheck) {
          items.push({
            id: `match-tds-${v.id}-${matchedCandidate.id}`,
            status: "Matched — TDS Adjusted",
            a: v,
            b: matchedCandidate,
            basis: `Ref match (${matchedCandidate.ref}) + ${tdsCheck.basis}`,
            diff: tdsCheck.diff,
            score: 98,
            days,
            tds: tdsCheck.tdsAmount,
            matchPass: "TDS Adjusted",
          });
        } else if (Math.abs(v.amount - matchedCandidate.amount) <= settings.amtTol) {
          items.push({
            id: `match-notds-${v.id}-${matchedCandidate.id}`,
            status: "Partial — Amount Variance",
            a: v,
            b: matchedCandidate,
            basis: `Ref match, but TDS might be missing or unbooked (Diff: ₹${diff.toFixed(2)})`,
            diff,
            score: 88,
            review: true,
            days,
            tds: matchedCandidate.tds,
            matchPass: "TDS Variance",
          });
        } else {
          items.push({
            id: `match-var-${v.id}-${matchedCandidate.id}`,
            status: "Partial — Amount Variance",
            a: v,
            b: matchedCandidate,
            basis: `Ref matched (${matchedCandidate.ref}), but Amount variance ₹${Math.abs(diff).toFixed(2)}`,
            diff,
            score: 80,
            review: true,
            days,
            tds: matchedCandidate.tds,
            matchPass: "Amount Variance",
          });
        }
      }
    }
  }

  // 3. PASS 2: INVOICE DATE & INVOICE AMOUNT MATCHING
  // Matches remaining transactions where Invoice No is NOT available on Vendor, Buyer, or both,
  // or where reference numbers did not match, but Invoice Date & Invoice Amount (or TDS deduction) match.
  for (const v of activeVendor) {
    if (usedVendorIds.has(v.id)) continue;
    if (v.type !== "Invoice" && v.type !== "Debit Note" && v.type !== "Credit Note") continue;

    // Find candidate buyer invoices
    const candidates = activeBuyer.filter(
      (b) =>
        !usedBuyerIds.has(b.id) &&
        (b.type === v.type || b.type === "Invoice" || (b.type === "Unknown" && b.ind !== "Dr"))
    );

    const fallbackScored = candidates
      .map((b) => {
        const sapGross = b.amount + b.tds;
        let aScore = calculateAmountTierScore(v.amount, sapGross, settings.amtTol);
        let tdsDetected: TdsMatch | null = null;

        // If direct gross amount does not match, test if difference matches statutory TDS (e.g. 194J 10% on basic)
        if (aScore < 90 && b.tds === 0) {
          tdsDetected = detectTdsDeduction(v.amount, b.amount, settings.amtTol);
          if (tdsDetected) {
            aScore = 95;
          }
        }

        const dg = dateGapDays(v.date, b.date);
        const dScore = calculateDateDecayScore(dg, settings.fallbackWindow);

        const vHasRef = isMeaningfulRef(v.ref);
        const bHasRef = isMeaningfulRef(b.ref);

        let rBonus = 0;
        if (vHasRef && bHasRef) {
          const vLoose = looseReference(v.ref);
          const bLoose = looseReference(b.ref);
          if (vLoose && bLoose && (vLoose.includes(bLoose) || bLoose.includes(vLoose))) {
            rBonus = 15;
          }
        } else {
          // When invoice number is not available on either side, award a neutrality bonus
          // so legitimate date + amount matches are not penalized by lack of string identifier.
          rBonus = 5;
        }

        const totalScore = aScore * 0.7 + dScore + rBonus;
        return { b, totalScore, aScore, dScore, dg, sapGross, vHasRef, bHasRef, tdsDetected };
      })
      .filter((x) => x.aScore >= 50 && (x.dg === null || x.dg <= settings.fallbackWindow))
      .sort((x, y) => {
        // Priority 1: High confidence amount match (Exact or TDS match)
        const isTier1X = x.aScore >= 95 ? 1 : 0;
        const isTier1Y = y.aScore >= 95 ? 1 : 0;
        if (isTier1X !== isTier1Y) return isTier1Y - isTier1X;

        // Priority 2: Smallest date gap (e.g. 0-day / same date first)
        const dgX = x.dg ?? 999;
        const dgY = y.dg ?? 999;
        if (dgX !== dgY) return dgX - dgY;

        // Priority 3: Highest total score
        return y.totalScore - x.totalScore;
      });

    const bestFallback = fallbackScored[0];
    if (bestFallback && bestFallback.totalScore >= 60) {
      usedVendorIds.add(v.id);
      usedBuyerIds.add(bestFallback.b.id);
      const vNoRef = !bestFallback.vHasRef;
      const bNoRef = !bestFallback.bHasRef;

      if (bestFallback.tdsDetected) {
        items.push({
          id: `match-fb-tds-${v.id}-${bestFallback.b.id}`,
          status: "Matched — TDS Adjusted",
          a: v,
          b: bestFallback.b,
          basis: `Invoice Date & ${bestFallback.tdsDetected.basis} (${bestFallback.dg ?? 0}d gap)`,
          diff: bestFallback.tdsDetected.diff,
          score: Math.min(99, Math.round(bestFallback.totalScore)),
          days: bestFallback.dg,
          tds: bestFallback.tdsDetected.tdsAmount,
          matchPass: "TDS Date Match",
        });
      } else {
        const diff = v.amount - bestFallback.sapGross;
        let basisText = "";
        if (vNoRef && bNoRef) {
          basisText = `Date & Amount Match (Invoice No not available on both sides, ${bestFallback.dg ?? 0}d gap)`;
        } else if (vNoRef) {
          basisText = `Date & Amount Match (Invoice No missing on Vendor, ${bestFallback.dg ?? 0}d gap)`;
        } else if (bNoRef) {
          basisText = `Date & Amount Match (Invoice No missing on Buyer, ${bestFallback.dg ?? 0}d gap)`;
        } else {
          basisText = `Date & Amount Match (${bestFallback.dg ?? "?"}d gap, Confidence: ${Math.round(bestFallback.totalScore)}%)`;
        }

        items.push({
          id: `match-fb-${v.id}-${bestFallback.b.id}`,
          status: "Matched — Proximity Fallback",
          a: v,
          b: bestFallback.b,
          basis: basisText,
          diff,
          score: Math.min(100, Math.round(bestFallback.totalScore)),
          days: bestFallback.dg,
          tds: bestFallback.b.tds,
          review: true,
          matchPass: "Proximity Fallback",
        });
      }
    }
  }

  // 4. PASS 3: PAYMENTS MATCHING
  // Step 3A: First detect and match Multi-line SAP Payment Documents where a single document has both
  // a Debit (Gross Payment) and Credit (Partially Hold Payment Amount) that net to the Vendor Payment.
  const buyerDocGroups = new Map<string, BuyerRow[]>();
  for (const b of activeBuyer) {
    if (usedBuyerIds.has(b.id) || !b.docNo || b.docNo === "—" || b.docNo.length < 3) continue;
    if (b.type === "Payment" || b.docType === "KZ" || b.docType === "ZP") {
      const list = buyerDocGroups.get(b.docNo) || [];
      list.push(b);
      buyerDocGroups.set(b.docNo, list);
    }
  }

  for (const [docNo, group] of buyerDocGroups.entries()) {
    if (group.length < 2) continue;
    const drRows = group.filter((x) => x.ind === "Dr");
    const crRows = group.filter((x) => x.ind === "Cr");
    if (drRows.length === 0 || crRows.length === 0) continue;

    const drTotal = drRows.reduce((sum, x) => sum + x.amount, 0);
    const crTotal = crRows.reduce((sum, x) => sum + x.amount, 0);
    const netDisbursed = drTotal - crTotal;

    if (netDisbursed <= 0) continue;

    // Find candidate vendor payment matching this net disbursed amount
    const candidateVendorPayments = activeVendor
      .filter((v) => !usedVendorIds.has(v.id) && v.type === "Payment")
      .map((v) => {
        const amtDiff = Math.abs(v.amount - netDisbursed);
        const dg = dateGapDays(v.date, drRows[0].date);
        return { v, amtDiff, dg };
      })
      .filter((x) => x.amtDiff <= settings.amtTol && (x.dg === null || x.dg <= settings.fallbackWindow))
      .sort((a, b) => (a.dg ?? 999) - (b.dg ?? 999));

    if (candidateVendorPayments.length > 0) {
      const best = candidateVendorPayments[0];
      usedVendorIds.add(best.v.id);
      group.forEach((b) => usedBuyerIds.add(b.id));

      const primaryB = drRows[0];
      const extraB = [...drRows.slice(1), ...crRows];

      items.push({
        id: `match-pay-hold-${best.v.id}-${docNo}`,
        status: "Matched — Split Payment with Hold",
        a: best.v,
        b: primaryB,
        extraBuyerRows: extraB,
        basis: `SAP Doc #${docNo} Net Payment (Dr ₹${drTotal.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} less Cr ₹${crTotal.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} Hold = ₹${netDisbursed.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}) matches Vendor Payment`,
        diff: best.v.amount - netDisbursed,
        score: 100,
        days: best.dg,
        review: false,
        matchPass: "Payment with Hold",
      });
    }
  }

  // Step 3B: Match remaining single payment rows
  for (const v of activeVendor) {
    if (usedVendorIds.has(v.id) || v.type !== "Payment") continue;

    const paymentCandidates = activeBuyer.filter((b) => !usedBuyerIds.has(b.id) && b.type === "Payment");

    const scored = paymentCandidates
      .map((b) => {
        const aScore = calculateAmountTierScore(b.amount, v.amount, settings.amtTol);
        const dg = dateGapDays(v.date, b.date);
        const dScore = calculateDateDecayScore(dg, settings.fallbackWindow);
        const totalScore = aScore * 0.7 + dScore;
        return { b, totalScore, aScore, dg };
      })
      .filter((x) => x.aScore >= 40)
      .sort((x, y) => y.totalScore - x.totalScore);

    const bestPayment = scored[0];
    if (bestPayment && bestPayment.totalScore >= 70 && bestPayment.aScore >= 90) {
      usedVendorIds.add(v.id);
      usedBuyerIds.add(bestPayment.b.id);
      items.push({
        id: `match-pay-${v.id}-${bestPayment.b.id}`,
        status: "Matched — Exact",
        a: v,
        b: bestPayment.b,
        basis: `Payment matched within ${bestPayment.dg ?? 0} days`,
        diff: 0,
        score: Math.round(bestPayment.totalScore),
        days: bestPayment.dg,
        matchPass: "Payment Match",
      });
    } else if (bestPayment && bestPayment.totalScore >= 50) {
      usedVendorIds.add(v.id);
      usedBuyerIds.add(bestPayment.b.id);
      const diff = v.amount - bestPayment.b.amount;
      items.push({
        id: `part-pay-${v.id}-${bestPayment.b.id}`,
        status: "Partial — Payment Difference",
        a: v,
        b: bestPayment.b,
        basis: `Payment variance of ₹${Math.abs(diff).toFixed(2)} (${bestPayment.dg ?? 0}d gap)`,
        diff,
        score: Math.round(bestPayment.totalScore),
        days: bestPayment.dg,
        review: true,
        matchPass: "Payment Variance",
      });
    }
  }

  // 4. PASS 4: BATCH / SPLIT MATCHING (Many-to-One)
  if (settings.allowBatchMatching) {
    // Check if remaining single buyer payment covers 2-3 vendor invoices
    const unmatchedBuyerPayments = activeBuyer.filter((b) => !usedBuyerIds.has(b.id) && b.type === "Payment");
    const unmatchedVendorInvoices = activeVendor.filter((v) => !usedVendorIds.has(v.id) && v.type === "Invoice");

    for (const bPay of unmatchedBuyerPayments) {
      if (usedBuyerIds.has(bPay.id)) continue;
      // Check 2-invoice combinations
      let foundBatch = false;
      for (let i = 0; i < unmatchedVendorInvoices.length; i++) {
        for (let j = i + 1; j < unmatchedVendorInvoices.length; j++) {
          const v1 = unmatchedVendorInvoices[i];
          const v2 = unmatchedVendorInvoices[j];
          if (usedVendorIds.has(v1.id) || usedVendorIds.has(v2.id)) continue;

          const combined = v1.amount + v2.amount;
          if (Math.abs(combined - bPay.amount) <= settings.amtTol) {
            usedBuyerIds.add(bPay.id);
            usedVendorIds.add(v1.id);
            usedVendorIds.add(v2.id);

            items.push({
              id: `batch-${v1.id}-${v2.id}-${bPay.id}`,
              status: "Matched — Split / Batch",
              a: v1,
              b: bPay,
              extraVendorRows: [v2],
              basis: `Single payment covers 2 invoices: ${v1.ref} (₹${v1.amount.toFixed(2)}) + ${v2.ref} (₹${v2.amount.toFixed(2)})`,
              diff: combined - bPay.amount,
              score: 92,
              days: dateGapDays(v1.date, bPay.date),
              review: true,
              matchPass: "Batch Split",
            });
            foundBatch = true;
            break;
          }
        }
        if (foundBatch) break;
      }
    }
  }

  // 5. REMAINING UNMATCHED ROWS
  for (const v of activeVendor) {
    if (usedVendorIds.has(v.id)) continue;
    const status: MatchStatus =
      v.type === "Invoice"
        ? "Vendor Only — Invoice"
        : v.type === "Payment"
        ? "Vendor Only — Payment"
        : "Vendor Only — Note";

    items.push({
      id: `vendor-only-${v.id}`,
      status,
      a: v,
      b: null,
      basis: "Missing in Buyer (SAP) ledger",
      diff: v.signed,
      score: 0,
      days: null,
      matchPass: "Unmatched",
    });
  }

  for (const b of activeBuyer) {
    if (usedBuyerIds.has(b.id)) continue;
    const status: MatchStatus =
      b.type === "Invoice"
        ? "Buyer Only — Invoice"
        : b.type === "Payment"
        ? "Buyer Only — Payment"
        : "Buyer Only — Adjustment";

    items.push({
      id: `buyer-only-${b.id}`,
      status,
      a: null,
      b,
      basis: "Missing in Vendor ledger",
      diff: -b.signed,
      score: 0,
      days: null,
      tds: b.tds,
      matchPass: "Unmatched",
    });
  }

  // 6. OPENING & CLOSING BALANCES
  const vOpenRow = vendorRows.find((x) => x.type === "Opening Balance");
  const bOpenRow = buyerRows.find((x) => x.type === "Opening Balance");
  const vCloseRow = vendorRows.find((x) => x.type === "Closing Balance");
  const bCloseRow = buyerRows.find((x) => x.type === "Closing Balance");

  if (vOpenRow) {
    items.unshift({
      id: `open-v-${vOpenRow.id}`,
      status: "Opening Balance (Vendor)",
      a: vOpenRow,
      b: null,
      basis: "Vendor Opening Balance",
      diff: vOpenRow.signed,
      score: 100,
      days: null,
      internal: true,
    });
  }

  if (storedTotals?.buyerOpen || bOpenRow) {
    const bOpenData = storedTotals?.buyerOpen || {
      side: bOpenRow?.ind || "Cr",
      amount: bOpenRow?.amount || 0,
      date: bOpenRow?.date,
      count: 1,
    };

    items.unshift({
      id: `open-b-stored`,
      status: "Opening Balance (Buyer)",
      a: null,
      b: {
        id: "open-b",
        source: "Buyer",
        docNo: "OP-BAL",
        date: bOpenData.date || null,
        docDate: bOpenData.date || null,
        postingDate: null,
        ref: "Opening Balance",
        docType: "SA",
        ind: bOpenData.side,
        amount: bOpenData.amount,
        signed: (bOpenData.side === "Cr" ? -1 : 1) * bOpenData.amount,
        type: "Opening Balance",
        tds: 0,
        desc: "Aggregated Opening Balance",
      },
      basis: `Aggregated ${bOpenData.count || 1} opening entry/entries`,
      diff: (bOpenData.side === "Cr" ? -1 : 1) * bOpenData.amount,
      score: 100,
      days: null,
      internal: true,
    });
  }

  // 7. AUTOMATED ERROR & ANOMALY DETECTION ENGINE
  // A. Check for Duplicate references in Vendor Ledger
  const vendorRefCounts = new Map<string, VendorRow[]>();
  for (const v of activeVendor) {
    if (!v.ref || v.ref === "—" || v.ref.length < 3) continue;
    const key = normalizeReference(v.ref);
    const existing = vendorRefCounts.get(key) || [];
    existing.push(v);
    vendorRefCounts.set(key, existing);
  }
  for (const [key, rows] of vendorRefCounts.entries()) {
    if (rows.length > 1) {
      anomalies.push({
        id: `dup-v-${key}`,
        code: "DUPLICATE_REF",
        title: `Duplicate Reference in Vendor Ledger (${rows[0].ref})`,
        description: `Found ${rows.length} entries for ref "${rows[0].ref}" totaling ₹${rows
          .reduce((s, r) => s + r.amount, 0)
          .toFixed(2)}. This may be a double billing risk.`,
        severity: "high",
        side: "Vendor",
        targetRef: rows[0].ref,
        amount: rows[0].amount,
        suggestedAction: "Check invoice dates and confirm if vendor submitted a duplicate claim.",
      });
    }
  }

  // B. Check for Duplicate references in Buyer Ledger
  const buyerRefCounts = new Map<string, BuyerRow[]>();
  for (const b of activeBuyer) {
    if (!b.ref || b.ref === "—" || b.ref.length < 3) continue;
    const key = normalizeReference(b.ref);
    const existing = buyerRefCounts.get(key) || [];
    existing.push(b);
    buyerRefCounts.set(key, existing);
  }
  for (const [key, rows] of buyerRefCounts.entries()) {
    if (rows.length > 1) {
      anomalies.push({
        id: `dup-b-${key}`,
        code: "DUPLICATE_REF",
        title: `Duplicate Booking in Buyer Ledger (${rows[0].ref})`,
        description: `Reference "${rows[0].ref}" is booked ${rows.length} times under SAP docs: ${rows
          .map((r) => r.docNo)
          .filter(Boolean)
          .join(", ")}.`,
        severity: "high",
        side: "Buyer",
        targetRef: rows[0].ref,
        amount: rows[0].amount,
        suggestedAction: "Audit whether this invoice was mistakenly entered twice in SAP.",
      });
    }
  }

  // C. TDS Rate Mismatch Detector (e.g. standard section 194Q is 0.1%)
  for (const b of activeBuyer) {
    if (b.tds > 0 && b.amount > 0) {
      const gross = b.amount + b.tds;
      const actualPct = (b.tds / gross) * 100;
      // Check standard Indian TDS rates: 0.1% (194Q), 1% (194C Indiv), 2% (194C Corp), 10% (194J)
      const isKnownRate =
        Math.abs(actualPct - 0.1) < 0.03 ||
        Math.abs(actualPct - 1.0) < 0.1 ||
        Math.abs(actualPct - 2.0) < 0.1 ||
        Math.abs(actualPct - 10.0) < 0.2;

      if (!isKnownRate && b.tds > 10) {
        anomalies.push({
          id: `tds-rate-${b.id}`,
          code: "TDS_RATE_MISMATCH",
          title: `Non-Standard TDS Rate on SAP Doc ${b.docNo || b.ref}`,
          description: `Booked TDS is ₹${b.tds.toFixed(2)} on Gross ₹${gross.toFixed(2)} (${actualPct.toFixed(
            3
          )}%). Standard rates are usually 0.1% (194Q), 1%/2% (194C), or 10% (194J).`,
          severity: "medium",
          side: "Buyer",
          targetRef: b.ref,
          amount: b.tds,
          suggestedAction: "Verify tax section code and rate deduction configuration.",
        });
      }
    }
  }

  // D. Minor Roundoff Discrepancies (≤ settings.autoRoundOffLimit)
  for (const item of items) {
    if (item.status.startsWith("Partial") && Math.abs(item.diff) <= settings.autoRoundOffLimit && Math.abs(item.diff) > 0) {
      anomalies.push({
        id: `roundoff-${item.id}`,
        code: "MINOR_ROUNDOFF",
        title: `Minor Rounding Variance (₹${Math.abs(item.diff).toFixed(2)}) on ${item.a?.ref || item.b?.ref}`,
        description: `Difference of ₹${Math.abs(item.diff).toFixed(2)} between Vendor (₹${item.a?.amount.toFixed(
          2
        )}) and SAP (₹${item.b?.amount.toFixed(2)}).`,
        severity: "low",
        side: "Both",
        targetRef: item.a?.ref || item.b?.ref,
        amount: Math.abs(item.diff),
        suggestedAction: "Recommended for automated round-off / minor discrepancy write-off.",
      });
    }
  }

  // E. Date Lag / Post-dated Timing Anomalies
  for (const item of items) {
    if (item.days !== null && item.days > 45 && (item.status.startsWith("Matched") || item.status.startsWith("Partial"))) {
      anomalies.push({
        id: `lag-${item.id}`,
        code: "HIGH_DATE_LAG",
        title: `High Date Discrepancy (${item.days} days) on ${item.a?.ref || item.b?.ref}`,
        description: `Vendor date vs Buyer posting date spans ${item.days} days. This indicates delayed processing or timing carry-over.`,
        severity: "medium",
        side: "Both",
        targetRef: item.a?.ref || item.b?.ref,
        suggestedAction: "Check whether invoice was caught in month-end cut-off or late GRN.",
      });
    }
  }

  // 8. BALANCE CALCULATIONS & BREAK-UP SUMMARY
  const vSignedMovement = activeVendor.reduce((s, x) => s + x.signed, 0);
  const bSignedMovement = activeBuyer.reduce((s, x) => s + x.signed, 0);

  // Compute Movement Break-up for Period Movement (Invoices, Payments, TDS, Adjustments, Excluded)
  // Vendor categories
  const vInvoices = activeVendor.filter((x) => x.type === "Invoice");
  const vPayments = activeVendor.filter((x) => x.type === "Payment");
  const vTds = activeVendor.filter((x) => x.type === "TDS");
  const vAdjustments = activeVendor.filter(
    (x) => x.type === "Debit Note" || x.type === "Credit Note" || x.type === "Adjustment JV"
  );

  const vInvoiceAmt = vInvoices.reduce((s, x) => s + x.amount, 0);
  const vPaymentAmt = vPayments.reduce((s, x) => s + x.amount, 0);
  const vTdsAmt = vTds.reduce((s, x) => s + x.amount, 0);
  const vAdjAmt = vAdjustments.reduce((s, x) => s + x.signed, 0);

  // Buyer categories
  const bInvoices = activeBuyer.filter((x) => x.type === "Invoice");
  const bPayments = activeBuyer.filter((x) => x.type === "Payment");
  const bTdsDirect = activeBuyer.filter((x) => x.type === "TDS");
  const bAdjustments = activeBuyer.filter(
    (x) => x.type === "Debit Note" || x.type === "Credit Note" || x.type === "Adjustment JV"
  );

  const bInvoiceAmt = bInvoices.reduce((s, x) => s + x.amount, 0);

  // For SAP Payments: accounts for Dr gross payments less Cr payment hold amounts
  const bPaymentDr = bPayments.filter((x) => x.ind === "Dr").reduce((s, x) => s + x.amount, 0);
  const bPaymentCr = bPayments.filter((x) => x.ind === "Cr").reduce((s, x) => s + x.amount, 0);
  const bPaymentNet = (bPaymentDr > 0 && bPaymentCr > 0) ? (bPaymentDr - bPaymentCr) : bPayments.reduce((s, x) => s + x.amount, 0);

  // Total booked TDS in SAP (from tds field on invoices/payments + direct TDS rows)
  const bTotalTds = activeBuyer.reduce((s, x) => s + (x.tds || 0), 0) + bTdsDirect.reduce((s, x) => s + x.amount, 0);
  const bAdjAmt = bAdjustments.reduce((s, x) => s + x.signed, 0);

  // Excluded categories
  const vExcludedAmt = excludedVendor.reduce((s, x) => s + x.amount, 0);
  const bExcludedAmt = excludedBuyer.reduce((s, x) => s + x.amount, 0);

  const invVariance = Math.abs(vInvoiceAmt - bInvoiceAmt);
  const payVariance = Math.abs(vPaymentAmt - bPaymentNet);
  const tdsVariance = Math.abs(vTdsAmt - bTotalTds);
  const adjVariance = Math.abs(vAdjAmt - bAdjAmt);

  const movementBreakup: MovementBreakup = {
    invoices: {
      vendorAmount: vInvoiceAmt,
      buyerAmount: bInvoiceAmt,
      vendorCount: vInvoices.length,
      buyerCount: bInvoices.length,
      variance: invVariance,
      status: invVariance <= settings.amtTol ? "Aligned" : "Variance",
    },
    payments: {
      vendorAmount: vPaymentAmt,
      buyerAmount: bPaymentNet,
      vendorCount: vPayments.length,
      buyerCount: bPayments.length,
      variance: payVariance,
      status: payVariance <= settings.amtTol ? "Aligned" : "Variance",
    },
    tds: {
      vendorAmount: vTdsAmt,
      buyerAmount: bTotalTds,
      vendorCount: vTds.length,
      buyerCount: activeBuyer.filter((x) => (x.tds || 0) > 0 || x.type === "TDS").length,
      variance: tdsVariance,
      status: tdsVariance <= settings.amtTol ? "Aligned" : "Notice",
    },
    adjustments: {
      vendorAmount: Math.abs(vAdjAmt),
      buyerAmount: Math.abs(bAdjAmt),
      vendorCount: vAdjustments.length,
      buyerCount: bAdjustments.length,
      variance: adjVariance,
      status: adjVariance <= settings.amtTol ? "Aligned" : "Variance",
    },
    excluded: (excludedVendor.length > 0 || excludedBuyer.length > 0) ? {
      vendorAmount: vExcludedAmt,
      buyerAmount: bExcludedAmt,
      vendorCount: excludedVendor.length,
      buyerCount: excludedBuyer.length,
      variance: Math.abs(vExcludedAmt - bExcludedAmt),
      status: "Notice",
    } : undefined,
  };

  const vendorOpen = (vOpenRow && vOpenRow._edited)
    ? { side: vOpenRow.dc, amount: vOpenRow.amount, date: vOpenRow.date }
    : storedTotals?.vendorOpen || (vOpenRow ? { side: vOpenRow.dc, amount: vOpenRow.amount, date: vOpenRow.date } : null);

  const buyerOpen = (bOpenRow && bOpenRow._edited)
    ? { side: bOpenRow.ind, amount: bOpenRow.amount, date: bOpenRow.date }
    : storedTotals?.buyerOpen || (bOpenRow ? { side: bOpenRow.ind, amount: bOpenRow.amount, date: bOpenRow.date } : null);

  let vendorClose = (vCloseRow && vCloseRow._edited)
    ? { side: vCloseRow.dc, amount: vCloseRow.amount }
    : storedTotals?.vendorClose || (vCloseRow ? { side: vCloseRow.dc, amount: vCloseRow.amount } : null);
  if (!vendorClose && vendorOpen) {
    const openSigned = vendorOpen.side === "Dr" ? vendorOpen.amount : -vendorOpen.amount;
    const closeSigned = openSigned + vSignedMovement;
    vendorClose = { side: closeSigned >= 0 ? "Dr" : "Cr", amount: Math.abs(closeSigned), derived: true };
  }

  let buyerClose = (bCloseRow && bCloseRow._edited)
    ? { side: bCloseRow.ind, amount: bCloseRow.amount }
    : storedTotals?.buyerClose || (bCloseRow ? { side: bCloseRow.ind, amount: bCloseRow.amount } : null);
  if (!buyerClose && buyerOpen) {
    const openSigned = buyerOpen.side === "Cr" ? -buyerOpen.amount : buyerOpen.amount;
    const closeSigned = openSigned + bSignedMovement;
    buyerClose = { side: closeSigned >= 0 ? "Dr" : "Cr", amount: Math.abs(closeSigned), derived: true };
  }

  const vOpenSigned = vendorOpen ? (vendorOpen.side === "Dr" ? vendorOpen.amount : -vendorOpen.amount) : 0;
  const bOpenSigned = buyerOpen ? (buyerOpen.side === "Cr" ? -buyerOpen.amount : buyerOpen.amount) : 0;
  const vCloseSigned = vendorClose ? (vendorClose.side === "Dr" ? vendorClose.amount : -vendorClose.amount) : 0;
  const bCloseSigned = buyerClose ? (buyerClose.side === "Cr" ? -buyerClose.amount : buyerClose.amount) : 0;

  const netMovementDiff = vSignedMovement + bSignedMovement;
  const closingDiff = vCloseSigned + bCloseSigned;

  // If opening balance mismatch exists, add anomaly
  if (vendorOpen && buyerOpen && Math.abs(vOpenSigned + bOpenSigned) > settings.amtTol) {
    anomalies.push({
      id: "bal-open-mismatch",
      code: "BALANCE_DISCREPANCY",
      title: `Opening Balance Discrepancy (₹${Math.abs(vOpenSigned + bOpenSigned).toFixed(2)})`,
      description: `Vendor Opening: ${vendorOpen.side} ₹${vendorOpen.amount.toFixed(2)} vs SAP Opening: ${buyerOpen.side} ₹${buyerOpen.amount.toFixed(2)}. Net gap is ₹${Math.abs(vOpenSigned + bOpenSigned).toFixed(2)}.`,
      severity: "high",
      side: "Both",
      amount: Math.abs(vOpenSigned + bOpenSigned),
      suggestedAction: "Verify prior financial year-end closing reconciliation before proceeding.",
    });
  }

  const activeItems = items.filter((x) => !x.internal);
  const matchedCount = activeItems.filter((x) => x.status.startsWith("Matched")).length;
  const partialCount = activeItems.filter((x) => x.status.startsWith("Partial")).length;
  const unmatchedCount = activeItems.filter((x) => /Only|Exception/.test(x.status)).length;
  const reconciledRate = activeItems.length > 0 ? (matchedCount / activeItems.length) * 100 : 0;

  const totalVendorAmount = activeVendor.reduce((s, x) => s + x.amount, 0);
  const totalBuyerAmount = activeBuyer.reduce((s, x) => s + x.amount, 0);

  return {
    items,
    anomalies,
    balanceSummary: {
      vendorOpen,
      buyerOpen,
      vendorClose,
      buyerClose,
      vendorMovement: vSignedMovement,
      buyerMovement: bSignedMovement,
      netMovementDiff,
      closingDiff,
      breakup: movementBreakup,
    },
    matchedCount,
    partialCount,
    unmatchedCount,
    totalVendorAmount,
    totalBuyerAmount,
    reconciledRate,
    netDiscrepancy: netMovementDiff,
  };
}
