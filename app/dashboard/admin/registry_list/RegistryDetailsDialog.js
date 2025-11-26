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
import RegistryDetailsContent from "./RegistryDetailsContent";

export default function RegistryDetailsDialog({ open, onOpenChange, registryRow }) {
  if (!open || !registryRow) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl" />
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && onOpenChange) {
          onOpenChange(false);
        } else if (onOpenChange) {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              Registry Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Complete registry information and guest activity.
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

        <RegistryDetailsContent registryRow={registryRow} />
      </DialogContent>
    </Dialog>
  );
}
