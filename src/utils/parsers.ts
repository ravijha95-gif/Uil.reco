import * as XLSX from "xlsx";
import { BuyerRow, LearningRule, TransactionType, VendorRow } from "../types/index";
import { cleanText, parseDate, parseNumber } from "./dateAndNumber";

export interface ParsedFileResult {
  vendorRows: VendorRow[];
  buyerRows: BuyerRow[];
  openBal?: { side: "Dr" | "Cr"; amount: number; count?: number; date?: Date | null } | null;
  closeBal?: { side: "Dr" | "Cr"; amount: number } | null;
  vendorCode?: string;
  vendorName?: string;
  logs: string[];
  warnings: string[];
}

export interface PdfVisualRow {
  page: number;
  tight: string;
  spaced: string;
  cells: string[];
}

const VCH_TYPE_PATTERNS = [
  { re: /GST\s+SALES(?:\s*\([^)]*\))?/i, type: "Invoice" as TransactionType },
  { re: /Sales\s*-?\s*(?:New|\d{4}-\d{2}|\d{2}-\d{2}|\d{2}-\d{4}|\d{4}-\d{4})/i, type: "Invoice" as TransactionType },
  { re: /SALES?/i, type: "Invoice" as TransactionType },
  { re: /\bSERVICE\b/i, type: "Invoice" as TransactionType },
  { re: /REIMURSENT\w*/i, type: "Invoice" as TransactionType },
  { re: /Reimbursement\s+Control/i, type: "Invoice" as TransactionType },
  { re: /KOLKATA\s+RECEIPT/i, type: "Payment" as TransactionType },
  { re: /Kolkata\s+Sales/i, type: "Invoice" as TransactionType },
  { re: /Bank\s+Receipt/i, type: "Payment" as TransactionType },
  { re: /Credit\s+Note/i, type: "Credit Note" as TransactionType },
  { re: /Debit\s+Note/i, type: "Debit Note" as TransactionType },
  { re: /JOURNAL\s+VOUCHER/i, type: "Adjustment JV" as TransactionType },
  { re: /\bJRNL\b/i, type: "Adjustment JV" as TransactionType },
  { re: /Journal/i, type: "Adjustment JV" as TransactionType },
  { re: /Receipt/i, type: "Payment" as TransactionType },
  { re: /Payment/i, type: "Payment" as TransactionType },
];

export function testRule(rule: LearningRule, hay: string): boolean {
  try {
    const pat = rule.pattern;
    if (!pat) return false;
    const upperHay = hay.toUpperCase();
    const upperPat = pat.toUpperCase();

    if (rule.mode === "contains") return upperHay.includes(upperPat);
    if (rule.mode === "startsWith") return upperHay.startsWith(upperPat);
    if (rule.mode === "exact") return upperHay === upperPat;
    return new RegExp(pat, "i").test(hay);
  } catch {
    return false;
  }
}

export function classifyVendorRow(
  vchType: string,
  particulars: string,
  rules: LearningRule[] = []
): { type: TransactionType; dc?: "Dr" | "Cr" } {
  const hay = `${vchType} ${particulars}`.trim();

  // Check custom user rules first
  for (const r of rules) {
    if (testRule(r, hay)) {
      const targetType = r.value as TransactionType;
      let dc: "Dr" | "Cr" | undefined;
      if (targetType === "Invoice" || targetType === "Debit Note") dc = "Dr";
      if (targetType === "Payment" || targetType === "Credit Note" || targetType === "TDS") dc = "Cr";
      return { type: targetType, dc };
    }
  }

  // Built-in pattern matching
  for (const pat of VCH_TYPE_PATTERNS) {
    if (pat.re.test(vchType) || pat.re.test(particulars)) {
      let dc: "Dr" | "Cr" | undefined;
      if (pat.type === "Invoice" || pat.type === "Debit Note") dc = "Dr";
      if (pat.type === "Payment" || pat.type === "Credit Note") dc = "Cr";
      return { type: pat.type, dc };
    }
  }

  // Fallback checks
  if (/Opening\s*Balance/i.test(hay)) return { type: "Opening Balance" };
  if (/Closing\s*Balance/i.test(hay)) return { type: "Closing Balance" };

  return { type: "Unknown" };
}

export function classifyBuyerRow(
  docType: string,
  docNo: string,
  ref: string,
  tds: number
): { type: TransactionType; ind?: "Dr" | "Cr" } {
  const dt = docType.toUpperCase().trim();

  if (dt === "KR" || dt === "RE" || /^(INV|INVOICE|BILL|PURCHASE|TAX\s*INVOICE|PI)$/i.test(dt)) {
    return { type: "Invoice", ind: "Cr" };
  }
  if (dt === "KZ" || dt === "ZP" || /^(PAY|PAYMENT|PMT|BANK|RECEIPT|DISB|DISBURSEMENT)$/i.test(dt)) {
    return { type: "Payment", ind: "Dr" };
  }
  if (dt === "KG" || /^(CN|CREDIT\s*NOTE)$/i.test(dt)) {
    return { type: "Credit Note", ind: "Dr" };
  }
  if (dt === "DG" || dt === "DR" || /^(DN|DEBIT\s*NOTE)$/i.test(dt)) {
    return { type: "Debit Note", ind: "Dr" };
  }
  if (dt === "SA" || dt === "SU" || dt === "AB") return { type: "Adjustment JV" };

  if (tds > 0) return { type: "TDS", ind: "Dr" };
  if (/Opening/i.test(ref) || docNo === "OPENING") return { type: "Opening Balance", ind: "Cr" };

  return { type: "Unknown" };
}

