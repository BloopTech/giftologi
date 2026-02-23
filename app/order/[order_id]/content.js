"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PiArrowLeft,
  PiPackage,
  PiTruck,
  PiClock,
  PiCheckCircle,
  PiWarning,
} from "react-icons/pi";
import Footer from "@/app/components/footer";

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

const statusMap = {
  created: {
    label: "Shipment created",
    tone: "bg-[#FEF3C7] text-[#B45309]",
    icon: PiClock,
  },
  shipped: {
    label: "In transit",
    tone: "bg-[#DBEAFE] text-[#1D4ED8]",
    icon: PiTruck,
  },
  delivered: {
    label: "Delivered",
    tone: "bg-[#DCFCE7] text-[#15803D]",
    icon: PiCheckCircle,
  },
  pending: {
    label: "Pending",
    tone: "bg-[#E0E7FF] text-[#4338CA]",
    icon: PiClock,
  },
};

export default function OrderTrackingContent({ orderCode }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delivery confirmation state
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const loadShipments = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/shipping/order-shipments/${orderCode}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load shipments");
        }

        if (active) {
          setShipments(Array.isArray(data?.shipments) ? data.shipments : []);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load shipments");
          setShipments([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadShipments();

    return () => {
      active = false;
    };
  }, [orderCode]);

  const latestShipment = shipments[0];

  const statusConfig = useMemo(() => {
    const key = (latestShipment?.status || "pending").toLowerCase();
    return (
      statusMap[key] || {
        label: latestShipment?.status || "Processing",
        tone: "bg-[#F3F4F6] text-[#4B5563]",
        icon: PiPackage,
      }
    );
  }, [latestShipment?.status]);

  const StatusIcon = statusConfig.icon || PiPackage;

  const canConfirm = useMemo(() => {
    if (confirmSuccess) return false;
    if (!latestShipment) return false;
    const key = (latestShipment.status || "").toLowerCase();
    return key === "shipped" || key === "delivered" || key === "in transit";
  }, [latestShipment, confirmSuccess]);

  const handleConfirmDelivery = async () => {
    const trimmed = confirmEmail.trim();
    if (!trimmed) {
      setConfirmError("Please enter your email address.");
      return;
    }
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const res = await fetch("/api/order/confirm-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode, email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to confirm delivery");
      }
      setConfirmSuccess(true);
    } catch (err) {
      setConfirmError(err.message || "Something went wrong");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] w-full">
      <div className="max-w-3xl mx-auto px-5 md:px-10 py-12 w-full pt-28">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
              Order Tracking
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-[#111827] mt-3">
              Track your gift delivery
            </h1>
            <p className="text-sm text-[#6B7280] mt-2">
              Order Code:{" "}
              <span className="font-medium text-[#111827]">{orderCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-[#D1D5DB] text-[#374151] text-sm hover:bg-white"
          >
            <PiArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-[#E5E7EB] rounded w-1/2" />
              <div className="h-4 bg-[#E5E7EB] rounded w-1/3" />
              <div className="h-24 bg-[#E5E7EB] rounded" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 text-[#B91C1C] bg-[#FEF2F2] rounded-xl p-4">
              <PiWarning className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-semibold">We couldn’t load shipment details.</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8">
              <PiPackage className="w-10 h-10 text-[#9CA3AF] mx-auto" />
              <h2 className="text-lg font-semibold text-[#111827] mt-4">
                Shipment in preparation
              </h2>
              <p className="text-sm text-[#6B7280] mt-2">
                Your order is confirmed. Shipping details will appear here once
                the vendor hands it over to the courier.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.tone}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.label}
                  </span>
                  <span className="text-sm text-[#6B7280]">
                    Updated {formatDate(latestShipment?.last_status_at)}
                  </span>
                </div>
                {latestShipment?.tracking_url && (
                  <Link
                    href={latestShipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937]"
                  >
                    <PiTruck className="w-4 h-4" />
                    Open live tracking
                  </Link>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">
                    Tracking Number
                  </p>
                  <p className="text-lg font-semibold text-[#111827] mt-2">
                    {latestShipment?.tracking_number || "—"}
                  </p>
                  {latestShipment?.shipment_reference && (
                    <p className="text-sm text-[#6B7280] mt-2">
                      Reference: {latestShipment.shipment_reference}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">
                    Courier
                  </p>
                  <p className="text-lg font-semibold text-[#111827] mt-2">
                    {latestShipment?.provider?.toUpperCase() || "Courier"}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-2">
                    Latest update: {latestShipment?.status || "Processing"}
                  </p>
                </div>
              </div>

              {shipments.length > 1 && (
                <div>
                  <p className="text-sm font-semibold text-[#111827] mb-3">
                    Previous shipments
                  </p>
                  <div className="space-y-3">
                    {shipments.slice(1).map((shipment) => (
                      <div
                        key={shipment.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            {shipment.tracking_number || "Shipment"}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {shipment.status || "Processing"}
                          </p>
                        </div>
                        <span className="text-xs text-[#6B7280]">
                          {formatDate(shipment.last_status_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delivery Confirmation Section */}
        {!loading && !error && shipments.length > 0 && canConfirm && (
          <div className="mt-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
            <div className="flex items-start gap-3">
              <PiCheckCircle className="w-5 h-5 text-[#15803D] mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#111827]">
                  Received your order?
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Confirm delivery by entering the email you used when placing
                  the order.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    disabled={confirmLoading}
                    className="flex-1 rounded-full border border-[#D1D5DB] px-4 py-2 text-sm outline-none focus:border-[#A5914B] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmDelivery}
                    disabled={confirmLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-[#15803D] text-white text-sm font-medium hover:bg-[#166534] disabled:opacity-50"
                  >
                    {confirmLoading ? "Confirming…" : "Confirm Delivery"}
                  </button>
                </div>
                {confirmError && (
                  <p className="mt-2 text-xs text-[#B91C1C]">{confirmError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {confirmSuccess && (
          <div className="mt-6 bg-[#DCFCE7] rounded-2xl border border-[#BBF7D0] p-6 flex items-start gap-3">
            <PiCheckCircle className="w-5 h-5 text-[#15803D] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#15803D]">
                Delivery confirmed!
              </p>
              <p className="text-xs text-[#166534] mt-1">
                Thank you for confirming that you received your order.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="sm:hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#D1D5DB] text-[#374151] text-sm hover:bg-white"
          >
            <PiArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Link
            href={`/order/${orderCode}/receipt`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#111827] text-white text-sm font-medium hover:bg-[#1F2937]"
          >
            View Receipt
          </Link>
          <Link
            href={`/order/${orderCode}/return`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[#D1D5DB] text-[#374151] text-sm font-medium hover:bg-white"
          >
            Return / Exchange
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#A5914B] text-white text-sm font-medium hover:bg-[#8B7A3F]"
          >
            Browse gifts
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
