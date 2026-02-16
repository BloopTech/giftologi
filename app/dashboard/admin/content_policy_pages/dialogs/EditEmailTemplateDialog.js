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
import { X, FileText, Code, Send, Loader2 } from "lucide-react";
import { Switch } from "@/app/components/Switch";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
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
const hasFieldError = (state, key) => (errorFor(state, key)?.length ?? 0) > 0;

const CATEGORY_OPTIONS = [
  { value: "host", label: "Host" },
  { value: "vendor", label: "Vendor" },
  { value: "admin", label: "Admin" },
  { value: "guest", label: "Guest" },
];

const RECIPIENT_TYPE_OPTIONS = [
  { value: "host", label: "Host" },
  { value: "vendor", label: "Vendor" },
  { value: "admin", label: "Admin" },
  { value: "guest", label: "Guest" },
];

const VARIABLE_MAP = {
  host: "{{host_name}} {{registry_title}} {{dashboard_url}} {{amount}} {{order_reference}} {{status}} {{event_title}} {{days_until}} {{pending_count}} {{gifts_count}} {{views_count}} {{total_value}} {{buyer_name}}",
  vendor:
    "{{vendor_name}} {{dashboard_url}} {{order_reference}} {{amount}} {{status}} {{payout_status}} {{product_name}} {{reviewer_name}} {{rating}} {{reason}}",
  admin:
    "{{vendor_name}} {{application_id}} {{dashboard_url}} {{order_reference}} {{amount}} {{reason}}",
  guest:
    "{{guest_name}} {{order_reference}} {{amount}} {{registry_title}} {{tracking_url}} {{status}}",
};

function VariableHints({ category, recipientType }) {
  const key = String(recipientType || category || "").toLowerCase();
  let vars = VARIABLE_MAP[key];
  if (!vars) {
    if (key.includes("host")) vars = VARIABLE_MAP.host;
    else if (key.includes("vendor")) vars = VARIABLE_MAP.vendor;
    else if (key.includes("admin")) vars = VARIABLE_MAP.admin;
    else if (key.includes("guest")) vars = VARIABLE_MAP.guest;
    else
      vars =
        "{{site_url}} — Set a category or recipient type to see role-specific variables.";
  }
  return (
    <p className="text-[11px] text-[#717182] font-mono bg-[#F9FAFB] rounded-xl px-3 py-2 break-all leading-relaxed">
      {vars}
    </p>
  );
}

const initialSendTestState = {
  message: "",
  errors: { templateId: [], testEmail: [] },
  values: {},
  data: {},
};

const EDIT_TABS = [
  { key: "details", label: "Details", icon: FileText },
  { key: "body", label: "Body & Preview", icon: Code },
  { key: "test", label: "Send Test", icon: Send },
];

export default function EditEmailTemplateDialog({
  open,
  onOpenChange,
  template,
}) {
  const [tab, setTab] = useState("details");
  const [state, formAction, pending] = useActionState(
    saveEmailTemplate,
    initialState,
  );
  const [testState, testAction, testPending] = useActionState(
    sendTestEmailTemplate,
    initialSendTestState,
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
    setTab("details");
  }, [open, template, state?.values, testState?.values]);

  const saveHandledRef = useRef(state);
  useEffect(() => {
    if (state === saveHandledRef.current) return;
    saveHandledRef.current = state;
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
    } else {
      toast.error(state.message);
    }
  }, [state, refresh, onOpenChange]);

  const testHandledRef = useRef(testState);
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
    if (hasErrors) {
      toast.error(testState.message);
      return;
    }
    if (hasData) toast.success(testState.message);
    else toast.error(testState.message);
  }, [testState]);

  const statusValue = isActive ? "active" : "inactive";
  const dialogTitle = isEdit ? "Edit Email Template" : "New Email Template";
  const primaryLabel = isEdit ? "Save Template" : "Create Template";

  const handleOpenChange = (next) => {
    if (!onOpenChange) return;
    if (!next) setTab("details");
    onOpenChange(!!next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 shrink-0">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              {isEdit
                ? "Update email template with dynamic variables."
                : "Create a new email template with dynamic variables."}
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
          {EDIT_TABS.filter((t) => t.key !== "test" || isEdit).map((t) => {
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
        <div className="flex-1 overflow-y-auto mt-3">
          {/* ── Details tab ── */}
          {tab === "details" && (
            <form action={formAction} className="space-y-4">
              <input
                type="hidden"
                name="templateId"
                value={template?.id || ""}
              />
              <input type="hidden" name="status" value={statusValue} />
              <input type="hidden" name="body" value={body} />

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
                    hasFieldError(state, "name") ? hasErrorInput : "",
                  )}
                  disabled={pending}
                />
                {hasFieldError(state, "name") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {errorFor(state, "name").map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
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
                    hasFieldError(state, "subject") ? hasErrorInput : "",
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
                    hasFieldError(state, "senderName") ? hasErrorInput : "",
                  )}
                  disabled={pending}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Category
                  </label>
                  <input type="hidden" name="category" value={category} />
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v)}
                    disabled={pending}
                  >
                    <SelectTrigger hasError={hasFieldError(state, "category")}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Recipient Type
                  </label>
                  <input
                    type="hidden"
                    name="recipientType"
                    value={recipientType}
                  />
                  <Select
                    value={recipientType}
                    onValueChange={(v) => setRecipientType(v)}
                    disabled={pending}
                  >
                    <SelectTrigger
                      hasError={hasFieldError(state, "recipientType")}
                    >
                      <SelectValue placeholder="Select recipient type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPIENT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="inline-flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(!!checked)}
                    disabled={pending}
                  />
                  <span className="text-xs text-[#0A0A0A]">
                    Template Active
                  </span>
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
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      primaryLabel
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── Body & Preview tab ── */}
          {tab === "body" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Email Body (HTML)
                </label>
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
                <VariableHints
                  category={category}
                  recipientType={recipientType}
                />
              </div>

              {body ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[#0A0A0A]">
                    Live Preview
                  </p>
                  <iframe
                    title="Email body preview"
                    srcDoc={body}
                    sandbox=""
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white"
                    style={{ height: "300px" }}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* ── Send Test tab (edit only) ── */}
          {tab === "test" && isEdit && (
            <form action={testAction} className="space-y-4">
              <p className="text-[11px] text-[#717182]">
                Send this template to a single email address for testing. This
                does not trigger any automated workflows.
              </p>
              <input
                type="hidden"
                name="templateId"
                value={template?.id || ""}
              />
              <div className="space-y-1">
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
                    (testState?.errors?.testEmail || []).length
                      ? hasErrorInput
                      : "",
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