/* ----------------------------------------------------
 * PDF EXTRACTION ENGINE (Tally & SAP PDF)
 * ---------------------------------------------------- */
let pdfjsLibInstance: any = null;

export async function getPdfJs(): Promise<any> {
  if (pdfjsLibInstance) return pdfjsLibInstance;
  try {
    const pdfjs = await import("pdfjs-dist");
    // Use worker from standard CDN matching installed or fallback version
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    pdfjsLibInstance = pdfjs;
    return pdfjsLibInstance;
  } catch (err) {
    try {
      // Browser CDN Fallback
      // @ts-ignore
      const cdnLib = await import(/* @vite-ignore */ "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
      cdnLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      pdfjsLibInstance = cdnLib;
      return pdfjsLibInstance;
    } catch (e2) {
      console.error("Failed to load PDF engine", e2);
      throw new Error("PDF processing engine could not be initialized. Please check network connection.");
    }
  }
}

export async function extractPdfVisualRows(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<PdfVisualRow[]> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const out: PdfVisualRow[] = [];

  for (let pn = 1; pn <= numPages; pn++) {
    if (onProgress) onProgress(pn, numPages);
    const page = await pdfDoc.getPage(pn);
    const textContent = await page.getTextContent();
    const items = textContent.items
      .map((it: any) => ({
        s: cleanText(it.str || ""),
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
      }))
      .filter((x: any) => x.s);

    const groups: Array<{ y: number; a: any[] }> = [];
    for (const it of items) {
      const g = groups.find((z) => Math.abs(z.y - it.y) <= 3);
      if (!g) {
        groups.push({ y: it.y, a: [it] });
      } else {
        g.a.push(it);
      }
    }

    groups.sort((a, b) => b.y - a.y);

    for (const g of groups) {
      g.a.sort((a, b) => a.x - b.x);
      let tight = "";
      const cells: string[] = [];
      let last = -99999;
      for (const it of g.a) {
        tight += it.s;
        if (!cells.length || it.x - last > 10) {
          cells.push(it.s);
        } else {
          cells[cells.length - 1] += " " + it.s;
        }
        last = it.x + it.w;
      }
      out.push({ page: pn, tight, spaced: cells.join(" "), cells });
    }
  }

  return out;
}

function findVchType(s: string) {
  let best: { index: number; len: number; type: TransactionType; text: string } | null = null;
  for (const p of VCH_TYPE_PATTERNS) {
    const re = new RegExp(p.re.source, "gi");
    let m;
    while ((m = re.exec(s)) !== null) {
      if (!best || m.index > best.index) {
        best = { index: m.index, len: m[0].length, type: p.type, text: m[0] };
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return best;
}

/**
 * Accurately extracts the voucher number and transaction amount from the trailing segment
 * of a visual line in a Tally or ERP statement.
 *
 * Prevents the critical digit-misattribution bug where the last digit of a voucher number
 * (e.g. 1121) was mistakenly stripped and prefixed to the amount (turning 1200 into 11200).
 */
export function extractVchAndAmount(after: string): { vch: string; amt: string } | null {
  after = after.trim();
  if (!after) return null;

  // 1. Primary & safest path: Spaced boundary between Voucher Number and Amount.
  // Matches any text followed by whitespace and a valid monetary number (with optional commas/decimals).
  // Handles:
  // - "1121 1,200.00" -> vch: "1121", amt: "1,200.00"
  // - "1121 1200" -> vch: "1121", amt: "1200"
  // - "FHO/KMA/C24/1111 51,032.10" -> vch: "FHO/KMA/C24/1111", amt: "51,032.10"
  // - "K/0003 1,59,858.00" -> vch: "K/0003", amt: "1,59,858.00"
  // - "K / 0827 2,57,632.00" -> vch: "K / 0827", amt: "2,57,632.00"
  const spaceMatch = after.match(/^(.*?)\s+([-\(]?\s*[\d,]+(?:\.\d{1,2})?\s*\)?)(?:\s*(?:Dr|Cr))?$/i);
  if (spaceMatch && spaceMatch[1].trim()) {
    const rawVch = cleanText(spaceMatch[1].replace(/[,\s]+$/, ""));
    const rawAmt = spaceMatch[2].replace(/[()\s]/g, "");
    const val = parseNumber(rawAmt);
    if (!isNaN(val) && val > 0 && rawVch.length > 0) {
      return { vch: rawVch, amt: rawAmt };
    }
  }

  // 2. Token-based fallback when multiple tokens exist
  const tokens = after.split(/\s+/);
  if (tokens.length >= 2) {
    let endIdx = tokens.length - 1;
    if (/^(Dr|Cr)$/i.test(tokens[endIdx]) && tokens.length >= 3) {
      endIdx = tokens.length - 2;
    }
    const cleanAmt = tokens[endIdx].replace(/[()\s]/g, "");
    if (/^[\d,]+(?:\.\d{1,2})?$/.test(cleanAmt)) {
      const val = parseNumber(cleanAmt);
      if (!isNaN(val) && val > 0) {
        const vch = cleanText(tokens.slice(0, endIdx).join(" ").replace(/[,\s]+$/, ""));
        if (vch) return { vch, amt: cleanAmt };
      }
    }
  }

  // 3. Fallback only when text items are strictly concatenated without any spaces.
  // Standard 4-digit voucher number after slash (e.g. "FHO/KMA/C24/111151,032.10" or "K/00031,59,858.00")
  let m = after.match(/^(.*\/)(\d{4})([-\(]?\s*[\d,]+(?:\.\d{1,2})?\s*\)?)$/);
  if (m && m[1] && m[2] && m[3]) {
    return { vch: (m[1] + m[2]).replace(/[,\s]+$/, ""), amt: m[3] };
  }

  m = after.match(/^(.*\/)(\d{3,6})(\d{1,2}(?:,\d{2})*,\d{3}\.\d{2}|\d{1,2},\d{3}\.\d{2})$/);
  if (m && m[1] && m[2] && m[3]) {
    return { vch: (m[1] + m[2]).replace(/[,\s]+$/, ""), amt: m[3] };
  }

  // If there is a slash/prefix in the voucher: take everything up to the first valid amount format
  m = after.match(/^(.*[A-Za-z\/-]+?)(\d{1,2}(?:,\d{2})*,\d{3}\.\d{2})$/);
  if (m && m[1] && m[2]) {
    return { vch: m[1].replace(/[,\s]+$/, ""), amt: m[2] };
  }

  // Plain standard amount with decimals
  m = after.match(/^(.*[A-Za-z\/-]+?)(\d+\.\d{2})$/);
  if (m && m[1] && m[2]) {
    return { vch: m[1].replace(/[,\s]+$/, ""), amt: m[2] };
  }

  return null;
}

export function parseTallyPdfRows(
  rows: PdfVisualRow[],
  rules: LearningRule[] = []
): {
  vendorRows: VendorRow[];
  closing: { side: "Dr" | "Cr"; amount: number } | null;
  openBal: { side: "Dr" | "Cr"; amount: number; date?: Date | null } | null;
  vendorName?: string;
} {
  const vendorRows: VendorRow[] = [];
  let currentDate: Date | null = null;
  let closing: { side: "Dr" | "Cr"; amount: number } | null = null;
  let openBal: { side: "Dr" | "Cr"; amount: number; date?: Date | null } | null = null;
  let rowId = 1;
  let vendorName = "";

  // Scan top lines for vendor/company name
  for (const r of rows.slice(0, 15)) {
    const s = r.spaced.trim();
    if (
      s &&
      !/^(Date|Particulars|Vch|Page|Ledger|Utkarsh|Statement|Opening|Closing|Brought|Carried|From|To|\d{1,2}-)/i.test(s) &&
      s.length > 2 &&
      s.length < 90
    ) {
      if (!vendorName && /[A-Za-z]/.test(s) && !/^(Debit|Credit|Balance|Total|Journal|Payment|Sales|Receipt)/i.test(s)) {
        vendorName = cleanText(s);
        break;
      }
    }
  }

  for (const row of rows) {
    // Crucial: check "spaced" FIRST so PDF column whitespace separates voucher number from amount.
    for (const key of ["spaced", "tight"] as const) {
      const s = row[key].replace(/[\r\n]+/g, " ").trim();
      if (/^Date\s*Particulars/i.test(s) || /^DateParticulars/i.test(s)) continue;

      const clm = s.match(/Closing\s*Balance\s*([\d,]+\.\d{2})/i);
      if (clm && !/^\d{1,2}-/.test(s)) {
        const side = /Dr\s*Closing/i.test(s) ? "Dr" : /Cr\s*Closing/i.test(s) ? "Cr" : "Dr";
        closing = { side, amount: parseNumber(clm[1]) };
        break;
      }

      if (/^(Brought Forward|Carried Over)/i.test(s)) continue;

      const dm = s.match(/^(\d{1,2}-[A-Za-z]{3}-\d{2,4})/);
      let rest = s;
      if (dm) {
        currentDate = parseDate(dm[1]);
        rest = s.slice(dm[1].length).trim();
      }
      if (!currentDate) continue;

      const ind = rest.match(/^(To|By|Dr|Cr)\s*/i);
      if (!ind) continue;
      const dc: "Dr" | "Cr" = /^(To|Dr)$/i.test(ind[1]) ? "Dr" : "Cr";
      rest = rest.slice(ind[0].length).trim();

      const om = rest.match(/^Opening\s*Balance\s*([\d,]+\.\d{2})/i);
      if (om) {
        const amt = parseNumber(om[1]);
        openBal = { side: dc, amount: amt, date: currentDate };
        vendorRows.push({
          id: `v-pdf-open-${rowId++}`,
          date: currentDate,
          dc,
          particulars: "Opening Balance",
          vchType: "Opening Balance",
          ref: "OPENING",
          amount: amt,
          signed: (dc === "Dr" ? 1 : -1) * amt,
          type: "Opening Balance",
          _page: row.page,
          _rawText: rest,
        });
        break;
      }

      const found = findVchType(rest);
      if (!found) continue;

      const vchType = found.text;
      const particulars = cleanText(rest.slice(0, found.index));
      const after = rest.slice(found.index + found.len).trim();

      const sp = extractVchAndAmount(after);
      if (!sp) continue;

      const vchNo = cleanText(sp.vch.replace(/[,\s]+$/, ""));
      const amt = parseNumber(sp.amt);
      if (amt === 0) continue;

      const classification = classifyVendorRow(vchType, particulars, rules);
      const rowDc = classification.dc || dc;

      vendorRows.push({
        id: `v-pdf-${rowId++}`,
        date: currentDate,
        dc: rowDc,
        particulars,
        vchType,
        ref: vchNo,
        amount: amt,
        signed: (rowDc === "Dr" ? 1 : -1) * amt,
        type: classification.type,
        _page: row.page,
        _rawText: rest,
      });
      break; // Successfully parsed row using spaced representation; do not evaluate tight
    }
  }

  return { vendorRows, closing, openBal, vendorName: vendorName || undefined };
}

const SAP_PDF_RE = /^(\d{6,10})\s*(\d{2}-[A-Za-z]{3}-\d{2})\s*(\d{2}-[A-Za-z]{3}-\d{2})\s*(.*?)\s*(KR|RE|KZ|ZP|SA|SU)\s*(Dr|Cr)\s*(-?[\d,]+\.\d{2})\s*(?:INR)?\s*(.*)$/i;
const SAP_PDF_TIGHT_RE = /^(\d{6,10})(\d{2}-[A-Za-z]{3}-\d{2})(\d{2}-[A-Za-z]{3}-\d{2})(.*?)(KR|RE|KZ|ZP|SA|SU)(Dr|Cr)(-?[\d,]+\.\d{2})(?:INR)?(.*)$/i;

export function parseSapPdfRows(
  rows: PdfVisualRow[],
  rules: LearningRule[] = []
): {
  buyerRows: BuyerRow[];
  closing: { side: "Dr" | "Cr"; amount: number } | null;
  openBal: { side: "Dr" | "Cr"; amount: number; count?: number; date?: Date | null } | null;
  vendorCode?: string;
  vendorName?: string;
} {
  const buyerRows: BuyerRow[] = [];
  let closing: { side: "Dr" | "Cr"; amount: number } | null = null;
  let openBal: { side: "Dr" | "Cr"; amount: number; count?: number; date?: Date | null } | null = null;
  let rowId = 1;
  let vendorCode = "";
  let vendorName = "";

  // Scan early lines for SAP Vendor Code & Name
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const r = rows[i];
    const s = r.spaced;
    const m1 = s.match(/(?:Vendor|Account|Creditor)(?:\s*(?:Code|No|Number)?)?[:\s]+([A-Za-z0-9]{5,14})\s*([A-Za-z0-9\s.,&-]+)?/i);
    if (m1) {
      if (!vendorCode) vendorCode = m1[1];
      if (m1[2] && m1[2].trim().length > 2 && !vendorName) {
        const cand = cleanText(m1[2]);
        if (!/^(Doc|Page|Line|From|To|Date|INR|Statement|Period|Posting)/i.test(cand)) {
          vendorName = cand;
        }
      }
    }
    const mName = s.match(/(?:Vendor\s*Name|Account\s*Name|Party\s*Name|Name)[:\s]+([A-Za-z0-9\s.,&-]+)/i);
    if (mName && mName[1] && !vendorName) {
      const cand = cleanText(mName[1]);
      if (cand.length > 2 && !/^(Utkarsh|Doc|Page|Line|From|To|Period|Posting)/i.test(cand)) {
        vendorName = cand;
      }
    }
    const mStandalone = s.match(/^(\d{8,14})\s+([A-Za-z][A-Za-z0-9\s.,&-]{2,})/);
    if (mStandalone && !vendorCode) {
      vendorCode = mStandalone[1];
      if (!vendorName) vendorName = cleanText(mStandalone[2]);
    }
    // If vendorCode found but vendorName not yet found, check adjacent visual line
    if (vendorCode && !vendorName && i + 1 < rows.length) {
      const nextLine = rows[i + 1].spaced.trim();
      if (
        nextLine.length > 2 &&
        nextLine.length < 80 &&
        !/^(Doc|Page|Line|From|To|Date|INR|Statement|Period|Posting|Document|Balance|\d{1,2}-)/i.test(nextLine) &&
        /[A-Za-z]/.test(nextLine)
      ) {
        vendorName = cleanText(nextLine);
      }
    }
    if (!vendorCode && r.cells) {
      for (const cell of r.cells) {
        const cm = cell.trim().match(/^(\d{8,14})$/);
        if (cm) {
          vendorCode = cm[1];
          break;
        }
      }
    }
  }

  // Search for statement period header: e.g. "Account statement for the period from 01-Apr-26 to 17-Sep-26"
  let periodStartDate: Date | null = null;
  for (const r of rows) {
    const s = r.spaced;
    const pm = s.match(/(?:period\s+from|from)\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})/i) ||
               s.match(/(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s+to\s+\d{1,2}-[A-Za-z]{3}-\d{2,4}/i);
    if (pm) {
      periodStartDate = parseDate(pm[1]);
      break;
    }
  }

  for (const row of rows) {
    for (const key of ["spaced", "tight"] as const) {
      const s = row[key].replace(/[\r\n]+/g, " ").trim();
      if (/^Document.?No/i.test(s) || /^Line\s*Items/i.test(s)) continue;

      // 1. Check for Opening Balance in SAP Statement (e.g. "Opening Balance Cr -3,34,72,674.49")
      const hasOpeningText = /Opening\s*Balance/i.test(s) || row.cells.some((c) => /Opening\s*Balance/i.test(c));
      if (hasOpeningText && !openBal) {
        let side: "Dr" | "Cr" = "Cr"; // Default for vendor ledger in buyer's statement is Cr (payable liability)
        if (/\bDr\b/i.test(s) || row.cells.some((c) => /^\s*Dr\s*$/i.test(c))) {
          side = "Dr";
        } else if (/\bCr\b/i.test(s) || row.cells.some((c) => /^\s*Cr\s*$/i.test(c))) {
          side = "Cr";
        }

        let amt = 0;
        const matches = s.match(/[-]?\s*[\d,]+(?:\.\d{2})/g) || [];
        for (const cand of matches) {
          const cleanCand = cand.replace(/\s+/g, "");
          const parsed = Math.abs(parseNumber(cleanCand));
          if (parsed > 0) {
            amt = parsed;
            if (cleanCand.startsWith("-") && !/\bDr\b/i.test(s)) {
              side = "Cr";
            }
            break;
          }
        }

        if (amt === 0) {
          for (const cell of row.cells) {
            const cleanCell = cell.replace(/\s+/g, "");
            if (/^[-]?[\d,]+\.\d{2}$/.test(cleanCell)) {
              const parsed = Math.abs(parseNumber(cleanCell));
              if (parsed > 0) {
                amt = parsed;
                if (cleanCell.startsWith("-") && !/\bDr\b/i.test(s)) {
                  side = "Cr";
                }
                break;
              }
            }
          }
        }

        if (amt > 0) {
          const dm = s.match(/(\d{1,2}-[A-Za-z]{3}-\d{2,4})/);
          const opDate = dm ? parseDate(dm[1]) : (periodStartDate || null);

          openBal = { side, amount: amt, count: 1, date: opDate };
          buyerRows.push({
            id: `b-pdf-open-${rowId++}`,
            docNo: "OPENING",
            date: opDate,
            postingDate: opDate,
            ref: "Opening Balance",
            docType: "SA",
            ind: side,
            amount: amt,
            signed: (side === "Cr" ? -1 : 1) * amt,
            tds: 0,
            desc: "Opening Balance",
            type: "Opening Balance",
            _page: row.page,
            _rawText: s,
          });
          break;
        }
      }

      // 2. Check for Closing Balance in SAP Statement
      const hasClosingText = /Closing\s*Balance/i.test(s) || row.cells.some((c) => /Closing\s*Balance/i.test(c));
      if (hasClosingText && !closing) {
        let side: "Dr" | "Cr" = "Cr";
        if (/\bDr\b/i.test(s) || row.cells.some((c) => /^\s*Dr\s*$/i.test(c))) {
          side = "Dr";
        } else if (/\bCr\b/i.test(s) || row.cells.some((c) => /^\s*Cr\s*$/i.test(c))) {
          side = "Cr";
        }

        let amt = 0;
        const matches = s.match(/[-]?\s*[\d,]+(?:\.\d{2})/g) || [];
        for (const cand of matches) {
          const cleanCand = cand.replace(/\s+/g, "");
          const parsed = Math.abs(parseNumber(cleanCand));
          if (parsed > 0) {
            amt = parsed;
            if (cleanCand.startsWith("-") && !/\bDr\b/i.test(s)) {
              side = "Cr";
            }
            break;
          }
        }

        if (amt > 0) {
          closing = { side, amount: amt };
          break;
        }
      }

      // 3. Match Standard SAP Transaction Line
      const m = s.match(SAP_PDF_RE) || s.match(SAP_PDF_TIGHT_RE);
      if (!m) continue;

      const [, docNo, docDateStr, postDateStr, refStr, docType, indStr, amtStr, rest] = m;
      let paymentDoc = "";
      let tdsSec = "";
      let tdsAmt = 0;
      let itemText = "";

      const tm = rest.match(/^(\d+?)(194[A-Z])(-?[\d,]+\.\d{2})?(.*)$/);
      if (tm) {
        paymentDoc = tm[1];
        tdsSec = tm[2];
        tdsAmt = tm[3] ? parseNumber(tm[3]) : 0;
        itemText = cleanText(tm[4]);
      } else {
        const fm = rest.match(/^(\d{5,15})([A-Z].*)$/);
        if (fm) {
          paymentDoc = fm[1];
          itemText = cleanText(fm[2]);
        } else {
          itemText = cleanText(rest);
        }
      }

      const rawAmt = parseNumber(amtStr);
      const amt = Math.abs(rawAmt);
      const ind = (indStr.toUpperCase() === "DR" ? "Dr" : "Cr") as "Dr" | "Cr";
      const docDate = parseDate(docDateStr);
      const postDate = parseDate(postDateStr);

      const classification = classifyBuyerRow(docType, docNo, cleanText(refStr), tdsAmt);

      buyerRows.push({
        id: `b-pdf-${rowId++}`,
        docNo: cleanText(docNo),
        date: docDate,
        postingDate: postDate,
        ref: cleanText(refStr),
        docType: cleanText(docType),
        ind,
        amount: amt,
        signed: (ind === "Cr" ? -1 : 1) * amt,
        tds: tdsAmt,
        paymentDoc: cleanText(paymentDoc),
        tdsSec: cleanText(tdsSec),
        desc: itemText,
        type: classification.type,
        _page: row.page,
      });
      break;
    }
  }

  return { buyerRows, closing, openBal, vendorCode, vendorName };
}

/* ----------------------------------------------------
 * EXCEL / CSV PARSER ENGINE
 * ---------------------------------------------------- */
export function parseExcelWorkbook(
  buffer: ArrayBuffer,
  side: "Vendor" | "Buyer",
  fileName: string = "",
  rules: LearningRule[] = []
): ParsedFileResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const vendorRows: VendorRow[] = [];
  const buyerRows: BuyerRow[] = [];
  let openBal: any = null;
  let closeBal: any = null;
  let vendorCode = "";
  let vendorName = "";

  if (rows.length < 2) {
    return { vendorRows, buyerRows, logs: ["Empty worksheet"], warnings: [] };
  }

  // Detect Vendor Code & Name in early rows
  if (side === "Buyer") {
    for (let r = 0; r < Math.min(30, rows.length); r++) {
      const rowArr = rows[r] || [];
      const rowStr = rowArr.map((c) => String(c)).join(" ");
      const m1 = rowStr.match(/(?:Vendor|Account|Creditor)(?:\s*(?:Code|No|Number)?)?[:\s]+([A-Za-z0-9]{5,14})/i);
      if (m1 && !vendorCode) vendorCode = m1[1];
      const mName = rowStr.match(/(?:Vendor\s*Name|Account\s*Name|Party\s*Name|Name)[:\s]+([A-Za-z0-9\s.,&-]+)/i);
      if (mName && mName[1] && !vendorName) {
        const cand = cleanText(mName[1]);
        if (cand.length > 2 && !/^(Utkarsh|Doc|Page|Line|From|To|Period|Posting)/i.test(cand)) {
          vendorName = cand;
        }
      }
      const mStandalone = rowStr.match(/^(\d{8,14})\s+([A-Za-z][A-Za-z0-9\s.,&-]{2,})/);
      if (mStandalone && !vendorCode) {
        vendorCode = mStandalone[1];
        if (!vendorName) vendorName = cleanText(mStandalone[2]);
      }

      // Check cell by cell for adjacent labels
      for (let c = 0; c < rowArr.length; c++) {
        const val = String(rowArr[c] || "").trim();
        if (/^(?:Vendor|Account|Creditor)(?:\s*(?:Code|No|Number)?)?[:\s]*$/i.test(val)) {
          const nextVal = String(rowArr[c + 1] || "").trim();
          const cm = nextVal.match(/^(\d{6,14})/);
          if (cm && !vendorCode) vendorCode = cm[1];
        }
        if (/^(?:Vendor\s*Name|Party\s*Name|Account\s*Name)[:\s]*$/i.test(val)) {
          const nextVal = String(rowArr[c + 1] || "").trim();
          if (nextVal && !vendorName && !/^(Utkarsh|Doc|Page)/i.test(nextVal)) {
            vendorName = cleanText(nextVal);
          }
        }
      }
    }
  } else if (side === "Vendor") {
    // Top rows of Vendor Excel often have Vendor Name
    for (let r = 0; r < Math.min(8, rows.length); r++) {
      const val = String(rows[r]?.[0] || rows[r]?.[1] || "").trim();
      if (val && !/^(Date|Particulars|Vch|Page|Ledger|Utkarsh|Statement|Opening|Closing|From|To|\d{1,2}-)/i.test(val) && val.length > 2 && val.length < 80) {
        if (!vendorName && /[A-Za-z]/.test(val) && !/^(Debit|Credit|Balance|Total)/i.test(val)) {
          vendorName = cleanText(val);
          break;
        }
      }
    }
  }

  // Header detection
  let headerIndex = -1;
  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const rowStr = rows[r].map((c) => String(c).toLowerCase()).join(" ");
    if (side === "Vendor" && (rowStr.includes("particulars") || rowStr.includes("vch no") || rowStr.includes("date"))) {
      headerIndex = r;
      break;
    }
    if (side === "Buyer" && (rowStr.includes("doc. no") || rowStr.includes("document no") || rowStr.includes("reference"))) {
      headerIndex = r;
      break;
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const rawHeaders = rows[headerIndex].map((c) => String(c).trim());
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h.toLowerCase()] = idx;
  });

  const getCell = (row: any[], keys: string[]) => {
    for (const k of keys) {
      for (const [header, idx] of Object.entries(headerMap)) {
        if (header.includes(k)) {
          return row[idx];
        }
      }
    }
    return undefined;
  };

  const dataRows = rows.slice(headerIndex + 1);

  if (side === "Vendor") {
    let rowId = 1;
    for (const r of dataRows) {
      const particulars = cleanText(String(getCell(r, ["particular", "narrat", "desc"]) || ""));
      const vchType = cleanText(String(getCell(r, ["vch type", "voucher type", "type"]) || ""));
      const vchNo = cleanText(String(getCell(r, ["vch no", "voucher no", "doc no", "ref"]) || ""));
      const dateVal = getCell(r, ["date", "doc date", "txn date"]);
      const dcVal = String(getCell(r, ["dr/cr", "dc", "type", "d/c"]) || "").trim();
      const amountVal = getCell(r, ["amount", "debit", "credit", "net", "total"]);

      if (!particulars && !vchNo && !amountVal) continue;

      const amt = Math.abs(parseNumber(amountVal));
      if (amt === 0 && !particulars.toLowerCase().includes("opening")) continue;

      const date = parseDate(dateVal);
      const isDr = /^(dr|to|d)$/i.test(dcVal);
      const dc: "Dr" | "Cr" = isDr ? "Dr" : "Cr";

      // Classification
      const classification = classifyVendorRow(vchType, particulars, rules);

      if (classification.type === "Opening Balance" || particulars.toLowerCase().includes("opening balance")) {
        openBal = { side: dc, amount: amt, date };
      }

      vendorRows.push({
        id: `v-${rowId++}`,
        date,
        dc: classification.dc || dc,
        particulars,
        vchType,
        ref: vchNo,
        amount: amt,
        signed: ((classification.dc || dc) === "Dr" ? 1 : -1) * amt,
        type: classification.type,
      });
    }
  } else {
    // Buyer / SAP
    let rowId = 1;
    for (const r of dataRows) {
      const docNo = cleanText(String(getCell(r, ["doc. no", "document no", "doc no", "assignment", "accounting doc"]) || ""));
      const docType = cleanText(String(getCell(r, ["doc. type", "document type", "doc type", "type"]) || ""));
      const ref = cleanText(String(getCell(r, ["reference", "ref", "invoice no", "inv no"]) || ""));
      const docDateVal = getCell(r, ["doc. date", "document date", "doc date", "invoice date"]);
      const postDateVal = getCell(r, ["posting date", "post date", "entry date"]);
      const indVal = String(getCell(r, ["ind", "dr/cr", "d/c", "shkzg"]) || "").trim();
      const amountVal = getCell(r, ["amount", "amount in doc. curr.", "net amount", "total"]);
      const tdsVal = getCell(r, ["tds", "wht", "withholding tax", "tds amt"]);

      if (!docNo && !ref && !amountVal) continue;

      const amt = Math.abs(parseNumber(amountVal));
      if (amt === 0) continue;

      const date = parseDate(docDateVal);
      const postingDate = parseDate(postDateVal);
      const tds = Math.abs(parseNumber(tdsVal));

      const rowStr = Object.values(r).map((v) => String(v)).join(" ");
      const isOpening = /Opening\s*Balance/i.test(rowStr) || /Opening/i.test(ref) || /OPENING/i.test(docNo);
      if (isOpening) {
        const isCredit = /^(cr|c|h)$/i.test(indVal) || (typeof amountVal === "number" && amountVal < 0) || String(amountVal).startsWith("-") || !/^(dr|d|s)$/i.test(indVal);
        const openSide: "Dr" | "Cr" = isCredit ? "Cr" : "Dr";
        buyerRows.push({
          id: `b-${rowId++}`,
          docNo: docNo || "OPENING",
          date: date || postingDate,
          postingDate: postingDate || date,
          ref: ref || "Opening Balance",
          docType: docType || "SA",
          ind: openSide,
          amount: amt,
          signed: (openSide === "Cr" ? -1 : 1) * amt,
          tds,
          type: "Opening Balance",
        });
        continue;
      }

      const isClosing = /Closing\s*Balance/i.test(rowStr) || /Closing/i.test(ref) || /CLOSING/i.test(docNo);
      if (isClosing) {
        const isCredit = /^(cr|c|h)$/i.test(indVal) || (typeof amountVal === "number" && amountVal < 0) || String(amountVal).startsWith("-");
        const closeSide: "Dr" | "Cr" = isCredit ? "Cr" : "Dr";
        closeBal = { side: closeSide, amount: amt };
        continue;
      }

      const isCr = /^(cr|c|h)$/i.test(indVal) || /^(kr|re)$/i.test(docType);
      const ind: "Dr" | "Cr" = isCr ? "Cr" : "Dr";

      const classification = classifyBuyerRow(docType, docNo, ref, tds);
      let finalType = classification.type;
      if (finalType === "Unknown") {
        if (isCr) finalType = "Invoice";
        else if (tds > 0) finalType = "TDS";
        else if (docType.toUpperCase().includes("PAY") || /receipt|bank/i.test(docNo)) finalType = "Payment";
      }

      buyerRows.push({
        id: `b-${rowId++}`,
        docNo,
        date,
        postingDate,
        ref,
        docType,
        ind: classification.ind || ind,
        amount: amt,
        signed: ((classification.ind || ind) === "Cr" ? -1 : 1) * amt,
        tds,
        type: finalType,
      });
    }

    const opRows = buyerRows.filter((x) => x.type === "Opening Balance");
    if (opRows.length > 0) {
      const sum = opRows.reduce((s, x) => s + x.signed, 0);
      openBal = {
        side: sum < 0 ? "Cr" : "Dr",
        amount: Math.abs(sum),
        date: opRows[0].date,
        count: opRows.length,
      };
    }
  }

  return { vendorRows, buyerRows, openBal, closeBal, vendorCode, vendorName, logs: [], warnings: [] };
}

