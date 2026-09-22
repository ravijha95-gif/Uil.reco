import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
} from "lucide-react";

export interface FeedbackTicket {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  userEmail?: string;
  userName?: string;
  includeDiagnostics: boolean;
  diagnostics?: {
    vendorCount: number;
    buyerCount: number;
    matchedCount: number;
    unmatchedCount: number;
    timestamp: string;
  };
  createdAt: string;
  status: "Received" | "Under Review" | "Resolved";
  resolutionNote?: string;
  replies?: Array<{
    id: string;
    author: string;
    role: "Support" | "User" | "Admin";
    message: string;
    timestamp: string;
  }>;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorCount: number;
  buyerCount: number;
  matchedCount: number;
  unmatchedCount: number;
  onOpenHelpdesk?: () => void;
}

const STORAGE_KEY = "vr_feedback_tickets_v1";

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  vendorCount,
  buyerCount,
  matchedCount,
  unmatchedCount,
  onOpenHelpdesk,
}) => {
  const [tickets, setTickets] = useState<FeedbackTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [category, setCategory] = useState<string>("TDS / Calculation Variance");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch {}
  }, [tickets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const ticketId = `FB-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: FeedbackTicket = {
      id: ticketId,
      category,
      title: title.trim(),
      description: description.trim(),
      priority,
      userEmail: userEmail.trim() || undefined,
      userName: userName.trim() || undefined,
      includeDiagnostics,
      diagnostics: includeDiagnostics
        ? {
            vendorCount,
            buyerCount,
            matchedCount,
            unmatchedCount,
            timestamp: new Date().toISOString(),
          }
        : undefined,
      createdAt: new Date().toISOString(),
      status: "Received",
      resolutionNote:
        category === "TDS / Calculation Variance"
          ? "Our reconciliation engine now auto-detects Section 194J 10% TDS deductions on basic invoice amounts (excl. 18% GST). If your variance differs, your report has been prioritized."
          : "Your report has been logged and the diagnostic trace is queued for rapid assistance.",
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSubmittedId(ticketId);
    setTitle("");
    setDescription("");
  };

  const resetForm = () => {
    setSubmittedId(null);
    setActiveTab("new");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">User Issue & Feedback Center</h3>
              <p className="text-xs text-slate-500">
                Report discrepancies, request reconciliation fixes, or share feedback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50/50 text-xs font-semibold">
          <div className="flex">
            <button
              onClick={() => setActiveTab("new")}
              className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
                activeTab === "new"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Submit New Issue
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              My Reports & History
              {tickets.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {tickets.length}
                </span>
              )}
            </button>
          </div>

          {onOpenHelpdesk && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHelpdesk();
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Manage & Reply in Helpdesk
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === "new" ? (
            submittedId ? (
              <div className="py-6 text-center space-y-3 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Feedback Successfully Registered
                </h4>
                <div className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                  Ticket #{submittedId}
                </div>
                <p className="text-slate-600 max-w-md mx-auto text-xs leading-relaxed">
                  Thank you! Your issue report has been saved to your local session history. You
                  can track its status and diagnostic trace under the "My Reports & History" tab.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Submit Another Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    View History
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                    >
                      <option>TDS / Calculation Variance</option>
                      <option>Invoice Auto-Matching Issue</option>
                      <option>Ledger Import / PDF Parsing Error</option>
                      <option>Excel Workbook Export</option>
                      <option>Manual Matcher Discrepancy</option>
                      <option>Feature Request / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                    >
                      <option value="Low">Low - Minor suggestion</option>
                      <option value="Medium">Medium - Standard discrepancy</option>
                      <option value="High">High - Impeding reconciliation</option>
                      <option value="Urgent">Urgent - Blocking month-end close</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Issue Title / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Invoices with TDS @10% U/s 194J didn't auto match..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Detailed Description & Invoice Reference *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe what happened, invoice numbers, expected net/gross values, and whether variance calculation was unexpected..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Accountant / Auditor Name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="user@company.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Diagnostics Checkbox */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Attach Current Reconciliation Diagnostic Metrics
                  </label>
                  <p className="text-[11px] text-slate-500 pl-5">
                    Attaches current ledger stats ({vendorCount} Vendor rows, {buyerCount} SAP rows,{" "}
                    {matchedCount} matched, {unmatchedCount} unmatched) to speed up investigation.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Feedback
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No Feedback Reports Yet</p>
                  <p className="text-slate-400 text-xs">
                    Submitted issues and inquiries will appear here along with resolution notes.
                  </p>
                </div>
              ) : (
                tickets.map((t) => {
                  const isExpanded = expandedTicketId === t.id;
                  return (
                    <div
                      key={t.id}
                      className="border border-slate-200 rounded-xl p-3 bg-white hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-700 text-[11px]">
                            {t.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                            {t.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.priority === "Urgent"
                                ? "bg-rose-100 text-rose-800"
                                : t.priority === "High"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {t.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-800 text-xs">{t.title}</h4>
                      <p className="text-slate-600 line-clamp-2">{t.description}</p>

                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-100 space-y-2 mt-2">
                          {t.resolutionNote && (
                            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                              <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-800 mb-0.5">
                                Engine Resolution / Assistance Note:
                              </span>
                              {t.resolutionNote}
                            </div>
                          )}

                          {t.replies && t.replies.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 space-y-2">
                              <span className="font-bold block text-[10px] uppercase tracking-wider text-indigo-800">
                                Support & Auditor Responses ({t.replies.length}):
                              </span>
                              {t.replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="bg-white p-2.5 rounded-lg border border-indigo-100/80 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-indigo-950">
                                      {reply.author} <span className="font-normal text-indigo-600">({reply.role})</span>
                                    </span>
                                    <span className="text-slate-400">
                                      {new Date(reply.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 whitespace-pre-wrap text-[11px]">
                                    {reply.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {t.diagnostics && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[10px] text-slate-600">
                              Diagnostics: Vendor rows: {t.diagnostics.vendorCount} | SAP rows:{" "}
                              {t.diagnostics.buyerCount} | Matched: {t.diagnostics.matchedCount} |
                              Logged: {new Date(t.diagnostics.timestamp).toLocaleTimeString()}
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400">
                            Logged on: {new Date(t.createdAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
