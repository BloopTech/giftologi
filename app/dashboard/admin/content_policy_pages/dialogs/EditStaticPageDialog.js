"use client";

import React, { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { Loader, X, Layout, FileText } from "lucide-react";
import { Switch } from "@/app/components/Switch";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import RichTextEditor from "@/app/components/RichTextEditor";
import { saveStaticPage } from "../action";
import { useContentsPolicyContext } from "../context";
import { toast } from "sonner";

const TABS = [
  { id: "details", label: "Details", icon: Layout },
  { id: "content", label: "Content", icon: FileText },
];

const initialState = {
  message: "",
  errors: {
    pageId: [],
    title: [],
    metaDescription: [],
    body: [],
    status: [],
  },
  values: {},
  data: {},
};

const errorFor = (state, key) => state?.errors?.[key] ?? [];
const hasError = (state, key) => (errorFor(state, key)?.length ?? 0) > 0;

export default function EditStaticPageDialog({ open, onOpenChange, page }) {
  const [activeTab, setActiveTab] = useState("details");
  const [state, formAction, pending] = useActionState(
    saveStaticPage,
    initialState,
  );
  const isEdit = !!page?.id;
  const { refresh } = useContentsPolicyContext() || {};

  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveTab("details");
      return;
    }
    const values = state?.values || {};
    setTitle(values.title ?? page?.title ?? "");
    setMetaDescription(values.metaDescription ?? page?.meta_description ?? "");
    setBody(values.body ?? page?.content ?? "");
    const rawStatus = values.status ?? page?.status ?? "draft";
    setIsPublished(String(rawStatus).toLowerCase() === "published");
  }, [open, page, state?.values]);

  useEffect(() => {
    if (!state?.message) return;

    const hasErrors =
      state?.errors &&
      Object.keys(state.errors).some((key) => (state.errors[key] || []).length);
    const hasData = state?.data && Object.keys(state.data).length > 0;

    if (hasErrors) {
      toast.error(state.message);
      // Switch to tab with error
      if (hasError(state, "body")) {
        setActiveTab("content");
      } else if (hasError(state, "title") || hasError(state, "metaDescription")) {
        setActiveTab("details");
      }
      return;
    }

    if (hasData) {
      toast.success(state.message);
      refresh?.();
      onOpenChange?.(false);
    }
  }, [state, refresh, onOpenChange]);

  const statusValue = isPublished ? "published" : "draft";
  const dialogTitle = isEdit ? "Edit Page" : "New Page";
  const primaryLabel = isEdit ? "Save Page" : "Create Page";

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    if (!next) setActiveTab("details");
    onOpenChange(!!next);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const formData = new FormData();
    formData.append("pageId", page?.id || "");
    formData.append("title", title);
    formData.append("metaDescription", metaDescription);
    formData.append("body", body);
    formData.append("status", statusValue);
    formAction(formData);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Update page content using the WYSIWYG editor.
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
              const hasTabError =
                tab.id === "details"
                  ? hasError(state, "title") || hasError(state, "metaDescription")
                  : hasError(state, "body");
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-[#717182] hover:text-[#0A0A0A]"
                  } ${hasTabError ? "text-red-500" : ""}`}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                  {hasTabError && (
                    <span className="ml-0.5 size-1.5 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-[#0A0A0A]"
                  htmlFor="meta-title"
                >
                  Meta Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="meta-title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Terms & Conditions - Giftologi"
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasError(state, "title") ? hasErrorInput : "",
                  )}
                  disabled={pending}
                />
                {hasError(state, "title") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {errorFor(state, "title").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-[#0A0A0A]"
                  htmlFor="meta-description"
                >
                  Meta Description
                </label>
                <input
                  id="meta-description"
                  name="metaDescription"
                  type="text"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Read our terms and conditions"
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasError(state, "metaDescription") ? hasErrorInput : "",
                  )}
                  disabled={pending}
                />
              </div>

              <div className="inline-flex items-center gap-2 pt-1">
                <Switch
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(!!checked)}
                  disabled={pending}
                />
                <span className="text-xs text-[#0A0A0A]">Published</span>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === "content" && (
            <div className="space-y-2">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="body"
              >
                Body Content
              </label>
              <input type="hidden" name="body" value={body} />
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Write your page content here..."
              />
              {hasError(state, "body") ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {errorFor(state, "body").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-[#E5E7EB]">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                primaryLabel
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