/* ----------------------------------------------------
 * UNIFIED MULTI-FORMAT FILE PARSER (PDF, XLSX, XLS, CSV)
 * ---------------------------------------------------- */
export async function parseLedgerFile(
  file: File,
  side: "Vendor" | "Buyer",
  rules: LearningRule[] = [],
  onProgress?: (msg: string) => void
): Promise<{
  vendorRows: VendorRow[];
  buyerRows: BuyerRow[];
  openBal?: any;
  closeBal?: any;
  vendorCode?: string;
  vendorName?: string;
}> {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf");
  const buffer = await file.arrayBuffer();

  if (isPdf) {
    if (onProgress) onProgress(`Extracting text from PDF (${file.name})...`);
    const visualRows = await extractPdfVisualRows(buffer, (page, total) => {
      if (onProgress) onProgress(`Reading PDF page ${page} of ${total}...`);
    });

    if (side === "Vendor") {
      if (onProgress) onProgress(`Parsing Tally general ledger line items...`);
      const { vendorRows, closing, openBal, vendorName } = parseTallyPdfRows(visualRows, rules);
      return { vendorRows, buyerRows: [], openBal, closeBal: closing, vendorName };
    } else {
      if (onProgress) onProgress(`Parsing SAP FBL1N line items...`);
      const { buyerRows, closing, openBal, vendorCode, vendorName } = parseSapPdfRows(visualRows, rules);
      return { vendorRows: [], buyerRows, openBal, closeBal: closing, vendorCode, vendorName };
    }
  } else {
    if (onProgress) onProgress(`Parsing Excel/CSV spreadsheet (${file.name})...`);
    const res = parseExcelWorkbook(buffer, side, file.name, rules);
    return res;
  }
}

