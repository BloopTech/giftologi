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

export default function ViewStaticPageDialog({ open, onOpenChange, page }) {
  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  if (!page) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl" />
      </Dialog>
    );
  }

  const updatedLabel = page.updated_at
    ? new Date(page.updated_at).toLocaleString()
    : page.created_at
    ? new Date(page.created_at).toLocaleString()
    : "—";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              View Page
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Static page details and latest content.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97373] text-white hover:bg-[#EF4444] cursor-pointer"
            >
              <span className="sr-only">Close</span>
              
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="font-medium">Title</p>
              <p className="text-[#6A7282]">{page.title || "Untitled page"}</p>
            </div>
            <div>
              <p className="font-medium">Slug</p>
              <p className="text-[#6A7282]">{page.slug || "—"}</p>
            </div>
            <div>
              <p className="font-medium">Status</p>
              <p className="text-[#6A7282] capitalize">{page.status || "draft"}</p>
            </div>
            <div>
              <p className="font-medium">Last Updated</p>
              <p className="text-[#6A7282]">{updatedLabel}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Meta Description</p>
            <p className="text-[#6A7282] whitespace-pre-line">
              {page.meta_description || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Body Content</p>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151] whitespace-pre-wrap max-h-80 overflow-auto">
              {page.content || "No body content available."}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
