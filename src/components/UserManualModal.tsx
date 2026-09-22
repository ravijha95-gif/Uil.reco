import React, { useState, useMemo } from "react";
import {
  BookOpen,
  X,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Play,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Printer,
  Copy,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  ListFilter,
  Eye,
  LifeBuoy,
  MessageSquare,
  HelpCircle,
  Hash,
  Calculator,
  Compass,
} from "lucide-react";

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: "Basics" | "Workflow" | "Features" | "Reference";
  content: {
    summary: string;
    steps?: { title: string; desc: string; tip?: string }[];
    options?: { name: string; control: string; description: string; defaultVal?: string }[];
    subsections?: { heading: string; body: string }[];
  };
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("quick-start");
  const [copied, setCopied] = useState(false);

  const sections: ManualSection[] = useMemo(
    () => [
      {
        id: "quick-start",
        title: "1. Quick Start Workflow",
        icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
        category: "Basics",
        content: {
          summary:
            "Follow this 5-step rapid guide to perform an end-to-end ledger reconciliation in under 3 minutes.",
          steps: [
            {
              title: "Step 1: Upload or Load Demo Ledgers",
              desc: "Click 'Import Ledgers' from the header to upload your Vendor statement (e.g. Tally, Busy, or supplier PDF/Excel) and Buyer statement (SAP FBL1N export). Alternatively, click 'Load Demo Dataset' to test all features instantly with sample ledgers.",
              tip: "PDF, XLSX, XLS, and CSV formats are all supported with automated column detection.",
            },
            {
              title: "Step 2: Review Automated Matching",
              desc: "The multi-pass AI engine automatically matches transactions by Invoice Reference, Amount, Date Window, and Statutory TDS adjustments (Gross = Net + TDS). Review matched records in the 'Executive Overview' and 'Reconciliation Matrix'.",
            },
            {
              title: "Step 3: Pair Exceptions in Interactive Matcher",
              desc: "Go to the 'Interactive Matcher' tab to review remaining unmatched records side-by-side. Select a vendor item and its corresponding buyer entry to manually link them with an audit explanation.",
            },
            {
              title: "Step 4: Inspect Anomalies & Statutory Statement",
              desc: "Check the 'Anomaly Inspector' for potential duplicate bills or timing delays. Then open the 'Conclusion Statement' tab to generate the Utkarsh India Limited (UIL) statutory reconciliation statement with Cell E40 Net Difference.",
            },
            {
              title: "Step 5: Export Workbook or Print Statement",
              desc: "Click 'Export Workbook' in the top header to download the complete audit Excel workbook with multiple tabs, or press 'Print (Ctrl+P)' inside the Conclusion Statement tab to print or save a clean PDF.",
            },
          ],
        },
      },
      {
        id: "header-actions",
        title: "2. Header Bar & Global Controls",
        icon: <Layers className="w-4 h-4 text-sky-500" />,
        category: "Workflow",
        content: {
          summary:
            "The top header bar provides instant access to global file processing, system triggers, audits, and configuration.",
          options: [
            {
              name: "Load Demo Dataset",
              control: "Button (Sparkles icon)",
              description:
                "Loads pre-configured sample Tally and SAP FBL1N ledgers demonstrating complex TDS 194Q deductions, invoice timing delays, fuzzy references, and round-offs.",
            },
            {
              name: "Import Ledgers",
              control: "Button (UploadCloud icon)",
              description:
                "Opens the drag-and-drop file uploader modal. Accepts multiple files for Vendor (Tally) and Buyer (SAP). Shows the total row count badge once processed.",
            },
            {
              name: "Re-Reconcile",
              control: "Button (Play icon, Indigo)",
              description:
                "Re-runs the entire heuristic reconciliation engine from scratch using the current settings, learning rules, manual edits, and manual links.",
            },
            {
              name: "Issues Badge (Anomaly Alert)",
              control: "Pill Button (AlertTriangle, Rose/Red)",
              description:
                "Appears when discrepancies, duplicates, or timing delays are detected. Clicking directly jumps to the Anomaly Inspector tab.",
            },
            {
              name: "Export Workbook",
              control: "Button (FileSpreadsheet, Emerald)",
              description:
                "Generates a multi-sheet audit Excel file (.xlsx) containing: Executive Summary, Matched Items, Partial Matches, Unmatched Vendor, Unmatched Buyer, UIL Conclusion Statement, and Audit Logs.",
            },
            {
              name: "Feedback",
              control: "Button (LifeBuoy icon)",
              description:
                "Opens the user feedback & issue reporting dialog. Captures system metadata, issue category, severity, and creates a support record.",
            },
            {
              name: "Tickets Helpdesk",
              control: "Button with Badge (MessageSquare icon)",
              description:
                "Opens the enterprise support helpdesk where users can review submitted tickets, check resolution status, and view staff responses.",
            },
            {
              name: "Theme Switcher",
              control: "Icon Button (Sun / Moon / Compass)",
              description:
                "Cycles instantly between three workspace visual themes: Light Crisp (Clean White), Dark Slate (Eye-Safe Charcoal), and Midnight Navy (Executive Deep Blue).",
            },
            {
              name: "Settings (Sliders)",
              control: "Icon Button (Sliders icon)",
              description:
                "Opens the Engine Tolerances modal to adjust penny difference tolerance (₹), date tolerance (days), fallback windows, and show/hide tabs.",
            },
            {
              name: "Reset Session",
              control: "Icon Button (RotateCcw, Red hover)",
              description:
                "Prompts for confirmation and wipes all loaded files, session caches, and overrides from localStorage to start a fresh reconciliation.",
            },
          ],
        },
      },
      {
        id: "import-modal",
        title: "3. Importing & Parsing Ledgers",
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
        category: "Workflow",
        content: {
          summary:
            "How to ingest Vendor and Buyer files, inspect parsed columns, and handle tricky file formats.",
          steps: [
            {
              title: "1. Select File Format",
              desc: "Supported formats include Excel (.xlsx, .xls), Comma Separated Values (.csv), and PDF ledger dumps.",
            },
            {
              title: "2. Upload Vendor Statement",
              desc: "Drag and drop or browse for the vendor's ledger file under the 'Vendor / Supplier Ledger' dropzone. This represents the supplier's book of accounts (e.g. Tally Sales / Debtor statement).",
            },
            {
              title: "3. Upload Buyer Statement",
              desc: "Drag and drop or browse for the buyer's internal ledger under the 'Buyer / Company Ledger' dropzone. This corresponds to SAP FBL1N or S/4HANA Vendor Line Item Display.",
            },
            {
              title: "4. Multi-File Stacking",
              desc: "You can upload multiple files for either party (e.g. Q1, Q2, Q3 statements). The engine merges them and removes duplicate header rows automatically.",
            },
            {
              title: "5. Processing & Extraction",
              desc: "Click 'Process Ledgers'. The parser extracts Date, Reference Number, Voucher/Doc Number, Debit, Credit, Net Amount, and Balance. It also extracts opening and closing balance totals.",
              tip: "If concatenated voucher numbers exist in text dumps, anchor extraction splits them automatically.",
            },
          ],
        },
      },
      {
        id: "overview-tab",
        title: "4. Executive Overview & Balance Cards",
        icon: <CheckCircle2 className="w-4 h-4 text-indigo-500" />,
        category: "Features",
        content: {
          summary:
            "High-level financial dashboard offering a 360-degree summary of reconciliation status, ledger balances, and key discrepancy metrics.",
          options: [
            {
              name: "Reconciled Rate (%)",
              control: "Metric KPI Card",
              description:
                "Calculates the percentage of total transaction volume successfully matched across both ledgers.",
            },
            {
              name: "Matched Items Count",
              control: "Metric KPI Card",
              description:
                "Number of perfectly matched transactions (both exact ref+amt and statutory TDS adjusted). Click to filter matrix.",
            },
            {
              name: "Partial Matches Count",
              control: "Metric KPI Card",
              description:
                "Transactions where references matched but amounts differ slightly (e.g. rate differences, debit note deductions).",
            },
            {
              name: "Unmatched Items Count",
              control: "Metric KPI Card",
              description:
                "Invoices or payments existing in only one ledger. Clicking filters the matrix to inspect pending bookings.",
            },
            {
              name: "Net Discrepancy (₹)",
              control: "Metric KPI Card",
              description:
                "Total net difference in monetary value between vendor debits/credits and buyer debits/credits.",
            },
            {
              name: "General Ledger Balance Card",
              control: "Side-by-Side Balance Box",
              description:
                "Compares Vendor Opening & Closing Balances against Buyer Opening & Closing Balances, showing net ledger variance.",
            },
            {
              name: "Statutory Conclusion Banner",
              control: "Action Banner",
              description:
                "Provides 1-click navigation to the Utkarsh India Limited statutory conclusion statement with Cell E40 reconciliation.",
            },
          ],
        },
      },
      {
        id: "matrix-tab",
        title: "5. Reconciliation Matrix & Row Actions",
        icon: <ListFilter className="w-4 h-4 text-purple-500" />,
        category: "Features",
        content: {
          summary:
            "The heart of the application: an interactive, search-enabled audit grid displaying every transaction pairing with full audit trails.",
          subsections: [
            {
              heading: "Status Categories & Badges",
              body: "• Matched (Exact): Both reference and amount match within tolerance.\n• Matched (TDS Adjusted): Gross amount matches Buyer Net + Section 194Q / 194C / 194J TDS.\n• Matched (Fuzzy Ref): Alphanumeric characters match after stripping prefixes like 'INV-', 'BILL-', etc.\n• Matched (Date/Amt Heuristic): Amounts match within date tolerance window.\n• Matched (Batch 1:N): Multiple buyer payments cover one single vendor invoice.\n• Partial: References match but amounts differ.\n• Unmatched Vendor / Buyer: Exists in one ledger only.\n• Disputed / Excluded: Flagged by user for separate audit tracking.",
            },
          ],
          options: [
            {
              name: "Search Bar",
              control: "Input text",
              description: "Instantly searches by invoice number, document number, party name, or amount across both ledgers.",
            },
            {
              name: "Status Filter Tabs",
              control: "Pill Tabs",
              description: "Filter grid to show All, Matched, Partial, Unmatched, or Excluded rows.",
            },
            {
              name: "Unlink Match (🔗)",
              control: "Action Button per row",
              description: "Decouples a matched pair and sends both items back to their respective unmatched pools for manual re-pairing.",
            },
            {
              name: "Exclude / Dispute (🚫)",
              control: "Action Button per row",
              description: "Marks a line item as disputed, under litigation, or out of scope, excluding it from active discrepancy calculations.",
            },
            {
              name: "Add Exception Note",
              control: "Action Button per row",
              description: "Adds the line item to the Manual Exceptions tab with custom auditor notes for audit committee presentation.",
            },
          ],
        },
      },
      {
        id: "interactive-matcher",
        title: "6. Interactive Matcher (Manual 1:1 & 1:N)",
        icon: <Layers className="w-4 h-4 text-amber-500" />,
        category: "Features",
        content: {
          summary:
            "Dedicated workbench designed to easily connect unmatched vendor bills with buyer payments that have non-standard reference numbers.",
          steps: [
            {
              title: "Step 1: Inspect Left Pool (Vendor Items)",
              desc: "Browse through unmatched vendor records. Use the search input to locate specific invoice amounts or dates.",
            },
            {
              title: "Step 2: Inspect Right Pool (Buyer Items)",
              desc: "Browse through unmatched buyer SAP entries (invoices, clearing documents, bank transfers, or TDS debit lines).",
            },
            {
              title: "Step 3: Select Transactions to Pair",
              desc: "Click on a vendor line item to select it (highlighted in indigo). Then click on one or more buyer line items. The live difference counter updates immediately.",
            },
            {
              title: "Step 4: Check Real-Time Net Difference",
              desc: "The floating pairing bar displays the exact difference (₹) between the selected sides. If difference is ₹0.00, it confirms a clean match.",
            },
            {
              title: "Step 5: Enter Reconciliation Note & Pair",
              desc: "Type an optional reason (e.g. 'Reference typo in SAP voucher 190022') and click 'Pair Selected Items'. The paired record moves to the Matched Matrix.",
              tip: "To reverse a manual pair at any time, return to the Reconciliation Matrix and click the Unlink (🔗) icon.",
            },
          ],
        },
      },
      {
        id: "conclusion-statement",
        title: "7. Utkarsh India Limited (UIL) Conclusion Statement",
        icon: <FileCheck2 className="w-4 h-4 text-emerald-600" />,
        category: "Features",
        content: {
          summary:
            "Official statutory reconciliation statement based on Utkarsh India Limited's Cell E40 accounting standard format. Reconciles UIL closing balance to Supplier closing balance.",
          subsections: [
            {
              heading: "Cell E40 Mathematical Formula",
              body: "Subtotal = Closing Bal UIL (E9) + Invoice booking pending at UIL (E14) + TDS debited by UIL not supplier (E18) - TDS credited by supplier not UIL (E20) + Payment made by UIL not supplier (E23) - Payment not made by UIL but credited by supplier (E27) - Invoice credited by UIL but not issued by supplier (E30) + Opening balance difference (E34) - Rounding off difference (E36).\n\nNet Difference (Cell E40) = Subtotal - Closing Balance as per Supplier (E38).",
            },
          ],
          options: [
            {
              name: "Vendor Code & Vendor Name",
              control: "Editable Inputs with Clear (✕) buttons",
              description:
                "Displays the SAP Vendor Account Code and Party Legal Name. You can freely type custom names or click the ✕ button to wipe existing text.",
            },
            {
              name: "Statement & Opening Dates",
              control: "Date Pickers",
              description:
                "Sets the statement reconciliation cut-off date (e.g. 31/03/2025) and opening comparison date (e.g. 01/04/2024).",
            },
            {
              name: "Editable Particulars & Row Notes",
              control: "Inline Note Fields for each row",
              description:
                "Every statutory line (TDS, pending invoices, opening diff, etc.) contains an editable note input. Default is blank so you can type company-specific references.",
            },
            {
              name: "Override Statutory Line Amounts",
              control: "Clickable Amount Fields",
              description:
                "Allows accountants to override any calculated row value with specific manual agreed amounts.",
            },
            {
              name: "Absorb Round-Off (< ₹10)",
              control: "1-Click Button",
              description:
                "When Net Difference is under ₹10, this button appears next to Cell E40, allowing you to absorb the penny gap into Cell E36 with zero net difference.",
            },
            {
              name: "Print (Ctrl+P)",
              control: "Button (Printer icon, Amber)",
              description:
                "Launches the browser print dialog with print-isolated CSS (@media print). Only the statement document is rendered, hiding all application headers and navigation.",
            },
            {
              name: "Statement Preview",
              control: "Button (ExternalLink icon)",
              description: "Opens a full-screen, printable preview modal of the statement.",
            },
            {
              name: "Export Statement (Excel)",
              control: "Button (FileSpreadsheet icon)",
              description:
                "Downloads the official UIL Reconciliation Statement formatted into a single Excel worksheet (.xlsx).",
            },
          ],
        },
      },
      {
        id: "anomalies-tab",
        title: "8. Anomaly Inspector & Audit Scanner",
        icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
        category: "Features",
        content: {
          summary:
            "Automated audit scanner that detects potential fraud, double billing, rate gaps, and delayed payments before signing off.",
          options: [
            {
              name: "Duplicate Invoices Check",
              control: "Audit Rule",
              description:
                "Flags transactions having identical invoice numbers and identical amounts booked multiple times.",
            },
            {
              name: "Payment Aging & Timing Delays",
              control: "Audit Rule",
              description:
                "Identifies invoices where payment clearing took more than 45 days, highlighting potential MSME compliance violations.",
            },
            {
              name: "Minor Penny & Round-Off Gaps",
              control: "Audit Rule + 1-Click Action",
              description:
                "Finds matches with differences < ₹5.00 and provides an 'Approve Round-Off' button to write off the gap directly.",
            },
            {
              name: "TDS Rate Mismatch",
              control: "Audit Rule",
              description:
                "Detects differences between standard Section 194Q rates (0.1%) vs custom contract withholding rates.",
            },
          ],
        },
      },
      {
        id: "parsed-editor",
        title: "9. Parsed Ledgers & Live Inline Editor",
        icon: <Sliders className="w-4 h-4 text-indigo-600" />,
        category: "Features",
        content: {
          summary:
            "Inspect raw extracted ledger lines side-by-side and edit any misread invoice reference, date, or amount without touching the original source file.",
          steps: [
            {
              title: "1. View Split Columns",
              desc: "The left table displays Vendor records and the right table displays Buyer SAP records.",
            },
            {
              title: "2. Inline Edit Fields",
              desc: "Click directly on any Date, Ref No, Particulars, or Amount field to correct OCR or OCR/PDF parsing artifacts.",
            },
            {
              title: "3. Quick Rule Creation",
              desc: "Click 'Add Rule' next to a row to automatically generate an alphanumeric prefix-stripping rule for similar voucher types.",
            },
            {
              title: "4. Apply Edits & Reconcile",
              desc: "Click 'Apply Edits & Reconcile' (which shows your edit count badge). The system re-executes matching with your revised values.",
            },
            {
              title: "5. Revert Changes",
              desc: "Click 'Revert All Edits' to restore the parsed dataset back to the original uploaded files.",
            },
          ],
        },
      },
      {
        id: "settings-tolerances",
        title: "10. Engine Settings & Tolerances",
        icon: <Sliders className="w-4 h-4 text-slate-700" />,
        category: "Reference",
        content: {
          summary:
            "Fine-tune the mathematical parameters and heuristic windows of the reconciliation engine.",
          options: [
            {
              name: "Amount Match Tolerance (₹)",
              control: "Number input (default: ₹2.00)",
              description:
                "Permissible penny difference to still treat an invoice as an exact match (e.g. ₹10,000.50 vs ₹10,000.00).",
            },
            {
              name: "Strict Date Tolerance (Days)",
              control: "Number input (default: 15 days)",
              description:
                "Acceptable transit window between vendor invoice issue date and buyer SAP goods receipt/booking date.",
            },
            {
              name: "Fallback Proximity Window (Days)",
              control: "Number input (default: 60 days)",
              description:
                "Maximum days gap allowed during heuristic fallback matching when invoice references do not strictly match.",
            },
            {
              name: "Auto Round-off Limit (₹)",
              control: "Number input (default: ₹5.00)",
              description:
                "Discrepancies below this amount trigger the 1-click round-off write-off suggestion.",
            },
            {
              name: "Batch / Split Payment Matching",
              control: "Toggle Switch (default: ON)",
              description:
                "Enables combinatorial checking to detect when 1 buyer bank clearing document pays 2 or more vendor bills simultaneously.",
            },
            {
              name: "Navigation Panels Visibility",
              control: "Toggle Switches",
              description:
                "Show or hide the 'Learning Rules' and 'Manual Exceptions' tabs in the top navigation bar to keep the workspace simple or advanced.",
            },
          ],
        },
      },
      {
        id: "faq-troubleshooting",
        title: "11. Troubleshooting & FAQs",
        icon: <HelpCircle className="w-4 h-4 text-amber-500" />,
        category: "Reference",
        content: {
          summary: "Common accounting questions and quick resolutions.",
          subsections: [
            {
              heading: "Why does an invoice show 'Matched (TDS Adjusted)'?",
              body: "Under Indian Income Tax Section 194Q, buyers deduct 0.1% TDS on purchases exceeding ₹50 Lakhs. If Vendor bills ₹1,00,000 and Buyer credits ₹99,900 along with ₹100 TDS debit, the engine automatically reconciles the gross invoice against net credit + TDS.",
            },
            {
              heading: "What if my Tally invoice number has a prefix like 'INV/2024-25/088' and SAP has '88'?",
              body: "The engine's normalization layer automatically strips non-alphanumeric punctuation and leading zeros. If they still don't pair, add a prefix stripping rule in the 'Learning Rules' tab or pair them once in the 'Interactive Matcher'.",
            },
            {
              heading: "Will my progress be lost if I refresh the browser?",
              body: "No. The application auto-saves all uploaded ledgers, manual links, row notes, and conclusion overrides to your browser's persistent storage (localStorage). You will see the green 'Session Saved' badge in the header.",
            },
            {
              heading: "How do I print the statement without browser headers and footers?",
              body: "Click 'Print (Ctrl+P)' in the Conclusion Statement tab. In the print dialog, uncheck 'Headers and footers' under More Settings to get a clean, official branded report.",
            },
          ],
        },
      },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(q);
      const matchSummary = sec.content.summary.toLowerCase().includes(q);
      const matchSteps = sec.content.steps?.some(
        (s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
      );
      const matchOptions = sec.content.options?.some(
        (o) => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q)
      );
      const matchSub = sec.content.subsections?.some(
        (sub) => sub.heading.toLowerCase().includes(q) || sub.body.toLowerCase().includes(q)
      );
      return matchTitle || matchSummary || matchSteps || matchOptions || matchSub;
    });
  }, [sections, searchQuery]);

  const activeSection = useMemo(() => {
    return (
      sections.find((s) => s.id === selectedSectionId) ||
      filteredSections[0] ||
      sections[0]
    );
  }, [sections, selectedSectionId, filteredSections]);

  if (!isOpen) return null;

  const handlePrintManual = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    let md = `# Vendor Reconciliation Engine (Ai.1) - Complete User Manual\n\n`;
    sections.forEach((sec) => {
      md += `## ${sec.title}\n\n${sec.content.summary}\n\n`;
      if (sec.content.steps) {
        sec.content.steps.forEach((st, idx) => {
          md += `### ${st.title}\n${st.desc}\n\n`;
        });
      }
      if (sec.content.options) {
        md += `### Options & Controls\n`;
        sec.content.options.forEach((opt) => {
          md += `- **${opt.name}** (${opt.control}): ${opt.description}\n`;
        });
        md += `\n`;
      }
      if (sec.content.subsections) {
        sec.content.subsections.forEach((sub) => {
          md += `### ${sub.heading}\n${sub.body}\n\n`;
        });
      }
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Vendor Reconciliation Engine — User Manual & Operations Guide
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Version Ai.1
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step-by-step operating procedures, options directory, statutory UIL formulas, and audit guidelines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Copy entire manual text in Markdown format for external documentation"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied Markdown!" : "Copy Markdown"}
            </button>

            <button
              onClick={handlePrintManual}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
              title="Print user manual"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user manual (e.g. 'TDS', 'Cell E40', 'Unlink', 'Export', 'Tolerance', 'Date Window')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono shrink-0">
            {filteredSections.length} sections found
          </span>
        </div>

        {/* Body Split: Sidebar + Main Viewer */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Topics */}
          <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto p-3 space-y-1 shrink-0">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Manual Directory
            </div>
            {filteredSections.map((sec) => {
              const isSelected = activeSection.id === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className={isSelected ? "text-white" : ""}>{sec.icon}</span>
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right Main Content Viewer */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200">
            {/* Active Section Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {activeSection.icon}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeSection.title}
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
                {activeSection.content.summary}
              </p>
            </div>

            {/* Steps (if available) */}
            {activeSection.content.steps && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Step-by-Step Instructions
                </h3>
                <div className="space-y-3">
                  {activeSection.content.steps.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          {st.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                        {st.desc}
                      </p>
                      {st.tip && (
                        <div className="ml-7 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                          💡 <strong>Pro-Tip:</strong> {st.tip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options Table (if available) */}
            {activeSection.content.options && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Options, Buttons & Controls Directory
                </h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 w-1/4">Option / Feature</th>
                        <th className="py-2.5 px-4 w-1/4">Control Type</th>
                        <th className="py-2.5 px-4">Function & How to Use</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {activeSection.content.options.map((opt, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {opt.name}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                            {opt.control}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                            {opt.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subsections (if available) */}
            {activeSection.content.subsections && (
              <div className="space-y-4">
                {activeSection.content.subsections.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
                  >
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-500" />
                      {sub.heading}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                      {sub.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Vendor Reconciliation Engine Ai.1
            </span>
            <span>•</span>
            <span>Created by Rabi Jha</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
