"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PiMagnifyingGlass, PiArrowRight } from "react-icons/pi";
import Footer from "@/app/components/footer";
import { LoaderCircle } from "lucide-react";

export default function OrderLookupContent() {
  const router = useRouter();
  const [orderCode, setOrderCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleaned = orderCode.trim();
    setLoading(true);
    if (!cleaned) {
      setError("Please enter your order code.");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(false);
    router.push(`/order/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] w-full">
      <div className="max-w-2xl mx-auto px-5 md:px-10 py-16 w-full pt-28">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B7280]">
            Gift Order Tracking
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#111827] mt-4">
            Look up your order
          </h1>
          <p className="text-sm text-[#6B7280] mt-3">
            Enter the order code from your confirmation email to view shipping
            updates and tracking details.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6"
        >
          <label
            htmlFor="order-code"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]"
          >
            Order Code
          </label>
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id="order-code"
                type="text"
                value={orderCode}
                onChange={(event) => setOrderCode(event.target.value)}
                placeholder="e.g. 9fa2bc31"
                className="w-full rounded-full border border-[#D1D5DB] bg-white py-3 pl-10 pr-4 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#A5914B]/30"
              />
            </div>
            <button
              disabled={loading}
              type="submit"
              className="disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] px-5 py-3 text-sm font-medium text-white border border-[#1F2937] hover:text-[#1F2937] hover:bg-white cursor-pointer"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                "Track order"
              )}
              <PiArrowRight className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-[#B91C1C]">{error}</p>}
          <p className="mt-4 text-xs text-[#6B7280]">
            Don&apos;t have your order code? Check your confirmation email or
            reach out to the registry host for assistance.
          </p>
        </form>

        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/"
            className="text-sm font-medium text-[#A5914B] hover:text-[#8B7A3F]"
          >
            Browse gifts
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
