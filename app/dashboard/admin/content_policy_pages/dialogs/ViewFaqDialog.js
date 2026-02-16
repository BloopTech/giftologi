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

export default function ViewFaqDialog({ open, onOpenChange, faq }) {
  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  if (!faq) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl" />
      </Dialog>
    );
  }

  const updatedLabel = faq.updated_at
    ? new Date(faq.updated_at).toLocaleString()
    : faq.created_at
    ? new Date(faq.created_at).toLocaleString()
    : "—";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              View FAQ
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Full question and answer details.
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

        <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="font-medium">Category</p>
              <p className="text-[#6A7282]">{faq.category || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Display Order</p>
              <p className="text-[#6A7282]">
                {typeof faq.sort_order === "number" ? faq.sort_order : "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Visibility</p>
              <p className="text-[#6A7282] capitalize">
                {faq.visibility || "public"}
              </p>
            </div>
            <div>
              <p className="font-medium">Last Updated</p>
              <p className="text-[#6A7282]">{updatedLabel}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Question</p>
            <p className="text-[#6A7282] whitespace-pre-line">
              {faq.question || "Untitled question"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Answer</p>
            <div
              className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151] max-h-80 overflow-auto prose prose-sm max-w-none prose-a:text-[#A5914B] prose-a:no-underline hover:prose-a:underline prose-a:font-medium"
              dangerouslySetInnerHTML={{
                __html: faq.answer || "<p class='text-[#717182] italic'>No answer provided.</p>",
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
