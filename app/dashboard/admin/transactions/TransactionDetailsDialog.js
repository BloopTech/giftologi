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
import { X } from "lucide-react";
import TransactionDetailsContent from "./TransactionDetailsContent";

export default function TransactionDetailsDialog({ open, onOpenChange, transaction }) {
  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  if (!transaction) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              Transaction Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              End-to-end view of order payments, items, delivery, and audit trail.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97373] text-white hover:bg-[#EF4444] cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <TransactionDetailsContent transaction={transaction} />
      </DialogContent>
    </Dialog>
  );
}
