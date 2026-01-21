"use client";

import React, { useEffect, useState, useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/Dialog";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { rejectProduct } from "./action";

const initialState = {
  message: "",
  errors: {
    productId: [],
    reason: [],
  },
  values: {},
  data: {},
};

export default function RejectProductDialog({ product, children, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(
    rejectProduct,
    initialState,
  );

  const hasErrors =
    state?.errors && Object.keys(state.errors || {}).some((value) => value?.length);

  useEffect(() => {
    if (!state?.message) return;

    if (state.data && Object.keys(state.data || {}).length && !hasErrors) {
      toast.success(state.message);
      onSuccess?.(state.data);
      setOpen(false);
      setReason("");
    } else if (hasErrors) {
      toast.error(state.message);
    }
  }, [state, hasErrors, onSuccess]);

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#DF0404]">
            Reject Product
          </DialogTitle>
          <DialogDescription className="text-xs text-[#717182]">
            Provide a reason for rejecting this product. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {product && (
          <form action={formAction} className="mt-3 space-y-4 text-xs">
            <input type="hidden" name="productId" value={product.id || ""} />
            <div className="space-y-1 text-[#0A0A0A]">
              <p className="font-medium">Product</p>
              <p className="text-[#6A7282]">
                {product.name || "Untitled product"}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">
                {product.vendorName || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="reject-product-reason"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-product-reason"
                name="reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={cx(
                  "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  state.errors?.reason?.length ? hasErrorInput : "",
                )}
                placeholder="Please provide a detailed reason for rejection."
                disabled={pending}
                required
              />
              {state.errors?.reason?.length ? (
                <div className="flex items-center gap-2 text-[11px] text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{state.errors.reason[0]}</span>
                </div>
              ) : null}
            </div>

            {state.message && hasErrors && !state.errors?.reason?.length ? (
              <div className="rounded-md bg-red-50 p-3 text-[11px] text-red-700">
                {state.message}
              </div>
            ) : null}

            <DialogFooter className="gap-3">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !reason.trim()}
                className={cx(
                  "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                  "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-600",
                  (pending || !reason.trim()) &&
                    "opacity-60 cursor-not-allowed hover:bg-red-500 hover:text-white",
                )}
              >
                {pending ? "Rejecting..." : "Reject Product"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
