"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function DocumentsNotesTab(props) {
  const { state, isPending } = props;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Verification Checklist
        </p>
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
          <textarea
            name="verificationNotes"
            rows={3}
            className={cx(
              "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
              "border-[#93C5FD] text-[#1D4ED8] placeholder:text-[#60A5FA]",
              focusInput
            )}
            placeholder="Internal notes for document verification."
            disabled={isPending}
          />
        </div>
      </section>
    </div>
  );
}