/**
 * Anchor-based splitting algorithm (Rabi Jha heuristic):
 * When text is extracted from PDF or flattened statements, Tally vouchers and amounts often get
 * merged (e.g. `K/1/24-25/18515104.00`). By using SAP's clean invoice references as anchors,
 * we can cleanly isolate the exact invoice reference and remainder amount.
 */
export function refineVendorUsingAnchors(vendorRows: VendorRow[], buyerRows: BuyerRow[]): number {
  const buyerRefs = Array.from(new Set(buyerRows.map((r) => r.ref.trim()).filter(Boolean)));
  buyerRefs.sort((a, b) => b.length - a.length);

  let refinedCount = 0;
  for (const v of vendorRows) {
    if (v.type === "Opening Balance" || v.type === "Closing Balance") continue;
    const raw = v._rawText || `${v.ref}${v.amount.toFixed(2)}`;
    if (!raw) continue;

    for (const ref of buyerRefs) {
      if (ref.length < 2) continue;
      const pattern = ref
        .split("")
        .map((ch) => (/[A-Za-z0-9]/.test(ch) ? ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "[^A-Za-z0-9]*"))
        .join("");

      // Ensure boundary so a shorter ref like "112" doesn't partially match "1121"
      const re = new RegExp(pattern + "(?![A-Za-z0-9])", "gi");
      const match = re.exec(raw);
      if (!match) continue;

      const after = raw.slice(match.index + match[0].length).trim();
      const amtMatch = after.match(/^([-\(]?\s*[\d,]+(?:\.\d{1,2})?\s*\)?)/);
      if (!amtMatch) continue;

      const newAmt = Math.abs(parseNumber(amtMatch[1]));
      if (ref === v.ref && Math.abs(newAmt - v.amount) < 0.005) break;

      v.ref = ref;
      v.amount = newAmt;
      v.signed = (v.dc === "Dr" ? 1 : -1) * newAmt;
      refinedCount++;
      break;
    }
  }
  return refinedCount;
}

