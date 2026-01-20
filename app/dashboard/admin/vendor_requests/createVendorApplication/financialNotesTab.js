"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function FinancialNotesTab(props) {
  const { state, isPending, getFieldValue, onInputChange } = props;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Financial Verification Notes
        </p>
        <div className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
          <textarea
            name="financialVerificationNotes"
            rows={3}
            value={getFieldValue("financialVerificationNotes")}
            onChange={(e) => onInputChange("financialVerificationNotes", e.target.value)}
            className={cx(
              "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
              "border-[#FBBF24] text-[#92400E] placeholder:text-[#F59E0B]",
              focusInput
            )}
            placeholder="Bank account verification requirements or notes."
            disabled={isPending}
          />
        </div>
      </section>
    </div>
  );
}
