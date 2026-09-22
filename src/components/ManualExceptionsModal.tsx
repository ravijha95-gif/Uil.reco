import React, { useState } from "react";
import { ManualException, TransactionType } from "../types";
import { formatCurrency } from "../utils/dateAndNumber";
import { Plus, Trash2, HelpCircle, CheckCircle2 } from "lucide-react";

interface ManualExceptionsModalProps {
  exceptions: ManualException[];
  onAddException: (exception: ManualException) => void;
  onDeleteException: (index: number) => void;
}

const TYPE_OPTIONS: TransactionType[] = [
  "Invoice",
  "Payment",
  "TDS",
  "Debit Note",
  "Credit Note",
  "Adjustment JV",
  "Opening Balance",
  "Closing Balance",
  "Unknown",
];

export const ManualExceptionsModal: React.FC<ManualExceptionsModalProps> = ({
  exceptions,
  onAddException,
  onDeleteException,
}) => {
  const [type, setType] = useState<TransactionType>("Invoice");
  const [vRef, setVRef] = useState("");
  const [vAmt, setVAmt] = useState("");
  const [yRef, setYRef] = useState("");
  const [yAmt, setYAmt] = useState("");
  const [note, setNote] = useState("");

  const handleAdd = () => {
    if (!vRef && !yRef && !vAmt && !yAmt && !note) {
      alert("Please fill in at least one reference, amount, or audit note.");
      return;
    }

    onAddException({
      id: `manual-ex-${Date.now()}`,
      type,
      vRef: vRef.trim(),
      vAmt: parseFloat(vAmt) || 0,
      yRef: yRef.trim(),
      yAmt: parseFloat(yAmt) || 0,
      note: note.trim() || "Manually flagged in reconciliation statement",
      createdAt: new Date().toISOString().slice(0, 10),
    });

    setVRef("");
    setVAmt("");
    setYRef("");
    setYAmt("");
    setNote("");
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Manual Exceptions & Audit Clarifications
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Manually flag unbooked invoices, pending credit notes, or audit adjustments that must appear in the final reconciliation statement.
        </p>
      </div>

      {/* Entry Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Log New Manual Exception Entry
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Transaction Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Vendor Reference
            </label>
            <input
              type="text"
              placeholder="e.g. INV/24-25/998"
              value={vRef}
              onChange={(e) => setVRef(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Vendor Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={vAmt}
              onChange={(e) => setVAmt(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Buyer / SAP Reference or Doc No
            </label>
            <input
              type="text"
              placeholder="e.g. 5100009999"
              value={yRef}
              onChange={(e) => setYRef(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Buyer Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={yAmt}
              onChange={(e) => setYAmt(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Audit Note / Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Awaiting credit note for damaged goods"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Manual Exception
          </button>
        </div>
      </div>

      {/* Exception Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Logged Exceptions ({exceptions.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Vendor Ref</th>
                <th className="py-3 px-4 text-right">Vendor Amount (₹)</th>
                <th className="py-3 px-4">SAP Ref</th>
                <th className="py-3 px-4 text-right">SAP Amount (₹)</th>
                <th className="py-3 px-4">Audit Reason</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {exceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No manual exceptions logged yet.
                  </td>
                </tr>
              ) : (
                exceptions.map((ex, idx) => (
                  <tr key={ex.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-700">
                      {ex.type}
                    </td>
                    <td className="py-2.5 px-4 font-mono">{ex.vRef || "—"}</td>
                    <td className="py-2.5 px-4 font-mono text-right font-semibold">
                      {ex.vAmt ? formatCurrency(ex.vAmt) : "—"}
                    </td>
                    <td className="py-2.5 px-4 font-mono">{ex.yRef || "—"}</td>
                    <td className="py-2.5 px-4 font-mono text-right font-semibold">
                      {ex.yAmt ? formatCurrency(ex.yAmt) : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{ex.note}</td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteException(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Delete exception"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
