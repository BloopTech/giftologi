"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function FinancialTabs(props) {
  const { state, isPending, selectedVendor, getFieldValue, onInputChange, hasError, height } = props;

  const errorFor = (key) => state?.errors?.[key] ?? [];

  return (
    <div className={`space-y-4 w-full ${height} scroll-smooth`}>
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Bank Account Details
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Account Name <span className="text-red-500">*</span></label>
            <input
              name="bankAccountName"
              type="text"
              required
              maxLength={50}
              value={getFieldValue("bankAccountName")}
              onChange={(e) => onInputChange("bankAccountName", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("bankAccountName") ? hasErrorInput : "",
              )}
              placeholder="Account name"
              disabled={isPending}
            />
            {hasError("bankAccountName") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("bankAccountName").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Account Number <span className="text-red-500">*</span></label>
            <input
              name="bankAccountNumber"
              type="tel"
              pattern="[0-9]*"
              inputMode="numeric"
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, "");
              }}
              required
              maxLength={20}
              value={getFieldValue("bankAccountNumber")}
              onChange={(e) => onInputChange("bankAccountNumber", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("bankAccountNumber") ? hasErrorInput : "",
              )}
              placeholder="0000000000"
              disabled={isPending}
            />
            {hasError("bankAccountNumber") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("bankAccountNumber").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Bank Name <span className="text-red-500">*</span></label>
            <input
              name="bankName"
              type="text"
              required
              maxLength={50}
              value={getFieldValue("bankName")}
              onChange={(e) => onInputChange("bankName", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("bankName") ? hasErrorInput : "",
              )}
              placeholder="Bank"
              disabled={isPending}
            />
            {hasError("bankName") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("bankName").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Branch Code (optional)</label>
            <input
              name="bankBranchCode"
              type="tel"
              pattern="[0-9]*"
              inputMode="numeric"
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, "");
              }}
              maxLength={10}
              value={getFieldValue("bankBranchCode")}
              onChange={(e) => onInputChange("bankBranchCode", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("bankBranchCode") ? hasErrorInput : "",
              )}
              placeholder="Branch code"
              disabled={isPending}
            />
            {hasError("bankBranchCode") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("bankBranchCode").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Branch Name <span className="text-red-500">*</span></label>
            <input
              name="bankBranch"
              type="text"
              required
              maxLength={50}
              value={getFieldValue("bankBranch")}
              onChange={(e) => onInputChange("bankBranch", e.target.value)}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("bankBranch") ? hasErrorInput : "",
              )}
              placeholder="Branch Name"
              disabled={isPending}
            />
            {hasError("bankBranch") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("bankBranch").map((err, index) => (
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
