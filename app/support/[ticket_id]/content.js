"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PiArrowLeft,
  PiPaperPlaneRight,
  PiClock,
  PiCheckCircle,
  PiUser,
  PiShieldCheck,
} from "react-icons/pi";
import { toast } from "sonner";
import Footer from "../../components/footer";
import { getOrCreateGuestBrowserId } from "../../utils/guest";

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
    hour: "numeric",
    minute: "2-digit",
  });
};

function MessageBubble({ msg, isOwn }) {
  const isAdmin = msg.sender_role === "admin";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAdmin
            ? "bg-[#F0F4FF] border border-[#BFDBFE]"
            : isOwn
            ? "bg-[#111827] text-white"
            : "bg-white border border-[#E5E7EB]"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {isAdmin ? (
            <PiShieldCheck className="w-3 h-3 text-blue-600" />
          ) : (
            <PiUser className="w-3 h-3 opacity-50" />
          )}
          <span
            className={`text-[10px] font-medium ${
              isAdmin
                ? "text-blue-600"
                : isOwn
                ? "text-white/70"
                : "text-[#6B7280]"
            }`}
          >
            {isAdmin ? "Support Team" : "You"}
          </span>
          <span
            className={`text-[10px] ${
              isOwn ? "text-white/50" : "text-[#9CA3AF]"
            }`}
          >
            {formatDate(msg.created_at)}
          </span>
        </div>
        <p
          className={`text-sm whitespace-pre-wrap ${
            isOwn && !isAdmin ? "text-white" : "text-[#111827]"
          }`}
        >
          {msg.message}
        </p>
      </div>
    </div>
  );
}

export default function TicketDetailContent() {
  const { ticket_id } = useParams();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token") || "";

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const guestId = getOrCreateGuestBrowserId();
      const res = await fetch(`/api/support/${ticket_id}`, {
        headers:
          guestId || accessToken
            ? {
                ...(guestId ? { "x-guest-id": guestId } : {}),
                ...(accessToken
                  ? { "x-support-access-token": accessToken }
                  : {}),
              }
            : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load ticket");
      }
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticket_id, accessToken]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      setSending(true);
      try {
        const guestId = getOrCreateGuestBrowserId();
        const res = await fetch(`/api/support/${ticket_id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(guestId ? { "x-guest-id": guestId } : {}),
            ...(accessToken ? { "x-support-access-token": accessToken } : {}),
          },
          body: JSON.stringify({ message: newMessage.trim(), guestId, accessToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send message");
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSending(false);
      }
    },
    [newMessage, ticket_id, accessToken]
  );

  const sc = statusConfig[ticket?.status] || statusConfig.open;

  if (loading) {
    return (
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="h-8 w-48 rounded bg-[#E5E7EB] animate-pulse mb-4" />
          <div className="h-64 bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />
        </div>
      </section>
    );
  }

  if (error || !ticket) {
    return (
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-sm text-red-600">{error || "Ticket not found"}</p>
          <Link
            href="/support"
            className="mt-3 inline-flex items-center gap-1 text-sm text-[#A5914B] hover:underline"
          >
            <PiArrowLeft className="w-4 h-4" /> Back to Support
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          {/* Back link */}
          <Link
            href="/support"
            className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#A5914B] mb-6 transition"
          >
            <PiArrowLeft className="w-4 h-4" /> All Tickets
          </Link>

          {/* Ticket header */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-[#111827] font-brasley-medium">
                  {ticket.subject}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}
                  >
                    {sc.label}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    Created {formatDate(ticket.created_at)}
                  </span>
                  {ticket.resolved_at && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                      <PiCheckCircle className="w-3 h-3" />
                      Resolved {formatDate(ticket.resolved_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {ticket.description && (
              <p className="text-sm text-[#374151] mt-3 whitespace-pre-wrap">
                {ticket.description}
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 min-h-[300px] flex flex-col">
            <p className="text-xs font-medium text-[#6B7280] mb-4">
              Conversation
            </p>

            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
              {messages.length === 0 ? (
                <div className="text-center py-10">
                  <PiClock className="w-8 h-8 mx-auto text-[#D1D5DB] mb-2" />
                  <p className="text-xs text-[#9CA3AF]">
                    No messages yet. Send a message below.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.sender_role === "user"}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply form */}
            {ticket.status !== "closed" && (
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 mt-4 pt-4 border-t border-[#E5E7EB]"
              >
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  maxLength={5000}
                  className="flex-1 rounded-xl border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A5914B] transition resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="p-2.5 bg-[#111827] text-white rounded-xl hover:bg-[#1F2937] disabled:opacity-40 transition cursor-pointer"
                >
                  <PiPaperPlaneRight className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
