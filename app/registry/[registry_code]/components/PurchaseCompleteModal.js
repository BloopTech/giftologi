"use client";
import React from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../../../components/Dialog";
import { X, Check } from "lucide-react";

export default function PurchaseCompleteModal({
  open,
  onOpenChange,
  orderId,
  onTrackOrder,
  onContinueShopping,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm rounded-2xl shadow-xl p-8">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col items-center text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full border-4 border-[#4ECDC4] flex items-center justify-center mb-6">
            <Check className="h-12 w-12 text-[#4ECDC4]" strokeWidth={3} />
          </div>

          {/* Title */}
          <DialogTitle className="text-2xl font-semibold text-gray-900 mb-8">
            Purchase Complete!
          </DialogTitle>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => onTrackOrder?.(orderId)}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Track order
            </button>
            <button
              type="button"
              onClick={onContinueShopping}
              className="flex-1 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
