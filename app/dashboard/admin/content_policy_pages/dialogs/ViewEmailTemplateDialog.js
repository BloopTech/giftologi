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

export default function ViewEmailTemplateDialog({ open, onOpenChange, template }) {
  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  if (!template) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl" />
      </Dialog>
    );
  }

  const updatedLabel = template.updated_at
    ? new Date(template.updated_at).toLocaleString()
    : template.created_at
    ? new Date(template.created_at).toLocaleString()
    : "—";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              View Email Template
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Template details and email body.
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
              <p className="font-medium">Template Name</p>
              <p className="text-[#6A7282]">{template.name || "Untitled template"}</p>
            </div>
            <div>
              <p className="font-medium">Status</p>
              <p className="text-[#6A7282] capitalize">{template.status || "inactive"}</p>
            </div>
            <div>
              <p className="font-medium">Category</p>
              <p className="text-[#6A7282]">{template.category || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Recipient Type</p>
              <p className="text-[#6A7282]">{template.recipient_type || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Last Updated</p>
              <p className="text-[#6A7282]">{updatedLabel}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Subject Line</p>
            <p className="text-[#6A7282] whitespace-pre-line">
              {template.subject || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Sender Name</p>
            <p className="text-[#6A7282] whitespace-pre-line">
              {template.sender_name || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Email Body (HTML)</p>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151] whitespace-pre-wrap max-h-80 overflow-auto">
              {template.body || "No email body available."}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
