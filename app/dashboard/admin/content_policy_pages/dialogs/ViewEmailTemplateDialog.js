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
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { sendTestEmailTemplate } from "../action";
import { toast } from "sonner";
import { X } from "lucide-react";

const initialSendTestState = {
  message: "",
  errors: {
    templateId: [],
    testEmail: [],
  },
  values: {},
  data: {},
};

export default function ViewEmailTemplateDialog({ open, onOpenChange, template }) {
  const [testState, testAction, testPending] = useActionState(
    sendTestEmailTemplate,
    initialSendTestState
  );
  const [testEmail, setTestEmail] = useState("");

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    onOpenChange(!!next);
  };

  useEffect(() => {
    if (!open) return;
    const values = testState?.values || {};
    setTestEmail(values.testEmail ?? "");
  }, [open, testState?.values]);

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
                  htmlFor="preview-test-email"
                >
                  Test Email Address
                </label>
                <input
                  id="preview-test-email"
                  name="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    testState && hasErrorInput &&
                      (testState.errors?.testEmail || []).length
                      ? hasErrorInput
                      : ""
                  )}
                  disabled={testPending}
                />
                {testState?.errors?.testEmail?.length ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {testState.errors.testEmail.map((err, index) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
