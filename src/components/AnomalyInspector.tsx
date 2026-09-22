import React, { useState } from "react";
import { AnomalyItem } from "../types";
import { formatCurrency } from "../utils/dateAndNumber";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Check,
} from "lucide-react";

interface AnomalyInspectorProps {
  anomalies: AnomalyItem[];
  onResolveAnomaly?: (anomalyId: string) => void;
  onApproveRoundoff?: (anomaly: AnomalyItem) => void;
}

export const AnomalyInspector: React.FC<AnomalyInspectorProps> = ({
  anomalies,
  onResolveAnomaly,
  onApproveRoundoff,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const filtered = anomalies.filter((item) => {
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.targetRef || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    if (sev === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          High Risk
        </span>
      );
    }
    if (sev === "medium") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Medium Attention
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        Low / Minor
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Automated Error & Audit Anomaly Inspector
            </h3>
            <p className="text-xs text-slate-500">
              Heuristic scanner detecting double bookings, statutory TDS rate gaps, timing carry-overs, and round-offs.
            </p>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          {["all", "high", "medium", "low"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                severityFilter === sev
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200/80 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 stroke-[1.5]" />
            <p className="font-semibold text-slate-700 text-sm">
              No anomalies found matching criteria
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Ledger records pass all automated duplicate, TDS, and balance checks.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl p-4 border transition-shadow shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.severity === "high"
                  ? "border-rose-200/80 bg-rose-50/20"
                  : item.severity === "medium"
                  ? "border-amber-200/80 bg-amber-50/10"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSeverityBadge(item.severity)}
                  <span className="text-xs font-bold text-slate-900">
                    {item.title}
                  </span>
                  {item.side && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {item.side} Ledger
                    </span>
                  )}
                  {item.amount != null && item.amount > 0 && (
                    <span className="font-mono text-xs font-bold text-slate-800">
                      Amount: {formatCurrency(item.amount)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                {item.suggestedAction && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium pt-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Action: {item.suggestedAction}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {item.code === "MINOR_ROUNDOFF" && onApproveRoundoff && (
                  <button
                    onClick={() => onApproveRoundoff(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept Round-off
                  </button>
                )}

                {onResolveAnomaly && (
                  <button
                    onClick={() => onResolveAnomaly(item.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Dismiss / Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
