import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Search,
  Filter,
  User,
  Mail,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { FeedbackTicket } from "./FeedbackModal";

export interface TicketReply {
  id: string;
  author: string;
  role: "Support" | "User" | "Admin";
  message: string;
  timestamp: string;
}

interface TicketHelpdeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCount?: () => void;
}

const STORAGE_KEY = "vr_feedback_tickets_v1";

const QUICK_REPLIES = [
  {
    title: "Opening Balance Fix",
    text: "We have updated the SAP PDF parser to automatically detect and extract Opening and Closing balances from Utkarsh India / SAP statements.",
    nextStatus: "Resolved" as const,
  },
  {
    title: "Multi-line Manual Match",
    text: "You can now select multiple Tally/Vendor ledger lines as well as multiple SAP lines in the Interactive Matcher to reconcile companion vouchers or split entries.",
    nextStatus: "Resolved" as const,
  },
  {
    title: "TDS 194J Verified",
    text: "The reconciliation engine has verified the 10% TDS deduction under Section 194J on the basic invoice amount excluding 18% GST.",
    nextStatus: "Resolved" as const,
  },
  {
    title: "Under Review",
    text: "Thank you for the diagnostic log. Our technical accounting team is currently reviewing the statement schema and will update shortly.",
    nextStatus: "Under Review" as const,
  },
];

