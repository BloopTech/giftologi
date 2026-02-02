"use client";

import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function FlagProductDialog({
  open,
  onOpenChange,
  product,
  flagAction,
  flagPending,
  hasFlagError,
  flagErrorFor,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
            Flag Product
          </DialogTitle>
          <DialogDescription className="text-xs text-[#717182]">
            Create an escalated support ticket for this product.
          </DialogDescription>
        </DialogHeader>
        {product && (
          <form action={flagAction} className="mt-3 space-y-4">
            <input type="hidden" name="productId" value={product.id || ""} />

            <div className="space-y-1 text-xs text-[#0A0A0A]">
              <p className="font-medium">Product</p>
              <p className="text-[#6A7282]">{product.name || "Untitled product"}</p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="flag-reason"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Reason (optional)
              </label>
              <textarea
                id="flag-reason"
                name="reason"
                rows={3}
                className={cx(
                  "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasFlagError("reason") ? hasErrorInput : ""
                )}
                placeholder="Describe why this product needs attention"
                disabled={flagPending}
              />
              {hasFlagError("reason") && (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {flagErrorFor("reason").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={flagPending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={flagPending}
                className="inline-flex items-center justify-center rounded-full border border-yellow-500 bg-yellow-500 px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-yellow-600 cursor-pointer"
              >
                {flagPending ? "Flagging..." : "Flag Product"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
