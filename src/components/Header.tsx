import React from "react";
import {
  FileSpreadsheet,
  Play,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  LifeBuoy,
  MessageSquare,
  Sun,
  Moon,
  Compass,
} from "lucide-react";
import { AppTheme } from "../types";

interface HeaderProps {
  onOpenImport: () => void;
  onRunRecon: () => void;
  onLoadDemo: () => void;
  onClear: () => void;
  onOpenSettings: () => void;
  onOpenAnomalies: () => void;
  onOpenFeedback: () => void;
  onOpenHelpdesk?: () => void;
  onExportFull: () => void;
  vendorCount: number;
  buyerCount: number;
  anomalyCount: number;
  ticketCount?: number;
  isProcessing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showLearningTab?: boolean;
  showExclusionsTab?: boolean;
  theme?: AppTheme;
  onCycleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onRunRecon,
  onLoadDemo,
  onClear,
  onOpenSettings,
  onOpenAnomalies,
  onOpenFeedback,
  onOpenHelpdesk,
  onExportFull,
  vendorCount,
  buyerCount,
  anomalyCount,
  ticketCount = 0,
  isProcessing,
  activeTab,
  setActiveTab,
  showLearningTab = true,
  showExclusionsTab = true,
  theme = "light",
  onCycleTheme,
}) => {
  const hasData = vendorCount > 0 || buyerCount > 0;

  const isDark = theme === "dark";
  const isNavy = theme === "navy";

  const headerBgClass = isDark
    ? "bg-slate-900 border-slate-800 text-slate-100"
    : isNavy
    ? "bg-[#0c1427] border-[#1b2b4e] text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const navBorderClass = isDark
    ? "border-slate-800"
    : isNavy
    ? "border-[#1b2b4e]"
    : "border-slate-100";

  // Navigation tabs dynamic list honoring settings visibility
  const navTabs = [
    { id: "overview", label: "Executive Overview" },
    { id: "parsed", label: "Parsed Ledgers & Editor" },
    { id: "recon", label: "Reconciliation Matrix" },
    { id: "interactive", label: "Interactive Matcher" },
    { id: "conclusion", label: "Conclusion Statement" },
    { id: "anomalies", label: `Anomaly Inspector ${anomalyCount > 0 ? `(${anomalyCount})` : ""}` },
    ...(showLearningTab ? [{ id: "rules", label: "Learning Rules" }] : []),
    ...(showExclusionsTab ? [{ id: "exceptions", label: "Manual Exceptions" }] : []),
  ];

  return (
    <header className={`${headerBgClass} border-b sticky top-0 z-30 shadow-xs transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200 shrink-0">
              VR
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-base font-bold tracking-tight ${isDark || isNavy ? "text-white" : "text-slate-900"}`}>
                  Vendor Reconciliation Engine
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-400/30">
                  Ai.1
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  isDark || isNavy
                    ? "bg-slate-800 text-slate-300 border border-slate-700"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                  Created by Rabi Jha
                </span>
                {hasData && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-400/30"
                    title="Reconciliation progress is automatically persisted. Refreshing will not lose your work."
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Session Saved
                  </span>
                )}
              </div>
              <p className={`text-xs font-normal ${isDark || isNavy ? "text-slate-400" : "text-slate-500"}`}>
                Tally (Vendor) ↔ SAP FBL1N (Buyer) Automated Matching & TDS Validation
              </p>
            </div>
          </div>

          {/* Action Center */}
          <div className="flex items-center gap-2">
            {!hasData && (
              <button
                id="btn-load-demo"
                onClick={onLoadDemo}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  isDark || isNavy
                    ? "bg-sky-950/60 text-sky-300 border border-sky-800 hover:bg-sky-900/60"
                    : "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                } transition-colors shadow-2xs cursor-pointer`}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                Load Demo Dataset
              </button>
            )}

            <button
              id="btn-open-import"
              onClick={onOpenImport}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isDark || isNavy
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
              } transition-colors cursor-pointer`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Import Ledgers
              {hasData && (
                <span className={`ml-1 px-1.5 py-0.2 rounded text-[10px] ${
                  isDark || isNavy ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-800"
                }`}>
                  {vendorCount + buyerCount}
                </span>
              )}
            </button>

            {hasData && (
              <button
                id="btn-run-recon"
                onClick={onRunRecon}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-run matching rules and heuristics"
              >
                <Play className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin text-white" : "fill-current"}`} />
                {isProcessing ? "Reconciling..." : "Re-Reconcile"}
              </button>
            )}

            {anomalyCount > 0 && (
              <button
                id="btn-open-anomalies"
                onClick={onOpenAnomalies}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-400/30 hover:bg-rose-500/25 transition-colors cursor-pointer animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                {anomalyCount} {anomalyCount === 1 ? "Issue" : "Issues"}
              </button>
            )}

            <button
              id="btn-export-full"
              onClick={onExportFull}
              disabled={!hasData}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isDark || isNavy
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              } disabled:opacity-40 transition-colors cursor-pointer`}
              title="Download full reconciliation workbook with audit sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Export Workbook
            </button>

            {/* User Issue & Feedback */}
            <button
              id="btn-open-feedback"
              onClick={onOpenFeedback}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                isDark || isNavy
                  ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800 hover:bg-indigo-900/60"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              } transition-colors cursor-pointer`}
              title="Report Issue / User Feedback"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-indigo-400" />
              Feedback
            </button>

            {onOpenHelpdesk && (
              <button
                id="btn-open-helpdesk"
                onClick={onOpenHelpdesk}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  isDark || isNavy
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                } transition-colors cursor-pointer`}
                title="Support Helpdesk: Review user tickets and reply"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Tickets
                {ticketCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold">
                    {ticketCount}
                  </span>
                )}
              </button>
            )}

            {/* Quick Theme Switcher */}
            {onCycleTheme && (
              <button
                id="btn-cycle-theme"
                onClick={onCycleTheme}
                className={`p-1.5 rounded-lg ${
                  isDark || isNavy
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                } transition-colors cursor-pointer`}
                title={`Current theme: ${theme}. Click to switch theme.`}
              >
                {theme === "light" && <Sun className="w-4 h-4 text-amber-500" />}
                {theme === "dark" && <Moon className="w-4 h-4 text-indigo-400" />}
                {theme === "navy" && <Compass className="w-4 h-4 text-sky-400" />}
              </button>
            )}

            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className={`p-1.5 rounded-lg ${
                isDark || isNavy
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              } transition-colors cursor-pointer`}
              title="Matching Tolerances, Themes & Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {hasData && (
              <button
                id="btn-clear-session"
                onClick={onClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Reset session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex space-x-1 border-t ${navBorderClass} -mb-px overflow-x-auto no-scrollbar`}>
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-400"
                  : isDark || isNavy
                  ? "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
