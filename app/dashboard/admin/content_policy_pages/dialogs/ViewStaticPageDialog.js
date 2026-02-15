"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { X, FileText, Layout } from "lucide-react";

const TABS = [
  { id: "details", label: "Details", icon: Layout },
  { id: "content", label: "Content", icon: FileText },
];

export default function ViewStaticPageDialog({ open, onOpenChange, page }) {
  const [activeTab, setActiveTab] = useState("details");

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    if (!next) setActiveTab("details");
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
              <X className="size-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        {/* Tabs */}
        <div className="mt-3 border-b border-[#E5E7EB]">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-[1px] ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-[#717182] hover:text-[#0A0A0A]"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-3">
          {activeTab === "details" && (
            <div className="space-y-3 text-xs text-[#0A0A0A]">
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
            </div>
          )}

          {activeTab === "content" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#0A0A0A]">Body Content</p>
              <div
                className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151] overflow-auto"
                style={{ maxHeight: "60vh", minHeight: "200px" }}
              >
                {page.content ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                  />
                ) : (
                  <p className="text-[#717182] italic">No body content available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
