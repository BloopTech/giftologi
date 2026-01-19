"use client";
import React from "react";
import { Plus, Eye, Pencil, Search } from "lucide-react";
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
    searchQuery,
    setSearchQuery,
    focusId,
    setFocusId,
    focusEntity,
    setFocusEntity,
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

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const q = normalize(searchQuery);

  const staticPageRowsAll = Array.isArray(staticPages) ? staticPages : [];
  const emailTemplateRowsAll = Array.isArray(emailTemplates) ? emailTemplates : [];
  const faqRowsAll = Array.isArray(faqs) ? faqs : [];
  const contactSettingsValue = contactSettings || null;
  const contactSubmissionRowsAll = Array.isArray(contactSubmissions)
    ? contactSubmissions
    : [];

  const staticPageRows = React.useMemo(() => {
    if (!q) return staticPageRowsAll;
    return staticPageRowsAll.filter((row) =>
      normalize(`${row.title || ""} ${row.slug || ""} ${row.status || ""}`).includes(q)
    );
  }, [q, staticPageRowsAll]);

  const emailTemplateRows = React.useMemo(() => {
    if (!q) return emailTemplateRowsAll;
    return emailTemplateRowsAll.filter((row) =>
      normalize(
        `${row.name || ""} ${row.subject || ""} ${row.category || ""} ${row.recipient_type || ""} ${row.status || ""}`
      ).includes(q)
    );
  }, [q, emailTemplateRowsAll]);

  const faqRows = React.useMemo(() => {
    if (!q) return faqRowsAll;
    return faqRowsAll.filter((row) =>
      normalize(
        `${row.question || ""} ${row.answer || ""} ${row.category || ""} ${row.visibility || ""}`
      ).includes(q)
    );
  }, [q, faqRowsAll]);

  const contactSubmissionRows = React.useMemo(() => {
    if (!q) return contactSubmissionRowsAll;
    return contactSubmissionRowsAll.filter((row) =>
      normalize(
        `${row.name || ""} ${row.email || ""} ${row.subject || ""} ${row.message || ""} ${row.status || ""}`
      ).includes(q)
    );
  }, [q, contactSubmissionRowsAll]);

  const resolveFocusTab = React.useCallback(
    (entity) => {
      const key = String(entity || "").toLowerCase();
      if (key === "content_static_page") return "static_pages";
      if (key === "content_email_template") return "email_templates";
      if (key === "content_faq") return "faq";
      if (key === "content_contact_submission" || key === "content_contact_settings") {
        return "contact_info";
      }
      return null;
    },
    []
  );

  React.useEffect(() => {
    if (!focusId) return;
    const neededTab = resolveFocusTab(focusEntity);
    if (!neededTab) return;
    if (currentTab !== neededTab) {
      setActiveTab?.(neededTab);
    }
  }, [focusId, focusEntity, currentTab, setActiveTab, resolveFocusTab]);

  const makeFocusDomId = React.useCallback((entity, id) => {
    const safeEntity = encodeURIComponent(String(entity || "").toLowerCase());
    const safeId = encodeURIComponent(String(id || ""));
    return `content-policy-${safeEntity}-${safeId}`;
  }, []);

  React.useEffect(() => {
    if (!focusId) return;
    if (!focusEntity) return;
    const el =
      typeof document !== "undefined"
        ? document.getElementById(makeFocusDomId(focusEntity, focusId))
        : null;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      el.scrollIntoView();
    }
  }, [focusId, focusEntity, makeFocusDomId, currentTab]);

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

        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(event) => setSearchQuery?.(event.target.value)}
              placeholder="Search content (pages, templates, FAQs, contact submissions)..."
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
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
        focusId={focusId}
        focusEntity={focusEntity}
        setFocusId={setFocusId}
        setFocusEntity={setFocusEntity}
        makeFocusDomId={makeFocusDomId}
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
        focusId={focusId}
        focusEntity={focusEntity}
        setFocusId={setFocusId}
        setFocusEntity={setFocusEntity}
        makeFocusDomId={makeFocusDomId}
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
        focusId={focusId}
        focusEntity={focusEntity}
        setFocusId={setFocusId}
        setFocusEntity={setFocusEntity}
        makeFocusDomId={makeFocusDomId}
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
        focusId={focusId}
        focusEntity={focusEntity}
        setFocusId={setFocusId}
        setFocusEntity={setFocusEntity}
        makeFocusDomId={makeFocusDomId}
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
