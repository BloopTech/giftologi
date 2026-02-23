"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PiTicket,
  PiPlus,
  PiClock,
  PiCheckCircle,
  PiSpinner,
  PiCaretRight,
  PiX,
} from "react-icons/pi";
import { toast } from "sonner";
import { useSupportContext } from "./context";
import Footer from "../components/footer";
import { getOrCreateGuestBrowserId } from "../utils/guest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/Select";

const categoryOptions = [
  { value: "order", label: "Order Issue" },
  { value: "payment", label: "Payment" },
  { value: "shipping", label: "Shipping & Delivery" },
  { value: "registry", label: "Registry" },
  { value: "account", label: "Account" },
  { value: "vendor", label: "Vendor" },
  { value: "product", label: "Product" },
  { value: "treat", label: "Treat" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const statusConfig = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-600" },
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function TicketRow({ ticket }) {
  const sc = statusConfig[ticket.status] || statusConfig.open;
  const catLabel =
    categoryOptions.find((c) => c.value === ticket.category)?.label ||
    ticket.category;

  return (
    <Link
      href={`/support/${ticket.id}`}
      className="flex items-center justify-between gap-3 p-4 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#A5914B]/40 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111827] truncate group-hover:text-[#A5914B] transition-colors">
          {ticket.subject}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}
          >
            {sc.label}
          </span>
          <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {catLabel}
          </span>
          <span className="text-[10px] text-[#9CA3AF]">
            {formatDate(ticket.created_at)}
          </span>
        </div>
      </div>
      <PiCaretRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#A5914B] shrink-0" />
    </Link>
  );
}

function GuestTicketRecoveryCard() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleRecover = useCallback(
    async (e) => {
      e.preventDefault();
      const normalized = email.trim();
      if (!normalized) {
        toast.error("Enter the email used for your ticket");
        return;
      }

      setSending(true);
      try {
        const res = await fetch("/api/support/recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to request recovery links");
        }

        toast.success(
          "If tickets exist for that email, recovery links are on the way."
        );
        setEmail("");
      } catch (error) {
        toast.error(error.message || "Unable to process recovery request");
      } finally {
        setSending(false);
      }
    },
    [email]
  );

  return (
    <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-sm font-medium text-[#111827]">Can&apos;t find your guest tickets?</p>
      <p className="mt-1 text-xs text-[#6B7280]">
        Enter the checkout email and we&apos;ll send direct ticket recovery links.
      </p>
      <form onSubmit={handleRecover} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={254}
          className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition"
        />
        <button
          type="submit"
          disabled={sending}
          className="shrink-0 rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937] disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send Recovery Links"}
        </button>
      </form>
    </div>
  );
}

function NewTicketDialog({ open, onClose, onCreated }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!subject.trim()) {
        toast.error("Subject is required");
        return;
      }
      setSubmitting(true);
      try {
        const guestId = getOrCreateGuestBrowserId();
        const res = await fetch("/api/support", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(guestId ? { "x-guest-id": guestId } : {}),
          },
          body: JSON.stringify({
            subject: subject.trim(),
            description: description.trim(),
            category,
            guestName: guestName.trim(),
            guestEmail: guestEmail.trim(),
            orderCode: orderCode.trim(),
            guestId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create ticket");
        toast.success("Ticket created");
        setSubject("");
        setDescription("");
        setCategory("general");
        setGuestName("");
        setGuestEmail("");
        setOrderCode("");
        onCreated?.();
        onClose?.();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSubmitting(false);
      }
    },
    [
      subject,
      description,
      category,
      guestName,
      guestEmail,
      orderCode,
      onCreated,
      onClose,
    ]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
        >
          <PiX className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-[#111827] mb-1">
          New Support Ticket
        </h2>
        <p className="text-xs text-[#6B7280] mb-5">
          Describe your issue and we&apos;ll get back to you as soon as possible.
          Add your checkout email so we can track guest orders.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Category
            </label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              maxLength={200}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Name used at checkout"
                maxLength={120}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Email <span className="text-[#9CA3AF]">(required for guests)</span>
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Email used at checkout"
                maxLength={254}
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Order Code <span className="text-[#9CA3AF]">(optional)</span>
            </label>
            <input
              type="text"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="e.g. 4f9d2a80b15b6a7c"
              maxLength={80}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              rows={4}
              maxLength={5000}
              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SupportContent() {
  const { tickets, loading, error, metrics, refresh } = useSupportContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const isUnauthorized =
    typeof error === "string" && /unauthorized/i.test(error);

  const goToLogin = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent("/support")}`);
  }, [router]);

  return (
    <>
      <section className="min-h-screen bg-[#FAFAFA] w-full">
        <div className="mx-auto max-w-3xl py-10 pt-34 w-full px-5 md:px-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold text-[#111827] font-brasley-medium">
                Support
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                View your tickets or create a new one
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition cursor-pointer"
            >
              <PiPlus className="w-4 h-4" />
              New Ticket
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Total",
                value: metrics.total,
                icon: PiTicket,
                color: "text-[#111827]",
              },
              {
                label: "Open",
                value: metrics.open,
                icon: PiClock,
                color: "text-blue-600",
              },
              {
                label: "In Progress",
                value: metrics.inProgress,
                icon: PiSpinner,
                color: "text-yellow-600",
              },
              {
                label: "Resolved",
                value: metrics.resolved,
                icon: PiCheckCircle,
                color: "text-green-600",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center"
              >
                <m.icon className={`w-5 h-5 mx-auto mb-1 ${m.color}`} />
                <p className="text-lg font-bold text-[#111827]">{m.value}</p>
                <p className="text-[10px] text-[#6B7280]">{m.label}</p>
              </div>
            ))}
          </div>

          <GuestTicketRecoveryCard />

          {/* Ticket list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-white border border-[#E5E7EB] rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-red-600">
                {isUnauthorized
                  ? "Sign in to view existing tickets, or create a new guest ticket below using your checkout email."
                  : error}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                {isUnauthorized ? (
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition cursor-pointer"
                  >
                    Sign in
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={refresh}
                  className="text-sm text-[#A5914B] hover:underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <PiTicket className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-sm text-[#6B7280]">
                No support tickets yet.
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Click &quot;New Ticket&quot; to get help.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewTicketDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={refresh}
      />

      <Footer />
    </>
  );
}
