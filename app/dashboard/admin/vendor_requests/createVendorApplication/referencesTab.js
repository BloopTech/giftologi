"use client";
import React from "react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function OwnerReferencesTab(props) {
  const { state, isPending } = props;

  return (
    <div className="space-y-4">
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
                defaultValue={state?.values?.[`ref${index}Name`] ?? ""}
                placeholder="Name"
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
                defaultValue={state?.values?.[`ref${index}Company`] ?? ""}
                placeholder="Company"
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
                defaultValue={state?.values?.[`ref${index}Phone`] ?? ""}
                placeholder="Phone"
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
                defaultValue={state?.values?.[`ref${index}Email`] ?? ""}
                placeholder="Email"
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