/**
 * Tally Journal TDS Anchor Refiner:
 * Where Journal Vouchers in Tally have TDS deducted by buyer, Tally text/PDF export
 * squishes the voucher number and TDS amount together. We use SAP TDS amounts as anchors
 * to decouple the voucher number and the exact TDS value.
 */
export function refineVendorJournalsUsingSAP(vendorRows: VendorRow[], buyerRows: BuyerRow[]): number {
  const sapTdsAmounts = buyerRows
    .filter((b) => b.tds && b.tds > 0)
    .map((b) => b.tds);

  if (sapTdsAmounts.length === 0) return 0;
  let count = 0;

  for (const v of vendorRows) {
    if (!v._rawText || !/Journal/i.test(v.vchType || "")) continue;
    for (const tds of sapTdsAmounts) {
      const tdsStr = tds.toFixed(2);
      const idx = v._rawText.lastIndexOf(tdsStr);
      if (idx > 0) {
        const before = v._rawText.slice(0, idx).trim();
        const m = before.match(/([A-Za-z0-9\/-]+)$/);
        if (m && Math.abs(v.amount - tds) > 0.01) {
          v.ref = m[1];
          v.amount = tds;
          v.signed = (v.dc === "Dr" ? 1 : -1) * tds;
          count++;
          break;
        }
      }
    }
  }
  return count;
}
