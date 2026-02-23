"use client";
import React, { useState, useEffect, useActionState } from "react";
import { useAdminSupportContext } from "./context";
import {
  updateTicketStatus,
  assignTicket,
  updateTicketPriority,
  adminReply,
} from "./action";
import { toast } from "sonner";
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Send,
  AlertTriangle,
  User,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../components/Select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../../components/Dialog";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusConfig = {
  open: { label: "Open", tone: "bg-[#FEF3C7] text-[#B45309]", icon: AlertTriangle },
  in_progress: { label: "In Progress", tone: "bg-[#DBEAFE] text-[#1D4ED8]", icon: Clock },
  resolved: { label: "Resolved", tone: "bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  closed: { label: "Closed", tone: "bg-[#F3F4F6] text-[#4B5563]", icon: XCircle },
};

const priorityConfig = {
  low: "bg-[#F3F4F6] text-[#6B7280]",
  normal: "bg-[#DBEAFE] text-[#1D4ED8]",
  high: "bg-[#FEF3C7] text-[#B45309]",
  urgent: "bg-[#FEE2E2] text-[#DC2626]",
};

const categoryLabels = {
  order: "Order",
  payment: "Payment",
  shipping: "Shipping",
  account: "Account",
  vendor: "Vendor",
  registry: "Registry",
  product: "Product",
  treat: "Treat",
  general: "General",
  other: "Other",
};

const initialFormState = { message: "", errors: {}, data: {} };

// ── Ticket Detail Panel ──────────────────────────────────────────

function TicketDetailPanel() {
  const {
    selectedTicket,
    setSelectedTicket,
    messages,
    loadingMessages,
    fetchMessages,
    refresh,
  } = useAdminSupportContext();

  const [statusState, statusAction, statusPending] = useActionState(
    updateTicketStatus,
    initialFormState
  );
  const [priorityState, priorityAction, priorityPending] = useActionState(
    updateTicketPriority,
    initialFormState
  );
  const [replyState, replyAction, replyPending] = useActionState(
    adminReply,
    initialFormState
  );
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (statusState?.success) {
      toast.success("Status updated");
      refresh();
    } else if (statusState?.message) {
      toast.error(statusState.message);
    }
  }, [statusState, refresh]);

  useEffect(() => {
    if (priorityState?.success) {
      toast.success("Priority updated");
      refresh();
    } else if (priorityState?.message) {
      toast.error(priorityState.message);
    }
  }, [priorityState, refresh]);

  useEffect(() => {
    if (replyState?.success) {
      toast.success("Reply sent");
      setReplyText("");
      if (selectedTicket?.id) fetchMessages(selectedTicket.id);
    } else if (replyState?.message) {
      toast.error(replyState.message);
    }
  }, [replyState, fetchMessages, selectedTicket?.id]);

  useEffect(() => {
    if (selectedTicket?.id) {
      setActiveTab("details");
    }
  }, [selectedTicket?.id]);

  if (!selectedTicket) return null;

  const ticket = selectedTicket;
  const sc = statusConfig[ticket.status] || statusConfig.open;
  const creator = ticket.creator;
  const fallbackGuestName =
    ticket.guest_name || ticket.guest_email || "Guest customer";
  const creatorName = creator
    ? [creator.firstname, creator.lastname].filter(Boolean).join(" ") ||
      creator.email
    : fallbackGuestName;
  const contactEmail = creator?.email || ticket.guest_email || null;

  return (
    <Dialog
      open={!!selectedTicket}
      onOpenChange={(open) => {
        if (!open) setSelectedTicket(null);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-base font-semibold text-[#111827]">
          {ticket.subject}
        </DialogTitle>

        {/* Steps */}
        <div className="mt-3 inline-flex items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === "details"
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conversation")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === "conversation"
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Conversation
            <span className="rounded-full bg-[#E5E7EB] px-1.5 py-0.5 text-[10px] text-[#4B5563]">
              {messages.length}
            </span>
          </button>
        </div>

        {activeTab === "details" ? (
          <>
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.tone}`}
              >
                {sc.label}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  priorityConfig[ticket.priority] || priorityConfig.normal
                }`}
              >
                {ticket.priority}
              </span>
              <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                {categoryLabels[ticket.category] || ticket.category}
              </span>
            </div>

            <div className="text-xs text-[#6B7280] mt-2 space-y-0.5">
              <p>
                <span className="font-medium">From:</span> {creatorName}
                {contactEmail ? ` (${contactEmail})` : ""}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {formatDate(ticket.created_at)}
              </p>
              {ticket.order_id && (
                <p>
                  <span className="font-medium">Order:</span> {ticket.order_id}
                </p>
              )}
            </div>

            {ticket.description && (
              <p className="text-sm text-[#374151] mt-3 whitespace-pre-wrap bg-[#F9FAFB] rounded-lg p-3 border border-[#E5E7EB]">
                {ticket.description}
              </p>
            )}

            {/* Admin actions */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
              {/* Status */}
              <form action={statusAction} className="flex items-center gap-1">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Select name="status" defaultValue={ticket.status}>
                  <SelectTrigger className="h-8 text-xs w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="submit"
                  disabled={statusPending}
                  className="px-3 h-8 text-xs font-medium bg-[#111827] text-white rounded-md hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                >
                  {statusPending ? "..." : "Set"}
                </button>
              </form>

              {/* Priority */}
              <form action={priorityAction} className="flex items-center gap-1">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Select name="priority" defaultValue={ticket.priority}>
                  <SelectTrigger className="h-8 text-xs w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="submit"
                  disabled={priorityPending}
                  className="px-3 h-8 text-xs font-medium bg-[#111827] text-white rounded-md hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                >
                  {priorityPending ? "..." : "Set"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="mt-3 pt-1">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] text-center py-6">
                No messages yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const isAdmin = msg.sender_role === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isAdmin ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          isAdmin
                            ? "bg-[#111827] text-white"
                            : "bg-[#F3F4F6] text-[#111827]"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          {isAdmin ? (
                            <ShieldCheck className="w-3 h-3 opacity-70" />
                          ) : (
                            <User className="w-3 h-3 opacity-50" />
                          )}
                          <span
                            className={`text-[10px] ${
                              isAdmin ? "text-white/60" : "text-[#6B7280]"
                            }`}
                          >
                            {isAdmin ? "Admin" : "User"} ·{" "}
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply */}
            <form action={replyAction} className="flex items-end gap-2 mt-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="message"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to the user..."
                rows={2}
                maxLength={5000}
                className="flex-1 rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs text-[#111827] outline-none focus:border-[#A5914B] transition resize-none"
              />
              <button
                type="submit"
                disabled={replyPending || !replyText.trim()}
                className="p-2 bg-[#111827] text-white rounded-lg hover:bg-[#1F2937] disabled:opacity-40 cursor-pointer"
              >
                {replyPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        )}

        <DialogClose className="absolute right-4 top-4 text-[#6B7280] hover:text-[#111827]">
          <XCircle className="w-5 h-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Content ─────────────────────────────────────────────────

export default function AdminSupportContent() {
  const {
    tickets,
    loading,
    error,
    metrics,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    refresh,
    setSelectedTicket,
  } = useAdminSupportContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-[#111827]">
          Support Tickets
        </h1>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Manage and respond to user support requests
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: metrics.total, color: "text-[#111827]" },
          { label: "Open", value: metrics.open, color: "text-[#B45309]" },
          {
            label: "In Progress",
            value: metrics.in_progress,
            color: "text-[#1D4ED8]",
          },
          {
            label: "Resolved",
            value: metrics.resolved,
            color: "text-[#15803D]",
          },
          { label: "Closed", value: metrics.closed, color: "text-[#4B5563]" },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3"
          >
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#D1D5DB] rounded-lg outline-none focus:border-[#A5914B] transition"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 text-xs w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 text-xs text-[#A5914B] hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" />
          <p className="text-sm text-[#6B7280]">No tickets found.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Subject
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    User
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Category
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Priority
                  </th>
                  <th className="px-4 py-3 font-medium text-[#6B7280]">
                    Date
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {tickets.map((ticket) => {
                  const sc =
                    statusConfig[ticket.status] || statusConfig.open;
                  const creator = ticket.creator;
                  const fallbackGuestName =
                    ticket.guest_name || ticket.guest_email || "Guest customer";
                  const name = creator
                    ? [creator.firstname, creator.lastname]
                        .filter(Boolean)
                        .join(" ") || creator.email
                    : fallbackGuestName;

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="px-4 py-3 font-medium text-[#111827] max-w-[200px] truncate">
                        {ticket.subject}
                      </td>
                      <td className="px-4 py-3 text-[#374151] max-w-[150px] truncate">
                        {name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-full text-[10px]">
                          {categoryLabels[ticket.category] || ticket.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.tone}`}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            priorityConfig[ticket.priority] ||
                            priorityConfig.normal
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail panel */}
      <TicketDetailPanel />
    </div>
  );
}
