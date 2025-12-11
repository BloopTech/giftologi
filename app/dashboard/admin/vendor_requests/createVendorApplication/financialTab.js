"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function FinancialTabs(props) {
  const { state, isPending, selectedVendor } = props;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Bank Account Details
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Account Name</label>
            <input
              name="bankAccountName"
              type="text"
              defaultValue={
                state?.values?.bankAccountName ??
                selectedVendor.businessName ??
                ""
              }
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="Account name"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Account Number</label>
            <input
              name="bankAccountNumber"
              type="text"
              defaultValue={state?.values?.bankAccountNumber ?? ""}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="0000000000"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Bank Name</label>
            <input
              name="bankName"
              type="text"
              defaultValue={state?.values?.bankName ?? ""}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="Bank"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Branch Code</label>
            <input
              name="bankBranchCode"
              type="text"
              defaultValue={state?.values?.bankBranchCode ?? ""}
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="Branch code"
              disabled={isPending}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
