"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function OwnerDetailsTab(props) {
  const { state, isPending } = props;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Owner / Primary Contact
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Full Name</label>
            <input
              name="ownerFullName"
              type="text"
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="John Mensah"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Email Address</label>
            <input
              name="ownerEmail"
              type="email"
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="john.mensah@example.com"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#717182]">Phone Number</label>
            <input
              name="ownerPhone"
              type="tel"
              className={cx(
                "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput
              )}
              placeholder="+233 24 000 0000"
              disabled={isPending}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
