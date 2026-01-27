"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function BusinessAddressTab(props) {
  const { state, isPending, getFieldValue, onInputChange, hasError, height } = props;

  const errorFor = (key) => state?.errors?.[key] ?? [];

  return (
    <div className={`space-y-4 w-full ${height} scroll-smooth`}>
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Business Address
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              name="streetAddress"
              required
              maxLength={50}
              type="text"
              value={getFieldValue("streetAddress")}
              onChange={(e) => onInputChange("streetAddress", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("streetAddress") ? hasErrorInput : "",
              )}
              placeholder="123 Independence Ave"
              disabled={isPending}
            />
            {hasError("streetAddress") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("streetAddress").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">
              City <span className="text-red-500">*</span>
            </label>
            <input
              name="city"
              required
              maxLength={50}
              type="text"
              value={getFieldValue("city")}
              onChange={(e) => onInputChange("city", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("city") ? hasErrorInput : "",
              )}
              placeholder="Accra"
              disabled={isPending}
            />
            {hasError("city") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("city").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">
              Region <span className="text-red-500">*</span>
            </label>
            <input
              name="region"
              required
              maxLength={50}
              type="text"
              value={getFieldValue("region")}
              onChange={(e) => onInputChange("region", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("region") ? hasErrorInput : "",
              )}
              placeholder="Greater Accra"
              disabled={isPending}
            />
            {hasError("region") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("region").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">
              Digital Address <span className="text-red-500">*</span>
            </label>
            <input
              name="digitalAddress"
              type="text"
              required
              maxLength={50}
              value={getFieldValue("digitalAddress")}
              onChange={(e) => onInputChange("digitalAddress", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("digitalAddress") ? hasErrorInput : "",
              )}
              placeholder="GA-000-0000"
              disabled={isPending}
            />
            {hasError("digitalAddress") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("digitalAddress").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
