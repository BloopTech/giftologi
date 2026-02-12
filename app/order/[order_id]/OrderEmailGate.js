"use client";
import React, { useState } from "react";
import { PiWarning } from "react-icons/pi";
import { Loader2, ShieldCheck } from "lucide-react";

export default function OrderEmailGate({ orderCode, onVerified, children }) {
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/orders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_code: orderCode,
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
        return;
      }

      setVerified(true);
      onVerified?.({ email: email.trim(), order: data.order, items: data.items });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 space-y-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                Verify your identity
              </h2>
              <p className="text-sm text-[#6B7280] mt-1">
                Enter the email address used when placing order{" "}
                <span className="font-medium text-[#111827]">{orderCode}</span>{" "}
                to continue.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-[#B91C1C] bg-[#FEF2F2] rounded-xl p-3">
              <PiWarning className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={verifying}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none hover:border-gray-400 focus:border-[#A5914B] transition disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#A5914B] rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
