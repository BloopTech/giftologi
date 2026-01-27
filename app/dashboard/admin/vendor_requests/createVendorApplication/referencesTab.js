"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function OwnerReferencesTab(props) {
  const { state, isPending, getFieldValue, onInputChange, height } = props;

  return (
    <div className={`space-y-4 w-full ${height} scroll-smooth`}>
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Business References
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          {[1, 2].map((index) => (
            <div
              key={index}
              className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-2"
            >
              <p className="text-[11px] font-medium text-[#4B5563]">
                Reference {index}
              </p>
              <input
                name={`ref${index}Name`}
                type="text"
                placeholder="Name"
                value={getFieldValue(`ref${index}Name`)}
                onChange={(e) => onInputChange(`ref${index}Name`, e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white mb-1",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput
                )}
                disabled={isPending}
              />
              <input
                name={`ref${index}Company`}
                type="text"
                placeholder="Company"
                value={getFieldValue(`ref${index}Company`)}
                onChange={(e) => onInputChange(`ref${index}Company`, e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white mb-1",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput
                )}
                disabled={isPending}
              />
              <input
                name={`ref${index}Phone`}
                type="tel"
                placeholder="Phone"
                value={getFieldValue(`ref${index}Phone`)}
                onChange={(e) => onInputChange(`ref${index}Phone`, e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white mb-1",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput
                )}
                disabled={isPending}
              />
              <input
                name={`ref${index}Email`}
                type="email"
                placeholder="Email"
                value={getFieldValue(`ref${index}Email`)}
                onChange={(e) => onInputChange(`ref${index}Email`, e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput
                )}
                disabled={isPending}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
