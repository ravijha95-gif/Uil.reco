import React, { useState } from "react";
import { AppTheme, MatchSettings } from "../types";
import {
  Sliders,
  X,
  CheckCircle2,
  RotateCcw,
  Palette,
  Eye,
  Sun,
  Moon,
  Compass,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MatchSettings;
  onSaveSettings: (newSettings: MatchSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [amtTol, setAmtTol] = useState(settings.amtTol);
  const [dateTol, setDateTol] = useState(settings.dateTol);
  const [fallbackWindow, setFallbackWindow] = useState(settings.fallbackWindow);
  const [autoRoundOffLimit, setAutoRoundOffLimit] = useState(settings.autoRoundOffLimit);
  const [allowBatchMatching, setAllowBatchMatching] = useState(settings.allowBatchMatching);
  const [showLearningTab, setShowLearningTab] = useState(
    settings.showLearningTab !== undefined ? settings.showLearningTab : true
  );
  const [showExclusionsTab, setShowExclusionsTab] = useState(
    settings.showExclusionsTab !== undefined ? settings.showExclusionsTab : true
  );
  const [theme, setTheme] = useState<AppTheme>(settings.theme || "light");

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      amtTol: Math.max(0, amtTol),
      dateTol: Math.max(0, dateTol),
      fallbackWindow: Math.max(0, fallbackWindow),
      autoRoundOffLimit: Math.max(0, autoRoundOffLimit),
      allowBatchMatching,
      showLearningTab,
      showExclusionsTab,
      theme,
    });
    onClose();
  };

  const handleReset = () => {
    setAmtTol(2.0);
    setDateTol(15);
    setFallbackWindow(60);
    setAutoRoundOffLimit(5.0);
    setAllowBatchMatching(true);
    setShowLearningTab(true);
    setShowExclusionsTab(true);
    setTheme("light");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Matching Engine Settings & Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Section: Themes */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <Palette className="w-4 h-4 text-indigo-600" />
              <span>Workspace Theme</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  theme === "light"
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  {theme === "light" && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Light Crisp</span>
                  <span className="text-[10.5px] text-slate-500">Classic Clean White</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  theme === "dark"
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  {theme === "dark" && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Dark Slate</span>
                  <span className="text-[10.5px] text-slate-500">Eye-Safe Charcoal</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("navy")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  theme === "navy"
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Compass className="w-4 h-4 text-sky-500" />
                  {theme === "navy" && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Midnight Navy</span>
                  <span className="text-[10.5px] text-slate-500">Executive Deep Blue</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Panel Visibility Toggles */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Navigation Panels Visibility (Show / Hide)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Customize which specialized accounting panels appear in your top navigation tabs bar.
            </p>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              {/* Learning Rules Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">
                    Learning Rules Panel
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Display the regex & rule learning manager tab in the top navigation.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLearningTab}
                    onChange={(e) => setShowLearningTab(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between">
                {/* Manual Exceptions Toggle */}
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">
                    Manual Exceptions & Exclusions Panel
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Display the manual exclusions, write-offs, and carryover audit tab.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExclusionsTab}
                    onChange={(e) => setShowExclusionsTab(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Engine Tolerances */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Reconciliation Heuristic Tolerances
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Amount Match Tolerance (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={amtTol}
                onChange={(e) => setAmtTol(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Permissible penny difference to consider an invoice/payment an exact match (default: ₹2.00).
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Strict Date Tolerance (Days)
              </label>
              <input
                type="number"
                min="0"
                value={dateTol}
                onChange={(e) => setDateTol(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard window between vendor billing date and buyer document date (default: 15 days).
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Fallback Proximity Window (Days)
              </label>
              <input
                type="number"
                min="0"
                value={fallbackWindow}
                onChange={(e) => setFallbackWindow(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Maximum days gap allowed during heuristic fallback matching when references differ (default: 60 days).
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Auto Round-off Discrepancy Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={autoRoundOffLimit}
                onChange={(e) => setAutoRoundOffLimit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Discrepancies below this amount will trigger 1-click round-off write-off suggestion (default: ₹5.00).
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">
                  Enable Batch / Split Payment Matching
                </span>
                <span className="text-[11px] text-slate-500">
                  Detect when 1 payment covers 2 invoices (combinatorial check).
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowBatchMatching}
                  onChange={(e) => setAllowBatchMatching(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
