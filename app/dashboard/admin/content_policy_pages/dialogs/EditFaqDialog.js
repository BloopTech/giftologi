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
import { Loader2, X } from "lucide-react";
import { Switch } from "@/app/components/Switch";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import RichTextEditor from "@/app/components/RichTextEditor";
import { saveFaq } from "../action";
import { useContentsPolicyContext } from "../context";
import { toast } from "sonner";

const initialState = {
  message: "",
  errors: {
    faqId: [],
    question: [],
    answer: [],
    category: [],
    sortOrder: [],
    visibility: [],
  },
  values: {},
  data: {},
};

const errorFor = (state, key) => state?.errors?.[key] ?? [];
const hasError = (state, key) => (errorFor(state, key)?.length ?? 0) > 0;

export default function EditFaqDialog({ open, onOpenChange, faq }) {
  const [state, formAction, pending] = useActionState(saveFaq, initialState);
  const isEdit = !!faq?.id;
  const { refresh } = useContentsPolicyContext() || {};

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!open) return;
    const values = state?.values || {};
    setQuestion(values.question ?? faq?.question ?? "");
    setAnswer(values.answer ?? faq?.answer ?? "");
    setCategory(values.category ?? faq?.category ?? "");
    const orderFromState = values.sortOrder ?? "";
    const orderFromFaq =
      typeof faq?.sort_order === "number" ? String(faq.sort_order) : "";
    setSortOrder(orderFromState || orderFromFaq || "");
    const rawVisibility = values.visibility ?? faq?.visibility ?? "public";
    setIsPublic(String(rawVisibility).toLowerCase() === "public");
  }, [open, faq, state?.values]);

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

  const visibilityValue = isPublic ? "public" : "internal";
  const dialogTitle = isEdit ? "Edit FAQ" : "New FAQ";
  const primaryLabel = isEdit ? "Save FAQ" : "Create FAQ";

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Manage frequently asked question entries.
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
          <input type="hidden" name="faqId" value={faq?.id || ""} />
          <input type="hidden" name="visibility" value={visibilityValue} />

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="faq-question"
            >
              Question <span className="text-red-500">*</span>
            </label>
            <input
              id="faq-question"
              name="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              placeholder="How do I create a registry?"
              className={cx(
                "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "question") ? hasErrorInput : "",
              )}
              disabled={pending}
            />
            {hasError(state, "question") ? (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor(state, "question").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="faq-answer"
            >
              Answer <span className="text-red-500">*</span>
            </label>
            <input type="hidden" name="answer" value={answer} />
            <RichTextEditor
              value={answer}
              onChange={setAnswer}
              placeholder="Provide a detailed answer..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="faq-category"
              >
                Category
              </label>
              <input
                id="faq-category"
                name="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Registry"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(state, "category") ? hasErrorInput : "",
                )}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="faq-order"
              >
                Display Order
              </label>
              <input
                id="faq-order"
                name="sortOrder"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(state, "sortOrder") ? hasErrorInput : "",
                )}
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="inline-flex items-center gap-2">
              <Switch
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(!!checked)}
                disabled={pending}
              />
              <span className="text-xs text-[#0A0A0A]">Public Visibility</span>
            </div>
            <div className="flex items-center gap-3">
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
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  primaryLabel
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
