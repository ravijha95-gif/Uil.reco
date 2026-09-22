import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "../utils/dateAndNumber";

interface MetricCardsProps {
  matchedCount: number;
  partialCount: number;
  unmatchedCount: number;
  totalRecords: number;
  reconciledRate: number;
  netDiscrepancy: number;
  anomalyCount: number;
  vendorRowCount: number;
  buyerRowCount: number;
  onOpenAnomalies: () => void;
  onFilterStatus?: (status: string) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  matchedCount,
  partialCount,
  unmatchedCount,
  totalRecords,
  reconciledRate,
  netDiscrepancy,
  anomalyCount,
  vendorRowCount,
  buyerRowCount,
  onOpenAnomalies,
  onFilterStatus,
}) => {
  const isNetZero = Math.abs(netDiscrepancy) <= 1.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Reconciled Rate */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reconciliation Rate
          </span>
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {reconciledRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              ({matchedCount}/{totalRecords} items)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, reconciledRate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Matched Items */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("Matched")}
        className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fully Reconciled
          </span>
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-emerald-700 tracking-tight">
            {matchedCount}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Exact & TDS-adjusted pairs
          </p>
        </div>
      </div>

      {/* 3. Partial & In Review */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("Partial")}
        className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Partial / Variance
          </span>
          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-amber-700 tracking-tight">
            {partialCount}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Amount difference or timing lag
          </p>
        </div>
      </div>

      {/* 4. Net Movement Variance */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Net Movement Variance
          </span>
          <span
            className={`p-1.5 rounded-lg ${
              isNetZero ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {isNetZero ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </span>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-bold tracking-tight ${
              isNetZero ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {formatCurrency(netDiscrepancy)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isNetZero ? "Ledger movement balanced" : "Discrepancy across period"}
          </p>
        </div>
      </div>

      {/* 5. Anomaly & Unmatched Tracker */}
      <div
        onClick={onOpenAnomalies}
        className={`rounded-xl p-4 border shadow-2xs flex flex-col justify-between cursor-pointer transition-colors ${
          anomalyCount > 0
            ? "bg-rose-50/60 border-rose-200 hover:bg-rose-100/60"
            : "bg-white border-slate-200/80 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Audit Anomalies
          </span>
          <span
            className={`p-1.5 rounded-lg ${
              anomalyCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-bold tracking-tight ${
              anomalyCount > 0 ? "text-rose-700" : "text-slate-700"
            }`}
          >
            {anomalyCount}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {anomalyCount > 0
              ? `${anomalyCount} potential risks flagged`
              : "No duplicate/rate issues"}
          </p>
        </div>
      </div>
    </div>
  );
};
