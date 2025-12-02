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
import { X } from "lucide-react";
import { Switch } from "@/app/components/Switch";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import RichTextEditor from "@/app/components/RichTextEditor";
import { saveStaticPage } from "../action";
import { useContentsPolicyContext } from "../context";
import { toast } from "sonner";

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
  const [state, formAction, pending] = useActionState(saveStaticPage, initialState);
  const isEdit = !!page?.id;
  const { refresh } = useContentsPolicyContext() || {};

  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!open) return;
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
    onOpenChange(!!next);
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

        <form action={formAction} className="mt-3 space-y-4">
          <input type="hidden" name="pageId" value={page?.id || ""} />
          <input type="hidden" name="status" value={statusValue} />

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
                hasError(state, "title") ? hasErrorInput : ""
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
                hasError(state, "metaDescription") ? hasErrorInput : ""
              )}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
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
              placeholder="WYSIWYG editor content..."
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="inline-flex items-center gap-2">
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) => setIsPublished(!!checked)}
                disabled={pending}
              />
              <span className="text-xs text-[#0A0A0A]">Published</span>
            </div>
            <div className="flex items-center gap-3">
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={pending}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-full border border-[#3979D2] bg-[#3979D2] px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
