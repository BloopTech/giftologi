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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/Tooltip";
import { X } from "lucide-react";
import { Switch } from "@/app/components/Switch";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import RichTextEditor from "@/app/components/RichTextEditor";
import { saveEmailTemplate, sendTestEmailTemplate } from "../action";
import { useContentsPolicyContext } from "../context";
import { toast } from "sonner";

const initialState = {
  message: "",
  errors: {
    templateId: [],
    name: [],
    subject: [],
    senderName: [],
    body: [],
    category: [],
    recipientType: [],
    status: [],
  },
  values: {},
  data: {},
};

const errorFor = (state, key) => state?.errors?.[key] ?? [];
const hasError = (state, key) => (errorFor(state, key)?.length ?? 0) > 0;

const initialSendTestState = {
  message: "",
  errors: {
    templateId: [],
    testEmail: [],
  },
  values: {},
  data: {},
};

export default function EditEmailTemplateDialog({ open, onOpenChange, template }) {
  const [state, formAction, pending] = useActionState(
    saveEmailTemplate,
    initialState
  );
  const [testState, testAction, testPending] = useActionState(
    sendTestEmailTemplate,
    initialSendTestState
  );
  const isEdit = !!template?.id;
  const { refresh } = useContentsPolicyContext() || {};

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [senderName, setSenderName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    const values = state?.values || {};
    const testValues = testState?.values || {};
    setName(values.name ?? template?.name ?? "");
    setSubject(values.subject ?? template?.subject ?? "");
    setSenderName(values.senderName ?? template?.sender_name ?? "");
    setBody(values.body ?? template?.body ?? "");
    setCategory(values.category ?? template?.category ?? "");
    setRecipientType(values.recipientType ?? template?.recipient_type ?? "");
    const rawStatus = values.status ?? template?.status ?? "inactive";
    setIsActive(String(rawStatus).toLowerCase() === "active");
    setTestEmail(testValues.testEmail ?? "");
  }, [open, template, state?.values, testState?.values]);

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

  useEffect(() => {
    if (!testState?.message) return;

    const hasErrors =
      testState?.errors &&
      Object.keys(testState.errors).some(
        (key) => (testState.errors[key] || []).length
      );
    const hasData = testState?.data && Object.keys(testState.data).length > 0;

    if (hasErrors) {
      toast.error(testState.message);
      return;
    }

    if (hasData) {
      toast.success(testState.message);
    }
  }, [testState]);

  const statusValue = isActive ? "active" : "inactive";
  const dialogTitle = isEdit ? "Edit Email Template" : "New Email Template";
  const primaryLabel = isEdit ? "Save Template" : "Create Template";

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
              Update email template with dynamic variables.
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
          <input type="hidden" name="templateId" value={template?.id || ""} />
          <input type="hidden" name="status" value={statusValue} />

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="template-name"
            >
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              id="template-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Vendor Approval"
              className={cx(
                "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "name") ? hasErrorInput : ""
              )}
              disabled={pending}
            />
            {hasError(state, "name") ? (
              <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                {errorFor(state, "name").map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="subject-line"
            >
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              id="subject-line"
              name="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Your Vendor Application Has Been Approved"
              className={cx(
                "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "subject") ? hasErrorInput : ""
              )}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="sender-name"
            >
              Sender Name
            </label>
            <input
              id="sender-name"
              name="senderName"
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Giftologi Team"
              className={cx(
                "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError(state, "senderName") ? hasErrorInput : ""
              )}
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="category"
              >
                Category
              </label>
              <input
                id="category"
                name="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Vendor"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(state, "category") ? hasErrorInput : ""
                )}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="recipient-type"
              >
                Recipient Type
              </label>
              <input
                id="recipient-type"
                name="recipientType"
                type="text"
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                placeholder="Vendor"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(state, "recipientType") ? hasErrorInput : ""
                )}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-[#0A0A0A]"
              htmlFor="email-body"
            >
              Email Body (HTML)
            </label>
            <input type="hidden" name="body" value={body} />
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="HTML-formatted email body..."
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[#0A0A0A]">
              Available Variables
            </p>
            <p className="text-[11px] text-[#717182] font-mono bg-[#F9FAFB] rounded-xl px-3 py-2">
              {"{vendor_name} {store_url} {approval_status}"}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="inline-flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
                disabled={pending}
              />
              <span className="text-xs text-[#0A0A0A]">Template Active</span>
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

      {isEdit ? (
        <form
          action={testAction}
          className="mt-4 pt-4 border-t border-gray-100 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-[#0A0A0A]">
                Send Test Email
              </p>
              <p className="text-[11px] text-[#717182]">
                Send this template to a single email address for testing. This
                does not trigger any automated workflows.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <input type="hidden" name="templateId" value={template?.id || ""} />
            <div className="flex-1 space-y-1">
              <label
                className="text-xs font-medium text-[#0A0A0A]"
                htmlFor="test-email"
              >
                Test Email Address
              </label>
              <input
                id="test-email"
                name="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className={cx(
                  "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError(testState, "testEmail") ? hasErrorInput : ""
                )}
                disabled={testPending}
              />
              {hasError(testState, "testEmail") ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {errorFor(testState, "testEmail").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex-shrink-0 flex items-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="submit"
                    disabled={testPending || !testEmail.trim()}
                    className="inline-flex items-center justify-center rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Send Test
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Send this email template as a one-off test to the address
                  above.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </form>
      ) : null}
    </DialogContent>
  </Dialog>
);
}
