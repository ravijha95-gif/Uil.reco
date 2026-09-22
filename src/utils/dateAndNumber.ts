const MONTHS_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function cleanText(s: unknown): string {
  return String(s ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fixYear(y: number): number {
  if (y < 100) return y + 2000;
  if (y < 1000) return Math.floor(y / 10) + 2000;
  return y;
}

export function parseDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // Excel serial date offset (25569 days between 1900 and 1970)
    if (v > 20000 && v < 60000) {
      return new Date(Math.round((v - 25569) * 86400 * 1000));
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  const s = cleanText(v).replace(/\//g, "-").replace(/\./g, "-");

  // Format: 25-May-24 or 25-May-2024
  const mAlpha = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (mAlpha) {
    const monthKey = mAlpha[2].toLowerCase();
    if (monthKey in MONTHS_MAP) {
      const year = fixYear(+mAlpha[3]);
      return new Date(year, MONTHS_MAP[monthKey], +mAlpha[1]);
    }
  }

  // Format: DD-MM-YYYY or DD-MM-YY
  const mNum = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (mNum) {
    const year = fixYear(+mNum[3]);
    const month = +mNum[2] - 1;
    const day = +mNum[1];
    return new Date(year, month, day);
  }

  // ISO or standard JS Date parsing
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function toDate(x: unknown): Date | null {
  return parseDate(x);
}

export function dateGapDays(a: unknown, b: unknown): number | null {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (!d1 || !d2) return null;
  return Math.round(Math.abs(d1.getTime() - d2.getTime()) / 86400000);
}

export function formatDateShort(d: unknown): string {
  const date = parseDate(d);
  if (!date) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_ABBR[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function formatDateFull(d: unknown): string {
  const date = parseDate(d);
  if (!date) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_ABBR[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function toIsoDateString(d: unknown): string {
  const date = parseDate(d);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseNumber(v: unknown): number {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  const s = cleanText(v);
  if (!s) return 0;
  const isNegative = /^\(.*\)$/.test(s) || /^-/.test(s) || /CR$/i.test(s);
  const cleaned = s.replace(/[₹,\s()]/g, "").replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
}

export function formatCurrency(n: number | null | undefined, includeSymbol: boolean = true): string {
  if (n == null || isNaN(n)) return includeSymbol ? "₹0.00" : "0.00";
  const absVal = Math.abs(n);
  const formatted = absVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = includeSymbol ? "₹" : "";
  return n < 0 ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

export function formatSignedCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "₹0.00";
  if (n > 0) return `+${formatCurrency(n)}`;
  if (n < 0) return `-${formatCurrency(Math.abs(n))}`;
  return "₹0.00";
}

export function isMeaningfulRef(s: unknown): boolean {
  if (!s || typeof s !== "string") return false;
  const clean = cleanText(s).toUpperCase();
  if (!clean) return false;
  if (/^[-—._/\\*#]+$/.test(clean)) return false;
  if (/^(NA|N\/A|N\.A\.|NONE|NULL|NIL|NOT\s*AVAILABLE|UNKNOWN|NO\s*REF)$/i.test(clean)) return false;
  const alphanumeric = clean.replace(/[^A-Z0-9]/g, "");
  if (alphanumeric.length < 1) return false;
  return true;
}

export function normalizeReference(s: unknown): string {
  return cleanText(s).toUpperCase().replace(/\s+/g, "");
}

export function looseReference(s: unknown): string {
  return cleanText(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractReferenceTokens(s: unknown): string[] {
  const clean = cleanText(s).toUpperCase();
  // Split by slashes, dashes, spaces
  const parts = clean.split(/[\/\s\-_.]+/).filter((p) => p.length >= 2);
  return parts;
}

export function getReferenceTail(s: unknown): string {
  const norm = normalizeReference(s);
  const parts = norm.split(/[\/\-_]/);
  // Pick the last segment that is not a 2-digit financial year
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p && !/^\d{2}-\d{2}$/.test(p) && !/^\d{4}$/.test(p)) {
      return p;
    }
  }
  return parts[parts.length - 1] || norm;
}
