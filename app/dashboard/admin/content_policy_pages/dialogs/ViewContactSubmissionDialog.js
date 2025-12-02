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

export default function ViewContactSubmissionDialog({ open, onOpenChange, submission }) {
  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  if (!submission) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl" />
      </Dialog>
    );
  }

  const createdLabel = submission.created_at
    ? new Date(submission.created_at).toLocaleString()
    : "—";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              View Contact Message
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Message submitted via the public contact form.
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
              <p className="font-medium">Name</p>
              <p className="text-[#6A7282]">{submission.name || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-[#6A7282]">{submission.email || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Created At</p>
              <p className="text-[#6A7282]">{createdLabel}</p>
            </div>
            <div>
              <p className="font-medium">Status</p>
              <p className="text-[#6A7282] capitalize">
                {submission.status || "new"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Subject</p>
            <p className="text-[#6A7282] whitespace-pre-line">
              {submission.subject || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Message</p>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151] whitespace-pre-wrap max-h-80 overflow-auto">
              {submission.message || "No message body provided."}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
