"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { sendTestEmailTemplate } from "../action";
import { toast } from "sonner";
import { X, Info, Eye, Send } from "lucide-react";

const initialSendTestState = {
  message: "",
  errors: { templateId: [], testEmail: [] },
  values: {},
  data: {},
};

const TABS = [
  { key: "details", label: "Details", icon: Info },
  { key: "preview", label: "Preview", icon: Eye },
  { key: "test", label: "Send Test", icon: Send },
];

export default function ViewEmailTemplateDialog({ open, onOpenChange, template }) {
  const [tab, setTab] = useState("details");
  const [testState, testAction, testPending] = useActionState(
    sendTestEmailTemplate,
    initialSendTestState,
  );
  const [testEmail, setTestEmail] = useState("");
  const testHandledRef = useRef(testState);

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    if (!next) setTab("details");
    onOpenChange(!!next);
  };

  useEffect(() => {
    if (!open) return;
    const values = testState?.values || {};
    setTestEmail(values.testEmail ?? "");
  }, [open, testState?.values]);

  useEffect(() => {
    if (testState === testHandledRef.current) return;
    testHandledRef.current = testState;
    if (!testState?.message) return;
    const hasErrors =
      testState?.errors &&
      Object.keys(testState.errors).some(
        (key) => (testState.errors[key] || []).length,
      );
    const hasData = testState?.data && Object.keys(testState.data).length > 0;
    if (hasErrors) { toast.error(testState.message); return; }
    if (hasData) toast.success(testState.message);
    else toast.error(testState.message);
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 shrink-0">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              View Email Template
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              {template.name || "Untitled template"}
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
        <div className="flex gap-1 border-b border-[#E5E7EB] mt-2 shrink-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cx(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition cursor-pointer",
                  tab === t.key
                    ? "border-[#0A0A0A] text-[#0A0A0A]"
                    : "border-transparent text-[#717182] hover:text-[#0A0A0A]",
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto mt-3 text-xs text-[#0A0A0A]">
          {tab === "details" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Template Name</p>
                  <p className="text-[#6A7282]">{template.name || "Untitled template"}</p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <span className={cx(
                    "inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                    template.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600",
                  )}>
                    {template.status || "inactive"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">Category</p>
                  <p className="text-[#6A7282] capitalize">{template.category || "—"}</p>
                </div>
                <div>
                  <p className="font-medium">Recipient Type</p>
                  <p className="text-[#6A7282] capitalize">{template.recipient_type || "—"}</p>
                </div>
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-[#6A7282]">{updatedLabel}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Subject Line</p>
                <p className="text-[#6A7282] whitespace-pre-line">{template.subject || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Sender Name</p>
                <p className="text-[#6A7282] whitespace-pre-line">{template.sender_name || "—"}</p>
              </div>
            </div>
          )}

          {tab === "preview" && (
            <div className="space-y-3">
              {template.body ? (
                <iframe
                  title="Email template preview"
                  srcDoc={template.body}
                  sandbox=""
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white"
                  style={{ height: "400px" }}
                />
              ) : (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151]">
                  No email body available.
                </div>
              )}
              <details className="text-[11px]">
                <summary className="font-medium text-xs text-[#0A0A0A] cursor-pointer">
                  View Raw HTML
                </summary>
                <div className="mt-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] text-[#374151] whitespace-pre-wrap max-h-60 overflow-auto font-mono">
                  {template.body || "—"}
                </div>
              </details>
            </div>
          )}

          {tab === "test" && (
            <form action={testAction} className="space-y-4">
              <p className="text-[11px] text-[#717182]">
                Send this template to a single email address for testing. This does not trigger any automated workflows.
              </p>
              <input type="hidden" name="templateId" value={template?.id || ""} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]" htmlFor="preview-test-email">
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
                    (testState?.errors?.testEmail || []).length ? hasErrorInput : "",
                  )}
                  disabled={testPending}
                />
                {(testState?.errors?.testEmail || []).length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {testState.errors.testEmail.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="submit"
                disabled={testPending || !testEmail.trim()}
                className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-5 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {testPending ? "Sending..." : "Send Test Email"}
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
