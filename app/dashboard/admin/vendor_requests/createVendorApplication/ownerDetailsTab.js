"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function OwnerDetailsTab(props) {
  const {
    state,
    isPending,
    getFieldValue,
    onInputChange,
    hasError,
    disableIdentityFields = true,
    height
  } = props;

  const errorFor = (key) => state?.errors?.[key] ?? [];

  return (
    <div className={`space-y-4 w-full ${height} scroll-smooth`}>
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Owner / Primary Contact
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Full Name <span className="text-red-500">*</span></label>
            <input
              name="ownerFullName"
              type="text"
              maxLength={50}
              required
              value={getFieldValue("ownerFullName")}
              onChange={(e) => onInputChange("ownerFullName", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("ownerFullName") ? hasErrorInput : "",
              )}
              placeholder="John Mensah"
              disabled={isPending || disableIdentityFields}
            />
            {hasError("ownerFullName") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("ownerFullName").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Email Address <span className="text-red-500">*</span></label>
            <input
              name="ownerEmail"
              required
              type="email"
              maxLength={50}
              value={getFieldValue("ownerEmail")}
              onChange={(e) => onInputChange("ownerEmail", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("ownerEmail") ? hasErrorInput : "",
              )}
              placeholder="john.mensah@example.com"
              disabled={isPending || disableIdentityFields}
            />
            {hasError("ownerEmail") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("ownerEmail").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Phone Number <span className="text-red-500">*</span></label>
            <input
              name="ownerPhone"
              type="tel"
              maxLength={15}
              required
              value={getFieldValue("ownerPhone")}
              onChange={(e) => {
                // Only allow phone number characters: +, digits, spaces, hyphens, parentheses
                const phoneValue = e.target.value.replace(/[^+0-9\s\-\(\)]/g, "");
                onInputChange("ownerPhone", phoneValue);
              }}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("ownerPhone") ? hasErrorInput : "",
              )}
              placeholder="+233 24 000 0000"
              disabled={isPending || disableIdentityFields}
            />
            {hasError("ownerPhone") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("ownerPhone").map((err, index) => (
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
