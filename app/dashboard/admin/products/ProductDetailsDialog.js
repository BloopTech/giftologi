"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";

export default function ProductDetailsDialog({ open, onOpenChange, product }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
            Product Details
          </DialogTitle>
          <DialogDescription className="text-xs text-[#717182]">
            View product information and context.
          </DialogDescription>
        </DialogHeader>
        {product && (
          <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
            {Array.isArray(product.images) && product.images.length ? (
              <div>
                <p className="font-medium mb-1">Images</p>
                <div className="flex flex-wrap gap-2">
                  {product.images.map((url, index) => (
                    <div
                      key={url || index}
                      className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200"
                    >
                      <Image
                        src={url}
                        alt={
                          index === 0
                            ? "Featured product image"
                            : "Product image"
                        }
                        className="h-full w-full object-cover"
                        fill
                        priority
                        sizes="64px"
                      />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 rounded-full bg-[#F97316] px-2 py-[2px] text-[10px] font-semibold text-white shadow-sm">
                          Featured
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="font-medium">Name</p>
              <p className="text-[#6A7282]">
                {product.name || "Untitled product"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-medium">Vendor</p>
                <p className="text-[#6A7282]">{product.vendorName || "—"}</p>
              </div>
              <div>
                <p className="font-medium">Category</p>
                <p className="text-[#6A7282]">{product.categoryName || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-medium">Price (GHS)</p>
                <p className="text-[#6A7282]">
                  {product.price != null
                    ? Number(product.price).toLocaleString("en-GH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="font-medium">Service Charge (GHS)</p>
                <p className="text-[#6A7282]">
                  {product.serviceCharge != null
                    ? Number(product.serviceCharge).toLocaleString("en-GH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="font-medium">Weight (kg)</p>
                <p className="text-[#6A7282]">
                  {product.weightKg != null
                    ? Number(product.weightKg).toLocaleString("en-GH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="font-medium">Stock</p>
                <p className="text-[#6A7282]">{product.stockQty ?? "—"}</p>
              </div>
              <div>
                <p className="font-medium">Total Price (GHS)</p>
                <p className="text-[#6A7282]">
                  {(() => {
                    const price = Number(product.price);
                    const charge = Number(product.serviceCharge);
                    const total =
                      (Number.isFinite(price) ? price : 0) +
                      (Number.isFinite(charge) ? charge : 0);
                    if (!Number.isFinite(total) || total <= 0) return "—";
                    return total.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  })()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-medium">Created</p>
                <p className="text-[#6A7282]">
                  {product.createdAt
                    ? new Date(product.createdAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="font-medium">Status</p>
                <p className="text-[#6A7282]">
                  {product.statusLabel || product.status}
                </p>
              </div>
            </div>
            <div>
              <p className="font-medium">Product ID</p>
              <p className="text-[#6A7282] break-all">
                {product.product_code || product.id}
              </p>
            </div>
            {product.normalizedStatus === "rejected" &&
            product.rejection_reason ? (
              <div>
                <p className="font-medium">Rejection Reason</p>
                <p className="text-[#6A7282] whitespace-pre-wrap">
                  {product.rejection_reason}
                </p>
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <button className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer">
              Close
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
