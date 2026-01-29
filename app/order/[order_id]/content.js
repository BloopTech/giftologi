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

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="max-w-3xl mx-auto px-6 py-12">
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

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="sm:hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#D1D5DB] text-[#374151] text-sm hover:bg-white"
          >
            <PiArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#A5914B] text-white text-sm font-medium hover:bg-[#8B7A3F]"
          >
            Browse gifts
          </Link>
        </div>
      </div>
    </div>
  );
}
