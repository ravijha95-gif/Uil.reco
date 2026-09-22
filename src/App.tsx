import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "./components/Header";
import { MetricCards } from "./components/MetricCards";
import { BalanceReconciliationCard } from "./components/BalanceReconciliationCard";
import { ReconcileTable } from "./components/ReconcileTable";
import { InteractiveMatcher } from "./components/InteractiveMatcher";
import { AnomalyInspector } from "./components/AnomalyInspector";
import { DataImportModal } from "./components/DataImportModal";
import { ParsedDataEditor } from "./components/ParsedDataEditor";
import { RulesManager } from "./components/RulesManager";
import { ManualExceptionsModal } from "./components/ManualExceptionsModal";
import { SettingsModal } from "./components/SettingsModal";
import { FeedbackModal } from "./components/FeedbackModal";
import { TicketHelpdeskModal } from "./components/TicketHelpdeskModal";
import { ConclusionPanel } from "./components/ConclusionPanel";
import { UserManualModal } from "./components/UserManualModal";

import {
  AnomalyItem,
  AppTheme,
  BuyerRow,
  ConclusionStatementData,
  LearningRule,
  ManualException,
  MatchSettings,
  ReconcileItem,
  VendorRow,
} from "./types";
import { getDemoData } from "./data/demoData";
import {
  parseLedgerFile,
  refineVendorUsingAnchors,
  refineVendorJournalsUsingSAP,
} from "./utils/parsers";
import { runReconciliation } from "./utils/reconciliationEngine";
import { exportReconciliationFull } from "./utils/excelExport";
import { formatDateShort } from "./utils/dateAndNumber";
import {
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  FileCheck2,
  BookOpen,
} from "lucide-react";

// Helpers to re-hydrate Date objects from localStorage JSON
function hydrateVendorRows(raw: any[]): VendorRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    ...r,
    date: r.date ? new Date(r.date) : null,
  }));
}

function hydrateBuyerRows(raw: any[]): BuyerRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    ...r,
    date: r.date ? new Date(r.date) : null,
  }));
}

