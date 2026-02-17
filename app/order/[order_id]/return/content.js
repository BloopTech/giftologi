"use client";
import React, { useState } from "react";
import Link from "next/link";
import { PiArrowLeft, PiCheckCircle, PiWarning } from "react-icons/pi";
import { RotateCcw, ArrowLeftRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";

export default function ReturnRequestContent({
  orderCode,
  verifiedEmail = "",
  orderItems = [],
}) {
  const [step, setStep] = useState("form"); // form | success | error
  const [email] = useState(verifiedEmail);
  const [name, setName] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("all_items");
  const [requestType, setRequestType] = useState("return");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!reason.trim()) {
      setErrorMsg("Please provide a reason for your request.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/return-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_code: orderCode,
          guest_email: email.trim(),
          guest_name: name.trim() || null,
          order_item_id:
            selectedItemId && selectedItemId !== "all_items"
              ? selectedItemId
              : null,
          request_type: requestType,
          reason: reason.trim(),
          details: details.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data.request);
      setStep("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reasonOptions = [
    "Item arrived damaged",
    "Wrong item received",
    "Item does not match description",
    "Changed my mind",
    "Item arrived too late",
    "Quality not as expected",
    "Other",
  ];

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
              Return / Exchange
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-[#111827] mt-3">
              Request a return or exchange
            </h1>
            <p className="text-sm text-[#6B7280] mt-2">
              Order Code:{" "}
              <span className="font-medium text-[#111827]">{orderCode}</span>
            </p>
          </div>
          <Link
            href={`/order/${orderCode}`}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-[#D1D5DB] text-[#374151] text-sm hover:bg-white"
          >
            <PiArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {step === "success" ? (
          <div className="mt-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center">
              <PiCheckCircle className="w-7 h-7 text-[#15803D]" />
            </div>
            <h2 className="text-xl font-semibold text-[#111827]">
              Request submitted
            </h2>
            <p className="text-sm text-[#6B7280] max-w-sm mx-auto">
              Your {result?.request_type || "return"} request has been received.
              We&apos;ll review it and get back to you at{" "}
              <span className="font-medium text-[#111827]">{email}</span>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href={`/order/${orderCode}`}
                className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#111827] rounded-full hover:bg-[#1F2937]"
              >
                Track order
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-full hover:bg-white"
              >
                Browse gifts
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 space-y-5"
          >
            <div className="flex items-center gap-2 text-sm text-[#6B7280] bg-[#F9FAFB] rounded-xl px-3 py-2">
              <span>Verified as</span>
              <span className="font-medium text-[#111827]">{email}</span>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 text-[#B91C1C] bg-[#FEF2F2] rounded-xl p-3">
                <PiWarning className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{errorMsg}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition disabled:opacity-50"
                />
              </div>
              {orderItems.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Which item?
                  </label>
                  <Select
                    value={selectedItemId}
                    onValueChange={(value) => setSelectedItemId(value)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="w-full rounded-xl py-2.5 text-sm">
                      <SelectValue placeholder="All items / entire order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_items">All items / entire order</SelectItem>
                      {orderItems.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.product?.name || "Product"} (x{item.quantity ?? 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Request type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRequestType("return")}
                  disabled={submitting}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition cursor-pointer ${
                    requestType === "return"
                      ? "border-[#A5914B] bg-[#FEFCE8] text-[#A5914B]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Return
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType("exchange")}
                  disabled={submitting}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition cursor-pointer ${
                    requestType === "exchange"
                      ? "border-[#A5914B] bg-[#FEFCE8] text-[#A5914B]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Exchange
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <Select value={reason || ""} onValueChange={setReason} disabled={submitting}>
                <SelectTrigger className="w-full rounded-xl py-2.5 text-sm">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Additional details
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Describe the issue in more detail (optional)"
                maxLength={1000}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 transition resize-none disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href={`/order/${orderCode}`}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#A5914B] border border-[#A5914B] rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit request"
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 sm:hidden">
          <Link
            href={`/order/${orderCode}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D1D5DB] text-[#374151] text-sm hover:bg-white"
          >
            <PiArrowLeft className="w-4 h-4" />
            Back to order
          </Link>
        </div>
      </div>
    </div>
  );
}
