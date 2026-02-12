"use client";
import React, { useState, useEffect, useActionState } from "react";
import { useDisputesContext } from "./context";
import { createDispute, updateDisputeStatus, addDisputeNote } from "./action";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Send,
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
  investigating: { label: "Investigating", tone: "bg-[#DBEAFE] text-[#1D4ED8]", icon: Clock },
  resolved: { label: "Resolved", tone: "bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  closed: { label: "Closed", tone: "bg-[#F3F4F6] text-[#4B5563]", icon: XCircle },
};

const priorityConfig = {
  low: "bg-[#F3F4F6] text-[#6B7280]",
  normal: "bg-[#DBEAFE] text-[#1D4ED8]",
  high: "bg-[#FEF3C7] text-[#B45309]",
  urgent: "bg-[#FEE2E2] text-[#DC2626]",
};

const initialFormState = { message: "", errors: {}, values: {}, data: {} };

export default function DisputesContent() {
  const {
    disputes,
    loading,
    error,
    metrics,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    searchTerm,
    setSearchTerm,
    refresh,
    selectedDispute,
    setSelectedDispute,
    notes,
    loadingNotes,
    pendingReturns,
  } = useDisputesContext();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState(searchTerm || "");

  // ── Create from return request ────────────────────────
  const [createFromReturn, setCreateFromReturn] = useState(null);

  const handleCreateFromReturn = (returnReq) => {
    setCreateFromReturn(returnReq);
    setCreateOpen(true);
  };

  return (
    <section className="flex flex-col space-y-4 w-full mb-8">
      {/* Header */}
      <div className="flex flex-col w-full">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
          Dispute Resolution
        </h1>
        <span className="text-[#717182] text-xs/4 font-brasley-medium">
          Manage customer disputes, returns, and refund requests with a structured lifecycle.
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open", value: metrics.open, color: "border-[#FBBF24]" },
          { label: "Investigating", value: metrics.investigating, color: "border-[#3B82F6]" },
          { label: "Resolved", value: metrics.resolved, color: "border-[#22C55E]" },
          { label: "Total", value: metrics.total, color: "border-[#6B7280]" },
        ].map((m) => (
          <div
            key={m.label}
            className={`flex flex-col space-y-1 bg-white rounded-xl border border-[#D6D6D6] p-3 border-b-2 ${m.color}`}
          >
            <span className="text-[#717182] text-[11px]">{m.label}</span>
            <span className="text-[#0A0A0A] font-medium text-sm">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Search + Filters + Create */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearchTerm(search)}
              placeholder="Search by subject, email, order code..."
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[150px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[150px]">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => { setCreateFromReturn(null); setCreateOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-white text-xs font-medium border border-primary cursor-pointer hover:bg-white hover:text-primary transition-colors"
        >
          <Plus className="size-3.5" />
          New Dispute
        </button>
      </div>

      {/* Pending Return Requests Banner */}
      {pendingReturns.length > 0 && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 space-y-3">
          <p className="text-xs font-medium text-[#92400E]">
            {pendingReturns.length} pending return request{pendingReturns.length > 1 ? "s" : ""} awaiting dispute creation
          </p>
          <div className="space-y-2">
            {pendingReturns.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-white rounded-lg border border-[#E5E7EB] px-3 py-2"
              >
                <div className="text-xs text-[#374151]">
                  <span className="font-medium">{r.order?.order_code || "—"}</span>
                  <span className="mx-1.5 text-[#9CA3AF]">·</span>
                  <span className="capitalize">{r.request_type}</span>
                  <span className="mx-1.5 text-[#9CA3AF]">·</span>
                  <span className="text-[#6B7280]">{r.reason}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateFromReturn(r)}
                  className="text-[11px] text-[#A5914B] font-medium hover:underline cursor-pointer whitespace-nowrap"
                >
                  Create Dispute
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: List + Detail */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Disputes List */}
        <div className="flex-1 bg-white rounded-xl border border-[#D6D6D6] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-[#717182]" />
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-red-600">{error}</div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="size-8 text-[#D1D5DB] mb-3" />
              <p className="text-sm font-medium text-[#6B7280]">No disputes found</p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try clearing filters."
                  : "Disputes will appear here when created."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {disputes.map((d) => {
                const sc = statusConfig[d.status] || statusConfig.open;
                const StatusIcon = sc.icon;
                const isSelected = selectedDispute?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDispute(d)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors ${
                      isSelected ? "bg-[#F9FAFB] border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.tone}`}>
                          <StatusIcon className="size-3" />
                          {sc.label}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${priorityConfig[d.priority] || ""}`}>
                          {d.priority}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#0A0A0A] truncate">
                        {d.subject}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {d.order?.order_code || "—"} · {d.guest_email || d.order?.buyer_email || "—"} · {formatDate(d.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-[#D1D5DB] shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-full md:w-[400px] shrink-0 hidden md:block">
          {selectedDispute ? (
            <DisputeDetailPanel
              dispute={selectedDispute}
              notes={notes}
              loadingNotes={loadingNotes}
              onRefresh={refresh}
              onClose={() => setSelectedDispute(null)}
            />
          ) : (
            <div className="h-full bg-white rounded-xl border border-[#D6D6D6] flex items-center justify-center">
              <p className="text-xs text-[#9CA3AF]">Select a dispute to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dispute Dialog */}
      <CreateDisputeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        returnRequest={createFromReturn}
        onSuccess={() => {
          setCreateOpen(false);
          setCreateFromReturn(null);
          refresh();
        }}
      />
    </section>
  );
}

// ── Detail Panel ────────────────────────────────────────────────

function DisputeDetailPanel({ dispute, notes, loadingNotes, onRefresh, onClose }) {
  const sc = statusConfig[dispute.status] || statusConfig.open;
  const StatusIcon = sc.icon;

  const [statusState, statusAction, statusPending] = useActionState(
    updateDisputeStatus,
    initialFormState
  );
  const [noteState, noteAction, notePending] = useActionState(
    addDisputeNote,
    initialFormState
  );
  const [noteContent, setNoteContent] = useState("");
  const [newStatus, setNewStatus] = useState(dispute.status);
  const [resolution, setResolution] = useState(dispute.resolution || "");

  useEffect(() => {
    setNewStatus(dispute.status);
    setResolution(dispute.resolution || "");
  }, [dispute.id, dispute.status, dispute.resolution]);

  useEffect(() => {
    if (statusState?.status_code === 200) {
      toast.success(statusState.message);
      onRefresh();
    } else if (statusState?.message && Object.keys(statusState.errors || {}).length > 0) {
      toast.error(statusState.message);
    }
  }, [statusState, onRefresh]);

  useEffect(() => {
    if (noteState?.status_code === 200) {
      toast.success(noteState.message);
      setNoteContent("");
      onRefresh();
    } else if (noteState?.message && Object.keys(noteState.errors || {}).length > 0) {
      toast.error(noteState.message);
    }
  }, [noteState, onRefresh]);

  return (
    <div className="h-full bg-white rounded-xl border border-[#D6D6D6] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.tone}`}>
            <StatusIcon className="size-3" />
            {sc.label}
          </span>
          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${priorityConfig[dispute.priority] || ""}`}>
            {dispute.priority}
          </span>
          <span className="text-[10px] text-[#9CA3AF] capitalize">{dispute.dispute_type}</span>
        </div>
        <p className="text-xs font-semibold text-[#0A0A0A]">{dispute.subject}</p>
        <p className="text-[11px] text-[#6B7280] mt-0.5">
          Order: {dispute.order?.order_code || "—"} · Created: {formatDate(dispute.created_at)}
        </p>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Description */}
        {dispute.description && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">Description</p>
            <p className="text-xs text-[#374151] whitespace-pre-wrap">{dispute.description}</p>
          </div>
        )}

        {/* Contact */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-[#9CA3AF]">Guest</p>
            <p className="text-[#0A0A0A]">{dispute.guest_name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF]">Email</p>
            <p className="text-[#0A0A0A] break-all">{dispute.guest_email || "—"}</p>
          </div>
        </div>

        {/* Resolution */}
        {dispute.resolution && (
          <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#15803D] mb-1">Resolution</p>
            <p className="text-xs text-[#166534] whitespace-pre-wrap">{dispute.resolution}</p>
          </div>
        )}

        {/* Status Update Form */}
        <form action={statusAction} className="space-y-2 border-t border-[#E5E7EB] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">Update Status</p>
          <input type="hidden" name="disputeId" value={dispute.id} />
          <select
            name="status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={statusPending}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none"
          >
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          {(newStatus === "resolved" || newStatus === "closed") && (
            <textarea
              name="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Resolution notes..."
              rows={2}
              disabled={statusPending}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none resize-none"
            />
          )}
          <button
            type="submit"
            disabled={statusPending || newStatus === dispute.status}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-[#111827] rounded-full hover:bg-[#1F2937] disabled:opacity-40 cursor-pointer"
          >
            {statusPending ? "Updating..." : "Update Status"}
          </button>
        </form>

        {/* Notes */}
        <div className="border-t border-[#E5E7EB] pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
            Notes ({notes.length})
          </p>

          {loadingNotes ? (
            <p className="text-[11px] text-[#9CA3AF]">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-[11px] text-[#9CA3AF]">No notes yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-[#F9FAFB] p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-[#374151]">
                      {n.author_name || "Admin"}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-[#374151] whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add Note Form */}
          <form action={noteAction} className="flex gap-2">
            <input type="hidden" name="disputeId" value={dispute.id} />
            <input
              type="text"
              name="content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a note..."
              disabled={notePending}
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none"
            />
            <button
              type="submit"
              disabled={notePending || !noteContent.trim()}
              className="p-2 rounded-full bg-[#111827] text-white hover:bg-[#1F2937] disabled:opacity-40 cursor-pointer"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Create Dispute Dialog ───────────────────────────────────────

function CreateDisputeDialog({ open, onOpenChange, returnRequest, onSuccess }) {
  const [state, formAction, isPending] = useActionState(createDispute, initialFormState);

  useEffect(() => {
    if (state?.status_code === 200) {
      toast.success(state.message);
      onSuccess?.();
    } else if (state?.message && Object.keys(state.errors || {}).length > 0) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  const r = returnRequest;
  const defaultSubject = r
    ? `${r.request_type === "exchange" ? "Exchange" : "Return"} request — ${r.order?.order_code || "Order"}`
    : "";
  const defaultDescription = r
    ? `${r.reason}${r.details ? `\n\nDetails: ${r.details}` : ""}`
    : "";
  const defaultType = r?.request_type === "exchange" ? "exchange" : r ? "return" : "other";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-2xl shadow-xl p-6">
        <DialogTitle className="text-sm font-semibold text-[#0A0A0A] mb-3">
          {r ? "Create Dispute from Return Request" : "New Dispute"}
        </DialogTitle>

        <form action={formAction} className="space-y-3">
          {r && (
            <>
              <input type="hidden" name="returnRequestId" value={r.id} />
              <input type="hidden" name="orderItemId" value={r.order_item_id || ""} />
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#374151]">Order ID</label>
            <input
              type="text"
              name="orderId"
              defaultValue={r?.order_id || ""}
              required
              placeholder="UUID of the order"
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151]">Type</label>
              <select
                name="disputeType"
                defaultValue={defaultType}
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none"
              >
                <option value="return">Return</option>
                <option value="exchange">Exchange</option>
                <option value="refund">Refund</option>
                <option value="damaged">Damaged</option>
                <option value="missing">Missing</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151]">Priority</label>
              <select
                name="priority"
                defaultValue="normal"
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#374151]">Subject</label>
            <input
              type="text"
              name="subject"
              defaultValue={defaultSubject}
              required
              maxLength={200}
              placeholder="Brief summary"
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#374151]">Description</label>
            <textarea
              name="description"
              defaultValue={defaultDescription}
              rows={3}
              maxLength={2000}
              placeholder="Detailed description"
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none resize-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151]">Guest Email</label>
              <input
                type="email"
                name="guestEmail"
                defaultValue={r?.guest_email || ""}
                placeholder="guest@email.com"
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151]">Guest Name</label>
              <input
                type="text"
                name="guestName"
                defaultValue={r?.guest_name || ""}
                placeholder="Optional"
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <DialogClose asChild>
              <button
                type="button"
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium text-[#374151] border border-gray-300 rounded-full hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-white bg-primary border border-primary rounded-full hover:bg-white hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create Dispute"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
