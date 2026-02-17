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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { approveProduct } from "./action";

const initialState = {
  message: "",
  errors: {
    productId: [],
    serviceCharge: [],
    productType: [],
  },
  values: {},
  data: {},
};

export default function ApproveProductDialog({
  product,
  children,
  onSuccess,
}) {
  const [open, setOpen] = useState(false);
  const [serviceCharge, setServiceCharge] = useState("");
  const [productType, setProductType] = useState("");
  const [state, formAction, pending] = useActionState(
    approveProduct,
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
      setServiceCharge("");
      setProductType("");
    } else if (hasErrors) {
      toast.error(state.message);
    }
  }, [state, hasErrors, onSuccess]);

  useEffect(() => {
    if (!open) return;
    if (product?.serviceCharge != null) {
      setServiceCharge(String(product.serviceCharge));
    }
    if (product?.product_type) {
      setProductType(product.product_type);
    }
  }, [open, product?.serviceCharge, product?.product_type]);

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setServiceCharge("");
      setProductType("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
            Approve Product
          </DialogTitle>
          <DialogDescription className="text-xs text-[#717182]">
            Enter the service charge before approving this product.
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
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Product Type <span className="text-red-500">*</span>
              </label>
              <input type="hidden" name="productType" value={productType} />
              <Select
                value={productType}
                onValueChange={(value) => setProductType(value)}
                disabled={pending}
              >
                <SelectTrigger
                  className={cx("w-full rounded-md text-xs", focusInput)}
                  hasError={Boolean(state.errors?.productType?.length)}
                >
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical Product</SelectItem>
                  <SelectItem value="treat">Treat (Intangible Service)</SelectItem>
                </SelectContent>
              </Select>
              {state.errors?.productType?.length ? (
                <div className="flex items-center gap-2 text-[11px] text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{state.errors.productType[0]}</span>
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="approve-service-charge"
                className="text-xs font-medium text-[#0A0A0A]"
              >
                Service Charge (GHS) <span className="text-red-500">*</span>
              </label>
              <input
                id="approve-service-charge"
                name="serviceCharge"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={serviceCharge}
                onChange={(event) => setServiceCharge(event.target.value)}
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-"].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                className={cx(
                  "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  state.errors?.serviceCharge?.length ? hasErrorInput : "",
                )}
                placeholder="e.g. 10.00"
                disabled={pending}
                required
              />
              {state.errors?.serviceCharge?.length ? (
                <div className="flex items-center gap-2 text-[11px] text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{state.errors.serviceCharge[0]}</span>
                </div>
              ) : null}
            </div>

            {state.message && hasErrors && !state.errors?.serviceCharge?.length && !state.errors?.productType?.length ? (
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
                disabled={pending || !serviceCharge.trim() || !productType}
                className={cx(
                  "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                  "border-[#6EA30B] bg-[#6EA30B] text-white hover:bg-white hover:text-[#6EA30B]",
                  (pending || !serviceCharge.trim() || !productType) &&
                    "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white",
                )}
              >
                {pending ? "Approving..." : "Approve Product"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
