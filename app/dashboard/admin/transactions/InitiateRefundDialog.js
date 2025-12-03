"use client";

import React, { useActionState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { toast } from "sonner";
import { cx } from "@/app/components/utils";
import { initiateOrderRefund } from "./action";

const initialRefundState = {
  message: "",
  errors: {
    orderId: [],
    reason: [],
  },
  values: {},
  data: {},
};

export default function InitiateRefundDialog({ open, onOpenChange, transaction }) {
  const [state, formAction, pending] = useActionState(
    initiateOrderRefund,
    initialRefundState
  );

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  useEffect(() => {
    if (!state) return;

    const hasData =
      state.message && state.data && Object.keys(state.data || {}).length > 0;
    const hasErrors =
      state.message && state.errors && Object.keys(state.errors || {}).length > 0;

    if (hasErrors) {
      toast.error(
        state.message || "The refund was not initiated. Please try again."
      );
    } else if (hasData) {
      toast.success(state.message || "Refund initiated.");
      onOpenChange?.(false);
    }
  }, [state, onOpenChange]);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (key) => (errorFor(key)?.length ?? 0) > 0;

  if (!transaction) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md" />
      </Dialog>
    );
  }

  const orderCodeLabel = transaction.orderCode || "—";
  const amountLabel = transaction.amountLabel
    ? `GHS ${transaction.amountLabel}`
    : "GHS —";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
            Initiate Refund
          </DialogTitle>
          <DialogDescription className="text-xs text-[#717182]">
            Are you sure you want to initiate a refund for this order?
          </DialogDescription>
        </DialogHeader>

        <form
          action={formAction}
          className="mt-3 space-y-4 text-xs text-[#0A0A0A]"
        >
          <input
            type="hidden"
            name="orderId"
            value={transaction.id || ""}
          />

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 space-y-1 text-[11px] text-[#374151]">
            <p>
              Order ID:
              <span className="ml-1 font-medium text-[#0A0A0A]">
                {orderCodeLabel}
              </span>
            </p>
            <p>
              Amount:
              <span className="ml-1 font-medium text-[#0A0A0A]">
                {amountLabel}
              </span>
            </p>
            <p className="pt-1 text-[#6A7282]">
              The refund will be processed through ExpressPay and the customer
              will be notified.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#0A0A0A]">
              Refund Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              rows={3}
              required
              defaultValue={state?.values?.reason ?? ""}
              placeholder="Please provide a reason for the refund..."
              className={cx(
                "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
              )}
              disabled={pending}
            />
            {hasError("reason") && (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor("reason").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                disabled={pending}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full border border-[#F97373] bg-[#F97373] px-6 py-2 text-xs font-medium text-white hover:bg-[#EF4444] hover:border-[#EF4444] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Initiate Refund
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