export default function App() {
  // 1. Core State with Persistent Local Storage Recovery
  const [vendorRows, setVendorRows] = useState<VendorRow[]>(() => {
    try {
      const saved = localStorage.getItem("vr_session_vendor_rows_v15");
      return saved ? hydrateVendorRows(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [buyerRows, setBuyerRows] = useState<BuyerRow[]>(() => {
    try {
      const saved = localStorage.getItem("vr_session_buyer_rows_v15");
      return saved ? hydrateBuyerRows(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [vendorFiles, setVendorFiles] = useState<File[]>([]);
  const [buyerFiles, setBuyerFiles] = useState<File[]>([]);

  const [manualLinks, setManualLinks] = useState<
    Array<{ vendorId: string | number; buyerId: string | number; note?: string }>
  >(() => {
    try {
      const saved = localStorage.getItem("vr_session_manual_links_v15");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [manualExceptions, setManualExceptions] = useState<ManualException[]>(() => {
    try {
      const saved = localStorage.getItem("vr_session_manual_exceptions_v15");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [storedTotals, setStoredTotals] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("vr_session_stored_totals_v15");
      return saved
        ? JSON.parse(saved)
        : {
            vendorOpen: null,
            buyerOpen: null,
            vendorClose: null,
            buyerClose: null,
          };
    } catch {
      return {
        vendorOpen: null,
        buyerOpen: null,
        vendorClose: null,
        buyerClose: null,
      };
    }
  });

  const [conclusionOverrides, setConclusionOverrides] = useState<Partial<ConclusionStatementData> | null>(() => {
    try {
      const saved = localStorage.getItem("vr_session_conclusion_overrides_v15");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (conclusionOverrides) {
        localStorage.setItem("vr_session_conclusion_overrides_v15", JSON.stringify(conclusionOverrides));
      } else {
        localStorage.removeItem("vr_session_conclusion_overrides_v15");
      }
    } catch {}
  }, [conclusionOverrides]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem("vr_session_active_tab_v15") || "overview";
    } catch {
      return "overview";
    }
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<string>("");
  const [editCount, setEditCount] = useState<number>(0);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [ticketCount, setTicketCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("vr_feedback_tickets_v1");
      return saved ? JSON.parse(saved).length : 0;
    } catch {
      return 0;
    }
  });

  const refreshTicketCount = useCallback(() => {
    try {
      const saved = localStorage.getItem("vr_feedback_tickets_v1");
      setTicketCount(saved ? JSON.parse(saved).length : 0);
    } catch {
      setTicketCount(0);
    }
  }, []);

  const [importError, setImportError] = useState<string | null>(null);

  // Session Auto-Save Effects
  useEffect(() => {
    try {
      if (vendorRows.length > 0) {
        localStorage.setItem("vr_session_vendor_rows_v15", JSON.stringify(vendorRows));
      } else {
        localStorage.removeItem("vr_session_vendor_rows_v15");
      }
    } catch (e) {
      console.warn("Could not save vendor rows to storage", e);
    }
  }, [vendorRows]);

  useEffect(() => {
    try {
      if (buyerRows.length > 0) {
        localStorage.setItem("vr_session_buyer_rows_v15", JSON.stringify(buyerRows));
      } else {
        localStorage.removeItem("vr_session_buyer_rows_v15");
      }
    } catch (e) {
      console.warn("Could not save buyer rows to storage", e);
    }
  }, [buyerRows]);

  useEffect(() => {
    try {
      localStorage.setItem("vr_session_manual_links_v15", JSON.stringify(manualLinks));
    } catch {}
  }, [manualLinks]);

  useEffect(() => {
    try {
      localStorage.setItem("vr_session_manual_exceptions_v15", JSON.stringify(manualExceptions));
    } catch {}
  }, [manualExceptions]);

  useEffect(() => {
    try {
      localStorage.setItem("vr_session_stored_totals_v15", JSON.stringify(storedTotals));
    } catch {}
  }, [storedTotals]);

  useEffect(() => {
    try {
      localStorage.setItem("vr_session_active_tab_v15", activeTab);
    } catch {}
  }, [activeTab]);

  // Settings & Rules from localStorage
  const [matchSettings, setMatchSettings] = useState<MatchSettings>(() => {
    try {
      const saved = localStorage.getItem("vr_settings_v15");
      return saved
        ? {
            amtTol: 2.0,
            dateTol: 15,
            fallbackWindow: 60,
            autoRoundOffLimit: 5.0,
            allowBatchMatching: true,
            showLearningTab: true,
            showExclusionsTab: true,
            theme: "light" as AppTheme,
            ...JSON.parse(saved),
          }
        : {
            amtTol: 2.0,
            dateTol: 15,
            fallbackWindow: 60,
            autoRoundOffLimit: 5.0,
            allowBatchMatching: true,
            showLearningTab: true,
            showExclusionsTab: true,
            theme: "light" as AppTheme,
          };
    } catch {
      return {
        amtTol: 2.0,
        dateTol: 15,
        fallbackWindow: 60,
        autoRoundOffLimit: 5.0,
        allowBatchMatching: true,
        showLearningTab: true,
        showExclusionsTab: true,
        theme: "light" as AppTheme,
      };
    }
  });

  const [rules, setRules] = useState<LearningRule[]>(() => {
    try {
      const saved = localStorage.getItem("vr_rules_v15");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reconNotice, setReconNotice] = useState<string | null>(null);
  const [reconTriggerCount, setReconTriggerCount] = useState<number>(0);

  // Sync theme to document element
  useEffect(() => {
    const currentTheme = matchSettings.theme || "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    if (currentTheme === "dark" || currentTheme === "navy") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [matchSettings.theme]);

  // Adjust active tab if a hidden panel was selected
  useEffect(() => {
    if (matchSettings.showLearningTab === false && activeTab === "rules") {
      setActiveTab("overview");
    }
    if (matchSettings.showExclusionsTab === false && activeTab === "exceptions") {
      setActiveTab("overview");
    }
  }, [matchSettings.showLearningTab, matchSettings.showExclusionsTab, activeTab]);

  const handleCycleTheme = useCallback(() => {
    setMatchSettings((prev) => {
      const current = prev.theme || "light";
      const next: AppTheme = current === "light" ? "dark" : current === "dark" ? "navy" : "light";
      return { ...prev, theme: next };
    });
  }, []);

  // Save rules & settings changes
  useEffect(() => {
    try {
      localStorage.setItem("vr_settings_v15", JSON.stringify(matchSettings));
    } catch {}
  }, [matchSettings]);

  useEffect(() => {
    try {
      localStorage.setItem("vr_rules_v15", JSON.stringify(rules));
    } catch {}
  }, [rules]);

  // 2. Reconciliation Result Memo
  const reconResult = useMemo(() => {
    return runReconciliation(
      vendorRows,
      buyerRows,
      matchSettings,
      manualLinks,
      storedTotals
    );
  }, [vendorRows, buyerRows, matchSettings, manualLinks, storedTotals, reconTriggerCount]);

  // Unmatched items for Interactive Matcher
  const unmatchedVendor = useMemo(() => {
    const pairedVendorIds = new Set<string | number>();
    reconResult.items.forEach((x) => {
      if (x.status.startsWith("Matched") || x.status.startsWith("Partial")) {
        if (x.a?.id) pairedVendorIds.add(x.a.id);
        x.extraVendorRows?.forEach((ev) => pairedVendorIds.add(ev.id));
      }
    });
    return vendorRows.filter(
      (v) =>
        v.type !== "Opening Balance" &&
        v.type !== "Closing Balance" &&
        !v.excluded &&
        !pairedVendorIds.has(v.id)
    );
  }, [vendorRows, reconResult.items]);

  const unmatchedBuyer = useMemo(() => {
    const pairedBuyerIds = new Set<string | number>();
    reconResult.items.forEach((x) => {
      if (x.status.startsWith("Matched") || x.status.startsWith("Partial")) {
        if (x.b?.id) pairedBuyerIds.add(x.b.id);
        x.extraBuyerRows?.forEach((eb) => pairedBuyerIds.add(eb.id));
      }
    });
    return buyerRows.filter(
      (b) =>
        b.type !== "Opening Balance" &&
        b.type !== "Closing Balance" &&
        !b.excluded &&
        !pairedBuyerIds.has(b.id)
    );
  }, [buyerRows, reconResult.items]);

  // 3. Load Demo Dataset
  const handleLoadDemo = useCallback(() => {
    setIsProcessing(true);
    const demo = getDemoData();

    // Refine vendor rows using SAP references as anchors
    refineVendorUsingAnchors(demo.vendorRows, demo.buyerRows);
    refineVendorJournalsUsingSAP(demo.vendorRows, demo.buyerRows);

    setVendorRows(demo.vendorRows);
    setBuyerRows(demo.buyerRows);
    setStoredTotals({
      vendorOpen: demo.vendorOpen,
      buyerOpen: demo.buyerOpen,
      vendorClose: demo.vendorClose,
      buyerClose: demo.buyerClose,
      vendorCode: demo.vendorCode || "1200001029",
      vendorName: demo.vendorName || "Rohan Enterprises",
    });
    setManualLinks([]);
    setEditCount(0);
    setIsProcessing(false);
    setActiveTab("overview");
  }, []);

  // 4. Process Uploaded Files
  const handleProcessFiles = async () => {
    if (vendorFiles.length === 0 || buyerFiles.length === 0) return;
    setIsProcessing(true);
    setImportError(null);
    setProcessingProgress("Preparing statement files...");

    try {
      let allVendorRows: VendorRow[] = [];
      let allBuyerRows: BuyerRow[] = [];
      let vOpen: any = null;
      let bOpen: any = null;
      let vClose: any = null;
      let bClose: any = null;
      let bVendorCode = "";
      let bVendorName = "";
      let vVendorName = "";

      for (let i = 0; i < vendorFiles.length; i++) {
        const file = vendorFiles[i];
        setProcessingProgress(`Parsing Vendor Statement (${i + 1}/${vendorFiles.length}): ${file.name}...`);
        const res = await parseLedgerFile(file, "Vendor", rules, (msg) => setProcessingProgress(msg));
        allVendorRows.push(...res.vendorRows);
        if (res.openBal && !vOpen) vOpen = res.openBal;
        if (res.closeBal && !vClose) vClose = res.closeBal;
        if (res.vendorName && !vVendorName) vVendorName = res.vendorName;
      }

      for (let i = 0; i < buyerFiles.length; i++) {
        const file = buyerFiles[i];
        setProcessingProgress(`Parsing Buyer / SAP Statement (${i + 1}/${buyerFiles.length}): ${file.name}...`);
        const res = await parseLedgerFile(file, "Buyer", rules, (msg) => setProcessingProgress(msg));
        allBuyerRows.push(...res.buyerRows);
        if (res.openBal && !bOpen) bOpen = res.openBal;
        if (res.closeBal && !bClose) bClose = res.closeBal;
        if (res.vendorCode && !bVendorCode) bVendorCode = res.vendorCode;
        if (res.vendorName && !bVendorName) bVendorName = res.vendorName;
      }

      // Anchor Refinements
      setProcessingProgress("Decoupling voucher references using SAP anchors...");
      refineVendorUsingAnchors(allVendorRows, allBuyerRows);
      refineVendorJournalsUsingSAP(allVendorRows, allBuyerRows);

      setVendorRows(allVendorRows);
      setBuyerRows(allBuyerRows);
      setStoredTotals({
        vendorOpen: vOpen,
        buyerOpen: bOpen,
        vendorClose: vClose,
        buyerClose: bClose,
        vendorCode: bVendorCode || undefined,
        vendorName: bVendorName || vVendorName || undefined,
      });
      // Reset conclusion overrides on new file upload so newly parsed vendor and amounts populate cleanly
      setConclusionOverrides(null);
      try {
        localStorage.removeItem("vr_session_conclusion_overrides_v15");
      } catch {}
      setManualLinks([]);
      setEditCount(0);
      setIsImportOpen(false);
      setActiveTab("overview");
    } catch (e: any) {
      console.error("File processing error", e);
      setImportError(e?.message || "Failed to process statements. Please verify the files are valid Tally/SAP/Excel statements.");
    } finally {
      setIsProcessing(false);
      setProcessingProgress("");
    }
  };

  // 5. Manual Pairing & Linking (Supports 1-to-1, Many-to-1, 1-to-Many, and Many-to-Many)
  const handleManualPair = (
    vendorId: (string | number) | (string | number)[],
    buyerId: (string | number) | (string | number)[],
    note: string
  ) => {
    const vIds = Array.isArray(vendorId) ? vendorId : [vendorId];
    const bIds = Array.isArray(buyerId) ? buyerId : [buyerId];

    setManualLinks((prev) => [
      ...prev,
      {
        vendorId: vIds[0],
        vendorIds: vIds,
        buyerId: bIds[0],
        buyerIds: bIds,
        note,
      },
    ]);
  };

  const handleUnlink = (itemId: string) => {
    const item = reconResult.items.find((x) => x.id === itemId);
    if (!item) return;

    const vIdsToMatch = [item.a?.id, ...(item.extraVendorRows?.map((x) => x.id) || [])].filter(
      (id): id is string | number => id !== undefined
    );
    const bIdsToMatch = [item.b?.id, ...(item.extraBuyerRows?.map((x) => x.id) || [])].filter(
      (id): id is string | number => id !== undefined
    );

    setManualLinks((prev) =>
      prev.filter((link) => {
        const linkVIds = link.vendorIds && link.vendorIds.length > 0 ? link.vendorIds : [link.vendorId];
        const linkBIds = link.buyerIds && link.buyerIds.length > 0 ? link.buyerIds : [link.buyerId];

        const vMatches = linkVIds.some((id) => vIdsToMatch.includes(id));
        const bMatches = linkBIds.some((id) => bIdsToMatch.includes(id));
        return !(vMatches && bMatches);
      })
    );
  };

  // Exclusion & Restoration
  const handleExcludeItem = (item: ReconcileItem, reason?: string) => {
    const defaultReason = reason || "Excluded from reconciliation by user";
    if (item.a) {
      setVendorRows((prev) =>
        prev.map((v) =>
          v.id === item.a?.id
            ? { ...v, excluded: true, exclusionReason: defaultReason, _edited: true }
            : v
        )
      );
    }
    if (item.b) {
      setBuyerRows((prev) =>
        prev.map((b) =>
          b.id === item.b?.id
            ? { ...b, excluded: true, exclusionReason: defaultReason, _edited: true }
            : b
        )
      );
    }
    if (item.extraVendorRows) {
      const extraIds = new Set(item.extraVendorRows.map((x) => x.id));
      setVendorRows((prev) =>
        prev.map((v) =>
          extraIds.has(v.id)
            ? { ...v, excluded: true, exclusionReason: defaultReason, _edited: true }
            : v
        )
      );
    }
    if (item.extraBuyerRows) {
      const extraIds = new Set(item.extraBuyerRows.map((x) => x.id));
      setBuyerRows((prev) =>
        prev.map((b) =>
          extraIds.has(b.id)
            ? { ...b, excluded: true, exclusionReason: defaultReason, _edited: true }
            : b
        )
      );
    }
    setEditCount((c) => c + 1);
  };

  const handleRestoreItem = (item: ReconcileItem) => {
    if (item.a) {
      setVendorRows((prev) =>
        prev.map((v) =>
          v.id === item.a?.id
            ? { ...v, excluded: false, exclusionReason: undefined, _edited: true }
            : v
        )
      );
    }
    if (item.b) {
      setBuyerRows((prev) =>
        prev.map((b) =>
          b.id === item.b?.id
            ? { ...b, excluded: false, exclusionReason: undefined, _edited: true }
            : b
        )
      );
    }
    if (item.extraVendorRows) {
      const extraIds = new Set(item.extraVendorRows.map((x) => x.id));
      setVendorRows((prev) =>
        prev.map((v) =>
          extraIds.has(v.id)
            ? { ...v, excluded: false, exclusionReason: undefined, _edited: true }
            : v
        )
      );
    }
    if (item.extraBuyerRows) {
      const extraIds = new Set(item.extraBuyerRows.map((x) => x.id));
      setBuyerRows((prev) =>
        prev.map((b) =>
          extraIds.has(b.id)
            ? { ...b, excluded: false, exclusionReason: undefined, _edited: true }
            : b
        )
      );
    }
    setEditCount((c) => c + 1);
  };

  // 6. Round-off Resolution
  const handleApproveRoundoff = (anomaly: AnomalyItem) => {
    if (!anomaly.targetRef) return;
    // Find matching item and write off the difference
    setVendorRows((prev) =>
      prev.map((v) => {
        if (v.ref === anomaly.targetRef) {
          return { ...v, amount: Math.round(v.amount), _edited: true };
        }
        return v;
      })
    );
    setEditCount((c) => c + 1);
  };

  // 7. Edit Grid Handlers with Real-Time Reconciliation Sync
  const handleUpdateVendorRow = (idOrIdx: string | number, field: string, value: any) => {
    setVendorRows((prev) => {
      const next = [...prev];
      const idx = typeof idOrIdx === "number" && idOrIdx >= 0 && idOrIdx < next.length && next[idOrIdx]?.id === idOrIdx
        ? idOrIdx
        : next.findIndex((r, i) => r.id === idOrIdx || i === idOrIdx);
      if (idx === -1 || !next[idx]) return prev;

      const row = { ...next[idx], [field]: value, _edited: true };
      if (field === "amount" || field === "dc") {
        row.signed = (row.dc === "Dr" ? 1 : -1) * row.amount;
      }
      next[idx] = row;

      // Real-time synchronization of Opening/Closing balances into storedTotals
      if (row.type === "Opening Balance") {
        setStoredTotals((st: any) => ({
          ...st,
          vendorOpen: { side: row.dc, amount: row.amount, date: row.date },
        }));
      } else if (row.type === "Closing Balance") {
        setStoredTotals((st: any) => ({
          ...st,
          vendorClose: { side: row.dc, amount: row.amount },
        }));
      }

      return next;
    });
    setEditCount((c) => c + 1);
    setReconTriggerCount((c) => c + 1);
  };

  const handleUpdateBuyerRow = (idOrIdx: string | number, field: string, value: any) => {
    setBuyerRows((prev) => {
      const next = [...prev];
      const idx = typeof idOrIdx === "number" && idOrIdx >= 0 && idOrIdx < next.length && next[idOrIdx]?.id === idOrIdx
        ? idOrIdx
        : next.findIndex((r, i) => r.id === idOrIdx || i === idOrIdx);
      if (idx === -1 || !next[idx]) return prev;

      const row = { ...next[idx], [field]: value, _edited: true };
      if (field === "amount" || field === "ind") {
        row.signed = (row.ind === "Cr" ? -1 : 1) * row.amount;
      }
      next[idx] = row;

      // Real-time synchronization of Opening/Closing balances into storedTotals
      if (row.type === "Opening Balance") {
        setStoredTotals((st: any) => ({
          ...st,
          buyerOpen: { side: row.ind, amount: row.amount, count: 1, date: row.date },
        }));
      } else if (row.type === "Closing Balance") {
        setStoredTotals((st: any) => ({
          ...st,
          buyerClose: { side: row.ind, amount: row.amount },
        }));
      }

      return next;
    });
    setEditCount((c) => c + 1);
    setReconTriggerCount((c) => c + 1);
  };

  const handleApplyEditsAndRecon = () => {
    setIsProcessing(true);
    setProcessingProgress("Applying ledger edits, re-anchoring vouchers, and re-running matching heuristics...");

    setTimeout(() => {
      // Re-run anchor and journal voucher refiners on current updated rows
      refineVendorUsingAnchors(vendorRows, buyerRows);
      refineVendorJournalsUsingSAP(vendorRows, buyerRows);

      // Re-derive opening and closing balance anchors from updated rows
      const vOpen = vendorRows.find((x) => x.type === "Opening Balance");
      const bOpen = buyerRows.find((x) => x.type === "Opening Balance");
      const vClose = vendorRows.find((x) => x.type === "Closing Balance");
      const bClose = buyerRows.find((x) => x.type === "Closing Balance");

      setStoredTotals((prev: any) => ({
        vendorOpen: vOpen ? { side: vOpen.dc, amount: vOpen.amount, date: vOpen.date } : prev?.vendorOpen,
        buyerOpen: bOpen ? { side: bOpen.ind, amount: bOpen.amount, count: 1, date: bOpen.date } : prev?.buyerOpen,
        vendorClose: vClose ? { side: vClose.dc, amount: vClose.amount } : prev?.vendorClose,
        buyerClose: bClose ? { side: bClose.ind, amount: bClose.amount } : prev?.buyerClose,
      }));

      setReconTriggerCount((c) => c + 1);
      setEditCount(0);

      try {
        localStorage.setItem("vr_session_vendor_rows_v15", JSON.stringify(vendorRows));
        localStorage.setItem("vr_session_buyer_rows_v15", JSON.stringify(buyerRows));
      } catch {}

      setIsProcessing(false);
      setProcessingProgress("");
      setReconNotice(
        "Edits successfully applied! Ledgers re-anchored and all reconciliation matrices & conclusion updated."
      );
      setTimeout(() => setReconNotice(null), 4500);
      setActiveTab("recon");
    }, 300);
  };

  const handleRevertEdits = () => {
    setVendorRows((prev) =>
      prev.map((r) =>
        r._original
          ? {
              ...r,
              dc: r._original.dc,
              type: r._original.type,
              signed: (r._original.dc === "Dr" ? 1 : -1) * r.amount,
              _edited: false,
            }
          : r
      )
    );
    setBuyerRows((prev) =>
      prev.map((r) =>
        r._original
          ? {
              ...r,
              ind: r._original.ind,
              type: r._original.type,
              signed: (r._original.ind === "Cr" ? -1 : 1) * r.amount,
              _edited: false,
            }
          : r
      )
    );
    setEditCount(0);
    setReconTriggerCount((c) => c + 1);
    setReconNotice("Reverted all modifications back to initial parsed statement states.");
    setTimeout(() => setReconNotice(null), 3000);
  };

  // 8. Full Export
  const handleExportFull = () => {
    const dates = vendorRows
      .concat(buyerRows as any)
      .map((x) => x.date)
      .filter(Boolean);
    let period = "Current Statement";
    if (dates.length > 0) {
      const minD = new Date(Math.min(...dates.map((d: any) => d.getTime())));
      const maxD = new Date(Math.max(...dates.map((d: any) => d.getTime())));
      period = `${formatDateShort(minD)} to ${formatDateShort(maxD)}`;
    }

    exportReconciliationFull(
      reconResult.items,
      vendorRows,
      buyerRows,
      reconResult.balanceSummary,
      manualExceptions,
      period
    );
  };

  // 9. Re-Reconcile Handler
  const handleReReconcile = useCallback(() => {
    if (vendorRows.length === 0 && buyerRows.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress("Re-evaluating matching heuristics, TDS deductions, and tolerances...");

    setTimeout(() => {
      // Re-apply anchor refinement and journal voucher links
      const updatedVendor = [...vendorRows];
      refineVendorUsingAnchors(updatedVendor, buyerRows);
      refineVendorJournalsUsingSAP(updatedVendor, buyerRows);
      setVendorRows(updatedVendor);
      setReconTriggerCount((c) => c + 1);
      setIsProcessing(false);
      setProcessingProgress("");

      const matched = reconResult.items.filter((x) => x.status.startsWith("Matched")).length;
      const total = reconResult.items.length;
      setReconNotice(
        `Re-reconciliation completed successfully! ${matched} matched rows identified across statement ledgers.`
      );
      setTimeout(() => setReconNotice(null), 4500);
    }, 400);
  }, [vendorRows, buyerRows, reconResult.items]);

  const handleClearSession = () => {
    if (!confirm("Are you sure you want to clear the current reconciliation session? All uploaded ledgers and manual matches will be reset.")) return;
    setVendorRows([]);
    setBuyerRows([]);
    setVendorFiles([]);
    setBuyerFiles([]);
    setManualLinks([]);
    setManualExceptions([]);
    setStoredTotals({ vendorOpen: null, buyerOpen: null, vendorClose: null, buyerClose: null });
    setConclusionOverrides(null);
    setEditCount(0);
    try {
      localStorage.removeItem("vr_session_vendor_rows_v15");
      localStorage.removeItem("vr_session_buyer_rows_v15");
      localStorage.removeItem("vr_session_manual_links_v15");
      localStorage.removeItem("vr_session_manual_exceptions_v15");
      localStorage.removeItem("vr_session_stored_totals_v15");
      localStorage.removeItem("vr_session_conclusion_overrides_v15");
    } catch {}
  };

  const hasData = vendorRows.length > 0 || buyerRows.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col selection:bg-indigo-100 selection:text-indigo-900 font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onRunRecon={handleReReconcile}
        onLoadDemo={handleLoadDemo}
        onClear={handleClearSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAnomalies={() => setActiveTab("anomalies")}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
        onExportFull={handleExportFull}
        vendorCount={vendorRows.length}
        buyerCount={buyerRows.length}
        anomalyCount={reconResult.anomalies.length}
        ticketCount={ticketCount}
        isProcessing={isProcessing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showLearningTab={matchSettings.showLearningTab !== false}
        showExclusionsTab={matchSettings.showExclusionsTab !== false}
        theme={matchSettings.theme || "light"}
        onCycleTheme={handleCycleTheme}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Re-Reconcile Success Notification Toast */}
        {reconNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs font-semibold animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{reconNotice}</span>
            </div>
            <button
              onClick={() => setReconNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 p-1 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        )}
        {!hasData ? (
          /* Empty State / Welcome Splash */
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-xs text-center max-w-2xl mx-auto space-y-6 mt-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-100">
              <FileSpreadsheet className="w-8 h-8 stroke-[1.75]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Streamlined Vendor Ledger Reconciliation
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Automated invoice-to-payment matching between Vendor (Tally) and Buyer (SAP) statements with multi-pass logic, statutory TDS validation, and anomaly detection.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleLoadDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Try Interactive Demo Dataset
              </button>

              <button
                onClick={() => setIsImportOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                Upload Ledgers (PDF, Excel, CSV)
              </button>

              <button
                onClick={() => setIsManualOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                User Manual
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">
                  1. TDS Auto-Adjustment
                </span>
                <span className="text-slate-500 text-[11px] leading-relaxed">
                  Resolves <strong>Gross = Net + TDS</strong> (e.g. 194Q 0.1%, 194C, 194J) effortlessly.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">
                  2. Fuzzy & Anchor Splitting
                </span>
                <span className="text-slate-500 text-[11px] leading-relaxed">
                  Anchor matching cleanly decouples concatenated voucher numbers from text exports.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">
                  3. Automated Audit Scanner
                </span>
                <span className="text-slate-500 text-[11px] leading-relaxed">
                  Detects double billing, rate gaps, and round-offs with 1-click write-offs.
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Reconciliation Views */
          <>
            {/* Metric KPI Cards */}
            <MetricCards
              matchedCount={reconResult.matchedCount}
              partialCount={reconResult.partialCount}
              unmatchedCount={reconResult.unmatchedCount}
              totalRecords={reconResult.items.filter((x) => !x.internal).length}
              reconciledRate={reconResult.reconciledRate}
              netDiscrepancy={reconResult.netDiscrepancy}
              anomalyCount={reconResult.anomalies.length}
              vendorRowCount={vendorRows.length}
              buyerRowCount={buyerRows.length}
              onOpenAnomalies={() => setActiveTab("anomalies")}
              onFilterStatus={(s) => setActiveTab("recon")}
            />

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* General Ledger Balance Card */}
                <BalanceReconciliationCard balance={reconResult.balanceSummary} />

                {/* Utkarsh India Limited Statutory Conclusion Highlight Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        Utkarsh India Limited Statutory Reconciliation Statement
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Cell E40 Net Difference model, statutory adjustment items, and itemized working schedule
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("conclusion")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    Open Conclusion Statement
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Action Matrix Snapshot */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Reconciliation Line Items Matrix
                    </h3>
                    <button
                      onClick={() => setActiveTab("recon")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      View Full Matrix
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ReconcileTable
                    items={reconResult.items}
                    onUnlink={handleUnlink}
                    onExcludeItem={handleExcludeItem}
                    onRestoreItem={handleRestoreItem}
                    onAddExceptionFromItem={(item) => {
                      setManualExceptions((prev) => [
                        ...prev,
                        {
                          id: `ex-${Date.now()}`,
                          type: item.a?.type || item.b?.type || "Invoice",
                          vRef: item.a?.ref || "",
                          vAmt: item.a?.amount || 0,
                          yRef: item.b?.ref || item.b?.docNo || "",
                          yAmt: item.b?.amount || 0,
                          note: item.basis || "Audit item",
                          createdAt: new Date().toISOString().slice(0, 10),
                        },
                      ]);
                      setActiveTab("exceptions");
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tab: Detailed Reconcile Matrix */}
            {activeTab === "recon" && (
              <ReconcileTable
                items={reconResult.items}
                onUnlink={handleUnlink}
                onExcludeItem={handleExcludeItem}
                onRestoreItem={handleRestoreItem}
                onAddExceptionFromItem={(item) => {
                  setManualExceptions((prev) => [
                    ...prev,
                    {
                      id: `ex-${Date.now()}`,
                      type: item.a?.type || item.b?.type || "Invoice",
                      vRef: item.a?.ref || "",
                      vAmt: item.a?.amount || 0,
                      yRef: item.b?.ref || item.b?.docNo || "",
                      yAmt: item.b?.amount || 0,
                      note: item.basis || "Audit item",
                      createdAt: new Date().toISOString().slice(0, 10),
                    },
                  ]);
                  setActiveTab("exceptions");
                }}
              />
            )}

            {/* Tab: Interactive Matcher */}
            {activeTab === "interactive" && (
              <InteractiveMatcher
                unmatchedVendor={unmatchedVendor}
                unmatchedBuyer={unmatchedBuyer}
                onManualPair={handleManualPair}
              />
            )}

            {/* Tab: Conclusion Statement */}
            {activeTab === "conclusion" && (
              <ConclusionPanel
                reconResult={reconResult}
                vendorRows={vendorRows}
                buyerRows={buyerRows}
                storedTotals={storedTotals}
                overrides={conclusionOverrides}
                onUpdateOverrides={setConclusionOverrides}
              />
            )}

            {/* Tab: Parsed Data Editor */}
            {activeTab === "parsed" && (
              <ParsedDataEditor
                vendorRows={vendorRows}
                buyerRows={buyerRows}
                onUpdateVendorRow={handleUpdateVendorRow}
                onUpdateBuyerRow={handleUpdateBuyerRow}
                onApplyEditsAndRecon={handleApplyEditsAndRecon}
                onRevertEdits={handleRevertEdits}
                onAddLearningRule={(newRule) => setRules((prev) => [...prev, newRule])}
                editCount={editCount}
              />
            )}

            {/* Tab: Anomaly Inspector */}
            {activeTab === "anomalies" && (
              <AnomalyInspector
                anomalies={reconResult.anomalies}
                onApproveRoundoff={handleApproveRoundoff}
              />
            )}

            {/* Tab: Rules Manager */}
            {activeTab === "rules" && (
              <RulesManager
                rules={rules}
                onAddRule={(r) => setRules((prev) => [...prev, r])}
                onDeleteRule={(idx) => setRules((prev) => prev.filter((_, i) => i !== idx))}
                onClearRules={() => setRules([])}
                vendorRows={vendorRows}
                buyerRows={buyerRows}
              />
            )}

            {/* Tab: Manual Exceptions */}
            {activeTab === "exceptions" && (
              <ManualExceptionsModal
                exceptions={manualExceptions}
                onAddException={(ex) => setManualExceptions((prev) => [...prev, ex])}
                onDeleteException={(idx) =>
                  setManualExceptions((prev) => prev.filter((_, i) => i !== idx))
                }
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Vendor Reconciliation Engine Ai.1</span>
            <span>•</span>
            <span>Created by Rabi Jha</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Enterprise Edition</span>
          </div>
          <div>
            Built with React, TypeScript & Tailwind CSS • Automated TDS & SAP FBL1N Heuristics
          </div>
        </div>
      </footer>

      {/* Import Modal */}
      <DataImportModal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportError(null);
        }}
        onUploadVendor={(files) => {
          setImportError(null);
          setVendorFiles((prev) => [...prev, ...files]);
        }}
        onUploadBuyer={(files) => {
          setImportError(null);
          setBuyerFiles((prev) => [...prev, ...files]);
        }}
        vendorFiles={vendorFiles}
        buyerFiles={buyerFiles}
        onRemoveVendorFile={(idx) => setVendorFiles((prev) => prev.filter((_, i) => i !== idx))}
        onRemoveBuyerFile={(idx) => setBuyerFiles((prev) => prev.filter((_, i) => i !== idx))}
        onProcess={handleProcessFiles}
        onLoadDemo={handleLoadDemo}
        isProcessing={isProcessing}
        processingProgress={processingProgress}
        errorMessage={importError}
        onClearError={() => setImportError(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={matchSettings}
        onSaveSettings={(newSettings) => setMatchSettings(newSettings)}
      />

      {/* User Issue & Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => {
          setIsFeedbackOpen(false);
          refreshTicketCount();
        }}
        vendorCount={vendorRows.length}
        buyerCount={buyerRows.length}
        matchedCount={reconResult.items.filter((x) => x.status.startsWith("Matched")).length}
        unmatchedCount={reconResult.items.filter((x) => x.status.startsWith("Unmatched")).length}
        onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
      />

      {/* Ticket Helpdesk Modal */}
      <TicketHelpdeskModal
        isOpen={isHelpdeskOpen}
        onClose={() => {
          setIsHelpdeskOpen(false);
          refreshTicketCount();
        }}
        onRefreshCount={refreshTicketCount}
      />

      {/* Complete User Manual Modal */}
      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </div>
  );
}