export const TicketHelpdeskModal: React.FC<TicketHelpdeskModalProps> = ({
  isOpen,
  onClose,
  onRefreshCount,
}) => {
  const [tickets, setTickets] = useState<FeedbackTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [replyText, setReplyText] = useState<string>("");
  const [replyAuthor, setReplyAuthor] = useState<string>("Accounting Support");
  const [updateStatusOnReply, setUpdateStatusOnReply] = useState<"Received" | "Under Review" | "Resolved">("Resolved");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync tickets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
      onRefreshCount?.();
    } catch {}
  }, [tickets, onRefreshCount]);

  // Reload when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        setTickets(parsed);
        if (parsed.length > 0 && !selectedTicketId) {
          setSelectedTicketId(parsed[0].id);
        }
      } catch {}
    }
  }, [isOpen]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      if (!matchesStatus) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, searchQuery]);

  // Ticket metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const received = tickets.filter((t) => t.status === "Received").length;
    const underReview = tickets.filter((t) => t.status === "Under Review").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    return { total, received, underReview, resolved };
  }, [tickets]);

  if (!isOpen) return null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    const newReply: TicketReply = {
      id: `reply-${Date.now()}`,
      author: replyAuthor.trim() || "Support Team",
      role: "Support",
      message: replyText.trim(),
      timestamp: new Date().toISOString(),
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === selectedTicketId) {
          const currentReplies = (t as any).replies || [];
          return {
            ...t,
            status: updateStatusOnReply,
            replies: [...currentReplies, newReply],
          };
        }
        return t;
      })
    );

    setReplyText("");
  };

  const handleStatusChange = (ticketId: string, newStatus: "Received" | "Under Review" | "Resolved") => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (confirm("Are you sure you want to delete this ticket?")) {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }
    }
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    const headers = [
      "Ticket ID",
      "Date",
      "Status",
      "Priority",
      "Category",
      "Title",
      "Submitter Name",
      "Submitter Email",
      "Description",
      "Vendor Count",
      "Buyer Count",
      "Replies Count",
    ];

    const rows = tickets.map((t) => [
      `"${t.id}"`,
      `"${new Date(t.createdAt).toLocaleString()}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.category}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${(t.userName || "").replace(/"/g, '""')}"`,
      `"${(t.userEmail || "").replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.diagnostics?.vendorCount ?? ""}"`,
      `"${t.diagnostics?.buyerCount ?? ""}"`,
      `"${((t as any).replies || []).length}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Recon_Feedback_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyQuickReply = (qr: typeof QUICK_REPLIES[0]) => {
    setReplyText(qr.text);
    setUpdateStatusOnReply(qr.nextStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Support & Feedback Helpdesk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  Admin Workspace
                </span>
              </div>
              <p className="text-xs text-slate-300">
                View submitted user tickets, inspect reconciliation diagnostics, and post direct replies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={tickets.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 disabled:opacity-40 cursor-pointer"
              title="Export all tickets to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 grid grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-500">Total Tickets:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{metrics.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-500">New / Received:</span>
            <span className="font-bold text-amber-700 font-mono text-sm">{metrics.received}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-500">Under Review:</span>
            <span className="font-bold text-sky-700 font-mono text-sm">{metrics.underReview}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Resolved:</span>
            <span className="font-bold text-emerald-700 font-mono text-sm">{metrics.resolved}</span>
          </div>
        </div>

        {/* Main 2-Column Split Workspace */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Tickets Queue (4 cols) */}
          <div className="md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
            {/* Search & Filter */}
            <div className="p-3 border-b border-slate-200 bg-white space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ID, submitter, title…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-slate-50/60"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {["All", "Received", "Under Review", "Resolved"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === status
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                  No tickets found matching your filter.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  const replyCount = ((t as any).replies || []).length;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`p-3 transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? "bg-indigo-50/90 border-l-4 border-indigo-600"
                          : "hover:bg-slate-100/70 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {t.id}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            t.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : t.status === "Under Review"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-900 line-clamp-1 mb-1">
                        {t.title}
                      </h4>

                      <p className="text-slate-500 text-[11px] line-clamp-2 mb-1.5">
                        {t.description}
                      </p>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="truncate max-w-[140px]">
                          {t.userName || t.userEmail || "Anonymous"}
                        </span>
                        <div className="flex items-center gap-2">
                          {replyCount > 0 && (
                            <span className="font-semibold text-indigo-600">
                              💬 {replyCount}
                            </span>
                          )}
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Ticket Conversation & Reply Panel (7-8 cols) */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white overflow-hidden">
            {selectedTicket ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Selected Ticket Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-indigo-700 text-sm">
                        {selectedTicket.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-200 text-slate-700">
                        {selectedTicket.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          selectedTicket.priority === "Urgent"
                            ? "bg-rose-100 text-rose-800"
                            : selectedTicket.priority === "High"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {selectedTicket.priority} Priority
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedTicket.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {selectedTicket.userName || "User"}
                      </span>
                      {selectedTicket.userEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {selectedTicket.userEmail}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status Selector */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleStatusChange(
                          selectedTicket.id,
                          e.target.value as "Received" | "Under Review" | "Resolved"
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white cursor-pointer"
                    >
                      <option value="Received">Status: Received</option>
                      <option value="Under Review">Status: Under Review</option>
                      <option value="Resolved">Status: Resolved</option>
                    </select>

                    <button
                      onClick={() => handleDeleteTicket(selectedTicket.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Conversation Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Diagnostic Information Card */}
                  {selectedTicket.diagnostics && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 font-mono">
                      <div className="flex items-center justify-between text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                        <span>Diagnostic Ledger Snapshot</span>
                        <span>Logged: {new Date(selectedTicket.diagnostics.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Vendor Rows</div>
                          <div className="text-slate-900 font-bold text-sm">
                            {selectedTicket.diagnostics.vendorCount}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">SAP FBL1N Rows</div>
                          <div className="text-slate-900 font-bold text-sm">
                            {selectedTicket.diagnostics.buyerCount}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Matched Lines</div>
                          <div className="text-emerald-700 font-bold text-sm">
                            {selectedTicket.diagnostics.matchedCount}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Unmatched Pool</div>
                          <div className="text-amber-700 font-bold text-sm">
                            {selectedTicket.diagnostics.unmatchedCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Original User Issue Message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {selectedTicket.userName ? selectedTicket.userName[0].toUpperCase() : "U"}
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800">
                          {selectedTicket.userName || "User"} (Submitter)
                        </span>
                        <span className="text-[10.5px] text-slate-400">
                          {new Date(selectedTicket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>

                  {/* Threaded Replies */}
                  {((selectedTicket as any).replies || []).map((reply: TicketReply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        A
                      </div>
                      <div className="flex-1 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl rounded-tl-xs p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-indigo-950">
                            {reply.author} <span className="text-[10px] text-indigo-600 font-normal">({reply.role})</span>
                          </span>
                          <span className="text-[10.5px] text-slate-400">
                            {new Date(reply.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {reply.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Composer */}
                <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                  {/* Quick Response Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Quick Presets:
                    </span>
                    {QUICK_REPLIES.map((qr, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyQuickReply(qr)}
                        className="px-2 py-1 rounded-md text-[10.5px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {qr.title}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendReply} className="space-y-2">
                    <div className="relative">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your response to the user or record resolution steps..."
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={replyAuthor}
                          onChange={(e) => setReplyAuthor(e.target.value)}
                          placeholder="Your Name / Title"
                          className="px-2.5 py-1 rounded text-xs border border-slate-200 bg-white text-slate-700 w-44"
                        />
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span>Set status:</span>
                          <select
                            value={updateStatusOnReply}
                            onChange={(e) =>
                              setUpdateStatusOnReply(
                                e.target.value as "Received" | "Under Review" | "Resolved"
                              )
                            }
                            className="px-2 py-1 rounded text-xs border border-slate-200 bg-white"
                          >
                            <option value="Resolved">Resolved</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Received">Keep Received</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Reply
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="text-sm font-semibold text-slate-700">No Ticket Selected</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Select a feedback ticket from the left panel to inspect statement diagnostics and reply.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
