"use client";
import React from "react";
import { Plus, Eye, Pencil } from "lucide-react";
import { tv } from "tailwind-variants";
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import { useContentsPolicyContext } from "./context";
import StaticPagesTab from "./tabs/static_pages";
import EmailTemplatesTab from "./tabs/email_templates";
import FAQsTab from "./tabs/faqs";
import ContactInfoTab from "./tabs/contacts";

const tableStyles = tv({
  slots: {
    wrapper: "mt-4 overflow-x-auto border border-[#D6D6D6] rounded-xl bg-white",
    table: "min-w-full divide-y divide-gray-200",
    headRow: "bg-[#F9FAFB]",
    headCell:
      "px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide",
    bodyRow: "border-b last:border-b-0 hover:bg-gray-50/60",
    bodyCell: "px-4 py-3 text-xs text-[#0A0A0A] align-middle whitespace-nowrap",
  },
});

const { wrapper, table, headRow, headCell, bodyRow, bodyCell } = tableStyles();

const staticPageStatusVariant = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

const emailStatusVariant = {
  inactive: "neutral",
  active: "success",
};

const visibilityVariant = {
  public: "success",
  internal: "neutral",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ContentPolicyContent() {
  const context = useContentsPolicyContext() || {};
  const {
    activeTab,
    setActiveTab,
    staticPages,
    emailTemplates,
    faqs,
    contactSettings,
    contactSubmissions,
    loading,
    error,
  } = context;

  const currentTab = activeTab || "static_pages";
  const isLoading = !!loading;

  const staticPageRows = Array.isArray(staticPages) ? staticPages : [];
  const emailTemplateRows = Array.isArray(emailTemplates) ? emailTemplates : [];
  const faqRows = Array.isArray(faqs) ? faqs : [];
  const contactSettingsValue = contactSettings || null;
  const contactSubmissionRows = Array.isArray(contactSubmissions)
    ? contactSubmissions
    : [];

  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Content &amp; Policy Pages
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Manage static pages, email templates, and FAQs.
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-start mt-1">
        <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1 text-[11px]">
          {[
            { id: "static_pages", label: "Static Pages" },
            { id: "email_templates", label: "Email Templates" },
            { id: "faq", label: "FAQ Management" },
            { id: "contact_info", label: "Contact Info" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab?.(tab.id)}
              className={
                "px-4 py-1.5 rounded-full cursor-pointer transition-colors " +
                (currentTab === tab.id
                  ? "bg-white text-[#0A0A0A] shadow-sm"
                  : "text-[#717182]")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <StaticPagesTab
        currentTab={currentTab}
        isLoading={isLoading}
        staticPageRows={staticPageRows}
        staticPageStatusVariant={staticPageStatusVariant}
        formatDate={formatDate}
        wrapper={wrapper}
        table={table}
        headRow={headRow}
        headCell={headCell}
        bodyRow={bodyRow}
        bodyCell={bodyCell}
      />

      <EmailTemplatesTab
        currentTab={currentTab}
        isLoading={isLoading}
        emailTemplateRows={emailTemplateRows}
        emailStatusVariant={emailStatusVariant}
        wrapper={wrapper}
        table={table}
        headRow={headRow}
        headCell={headCell}
        bodyRow={bodyRow}
        bodyCell={bodyCell}
      />

      <FAQsTab
        currentTab={currentTab}
        isLoading={isLoading}
        faqRows={faqRows}
        visibilityVariant={visibilityVariant}
        wrapper={wrapper}
        table={table}
        headRow={headRow}
        headCell={headCell}
        bodyRow={bodyRow}
        bodyCell={bodyCell}
      />

      <ContactInfoTab
        currentTab={currentTab}
        isLoading={isLoading}
        contactSettingsValue={contactSettingsValue}
        contactSubmissionRows={contactSubmissionRows}
        formatDate={formatDate}
        wrapper={wrapper}
        table={table}
        headRow={headRow}
        headCell={headCell}
        bodyRow={bodyRow}
        bodyCell={bodyCell}
      />
    </div>
  );
}
