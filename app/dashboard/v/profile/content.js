"use client";
import React, {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { PiFloppyDisk } from "react-icons/pi";

import { useVendorProfileContext } from "./context";
import { manageProfile, saveVendorLogo, uploadVendorDocument } from "./action";
import {
  ProfileHeader,
  BusinessInformationSection,
  BusinessAddressSection,
  BusinessReferencesSection,
  VerificationNotesSection,
  PaymentInformationSection,
  NotificationPreferencesSection,
  DocumentsSection,
} from "./components/profileSections";
import { DOCUMENT_UPLOAD_OPTIONS } from "./documentTypes";

const defaultNotificationSettings = {
  newOrders: false,
  orderUpdates: false,
  payoutAlerts: false,
  lowStockAlerts: false,
  productReviews: false,
  weeklyReports: false,
  monthlyReports: false,
  marketingEmails: false,
};

const mapNotificationSettings = (preferences) => ({
  newOrders: preferences?.new_orders ?? defaultNotificationSettings.newOrders,
  orderUpdates:
    preferences?.order_updates ?? defaultNotificationSettings.orderUpdates,
  payoutAlerts:
    preferences?.payout_alerts ?? defaultNotificationSettings.payoutAlerts,
  lowStockAlerts:
    preferences?.low_stock_alerts ?? defaultNotificationSettings.lowStockAlerts,
  productReviews:
    preferences?.product_reviews ?? defaultNotificationSettings.productReviews,
  weeklyReports:
    preferences?.weekly_reports ?? defaultNotificationSettings.weeklyReports,
  monthlyReports:
    preferences?.monthly_reports ?? defaultNotificationSettings.monthlyReports,
  marketingEmails:
    preferences?.marketing_emails ??
    defaultNotificationSettings.marketingEmails,
});

const formatMemberSince = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

const skeletonCardClass = "bg-white rounded-xl border border-[#E5E7EB] p-5";

const VendorProfileSkeleton = () => (
  <section
    aria-label="Loading vendor profile"
    className="flex flex-col space-y-6 w-full mb-8"
  >
    <div className="flex items-center gap-2 text-sm">
      <div className="h-3 w-24 rounded-full bg-[#E5E7EB] animate-pulse" />
      <div className="h-3 w-4 rounded-full bg-[#E5E7EB] animate-pulse" />
      <div className="h-3 w-16 rounded-full bg-[#E5E7EB] animate-pulse" />
    </div>

    <div className={skeletonCardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl bg-[#E5E7EB] animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-3 w-64 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-3 w-28 rounded bg-[#E5E7EB] animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-lg bg-[#E5E7EB] animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-[#E5E7EB] animate-pulse" />
        </div>
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-44 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`biz-field-${idx}`} className="space-y-2">
            <div className="h-3 w-24 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-[#E5E7EB] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-[#E5E7EB] animate-pulse" />
        <div className="h-24 w-full rounded-lg bg-[#E5E7EB] animate-pulse" />
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-40 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`payment-field-${idx}`} className="space-y-2">
            <div className="h-3 w-28 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-[#E5E7EB] animate-pulse" />
          </div>
        ))}
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-52 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`notification-${idx}`}
            className="h-10 w-full rounded-lg bg-[#E5E7EB] animate-pulse"
          />
        ))}
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-44 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`document-${idx}`}
            className="h-12 w-full rounded-lg bg-[#E5E7EB] animate-pulse"
          />
        ))}
      </div>
    </div>
  </section>
);

export default function VendorProfileContent() {
  const {
    profile,
    vendor,
    paymentInfo,
    notificationPreferences,
    documents,
    application,
    supportContact,
    categories,
    categoriesLoading,
    categoriesError,
    loading,
    error,
    refreshData,
  } = useVendorProfileContext();
  const [notifications, setNotifications] = useState(
    defaultNotificationSettings,
  );
  const [state, formAction, isPending] = useActionState(manageProfile, {
    success: false,
    message: "",
    errors: {},
  });
  const [logoState, logoAction, isLogoPending] = useActionState(
    saveVendorLogo,
    {
      success: false,
      message: "",
      errors: {},
      data: {},
    },
  );
  const [documentState, documentAction, documentPending] = useActionState(
    uploadVendorDocument,
    { success: false, message: "", errors: {} },
  );
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isLogoSaved, setIsLogoSaved] = useState(false);
  const getNextDocumentType = (usedTypes = []) =>
    DOCUMENT_UPLOAD_OPTIONS.find((option) => !usedTypes.includes(option.value))
      ?.value ||
    DOCUMENT_UPLOAD_OPTIONS[0]?.value ||
    "";
  const createDocumentRow = (usedTypes = []) => ({
    id: crypto.randomUUID(),
    type: getNextDocumentType(usedTypes),
    file: null,
  });
  const [documentQueue, setDocumentQueue] = useState(() => [
    createDocumentRow(),
  ]);

  const handleAddDocumentRow = () => {
    setDocumentQueue((prev) => {
      const usedTypes = prev.map((row) => row.type).filter(Boolean);
      const uniqueUsedTypes = new Set(usedTypes);

      if (uniqueUsedTypes.size >= DOCUMENT_UPLOAD_OPTIONS.length) {
        return prev;
      }

      return [...prev, createDocumentRow([...uniqueUsedTypes])];
    });
  };

  const handleRemoveDocumentRow = (id) => {
    setDocumentQueue((prev) => prev.filter((row) => row.id !== id));
  };

  const handleDocumentRowChange = (id, field, value) => {
    setDocumentQueue((prev) => {
      if (field === "type") {
        const usedTypes = prev
          .filter((row) => row.id !== id)
          .map((row) => row.type)
          .filter(Boolean);

        if (usedTypes.includes(value)) {
          return prev;
        }
      }

      return prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      );
    });
  };

  useEffect(() => {
    setNotifications(mapNotificationSettings(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    if (state?.success) {
      refreshData?.();
    }
  }, [state, refreshData]);

  useEffect(() => {
    if (documentState?.success) {
      refreshData?.();
    }
  }, [documentState?.success, documentState?.message, refreshData]);

  useEffect(() => {
    if (vendor?.logo_url) {
      setLogoPreview(vendor.logo_url);
      setIsLogoSaved(true);
      return;
    }

    setLogoPreview(null);
    setIsLogoSaved(false);
  }, [vendor?.logo_url]);

  useEffect(() => {
    if (logoState?.success && logoState?.data?.logo_url) {
      setLogoPreview(logoState.data.logo_url);
      setLogoFile(null);
      setIsLogoSaved(true);
      refreshData?.();
    }
  }, [logoState?.success, logoState?.data?.logo_url, refreshData]);

  const vendorSummary = useMemo(() => {
    const draft = application?.draft_data || {};
    const coerceCategories = (value, depth = 0) => {
      if (value === null || value === undefined || depth > 4) return [];
      if (Array.isArray(value)) {
        return value.flatMap((item) => coerceCategories(item, depth + 1));
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];

        const postgresArrayMatch = trimmed.startsWith("{") && trimmed.endsWith("}");
        if (postgresArrayMatch) {
          const inner = trimmed.slice(1, -1);
          if (!inner) return [];
          return inner
            .split(",")
            .map((segment) => segment.replace(/^"|"$/g, "").trim())
            .filter(Boolean);
        }

        const candidates = [trimmed];
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          candidates.push(trimmed.slice(1, -1));
        }

        for (const candidate of candidates) {
          if (candidate.startsWith("[") && candidate.endsWith("]")) {
            try {
              const parsed = JSON.parse(candidate);
              if (Array.isArray(parsed)) {
                return coerceCategories(parsed, depth + 1);
              }
            } catch (err) {
              // Ignore JSON parse failures and continue
            }
          }
        }

        return [trimmed];
      }
      return [];
    };
    const normalizeCategories = (value) => {
      const seen = new Set();
      const normalized = [];
      coerceCategories(value).forEach((item) => {
        const label = String(item || "").trim();
        if (label && !seen.has(label)) {
          seen.add(label);
          normalized.push(label);
        }
      });
      return normalized;
    };
    const vendorCategories = normalizeCategories(vendor?.category);
    const applicationCategories = normalizeCategories(application?.category);
    const draftCategories = normalizeCategories(draft.category);
    const categories =
      vendorCategories.length > 0
        ? vendorCategories
        : applicationCategories.length > 0
          ? applicationCategories
          : draftCategories;
    const [appRef1, appRef2] = Array.isArray(application?.business_references)
      ? application.business_references
      : [];
    return {
      businessName:
        vendor?.business_name ||
        application?.business_name ||
        draft.businessName ||
        "Your Business",
      legalName:
        vendor?.legal_name ||
        draft.legalBusinessName ||
        vendor?.business_name ||
        "",
      businessType:
        vendor?.business_type ||
        application?.business_type ||
        draft.businessType ||
        "",
      businessRegistrationNumber:
        vendor?.business_registration_number ||
        application?.business_registration_number ||
        draft.businessRegistrationNumber ||
        "",
      description:
        vendor?.description ||
        application?.business_description ||
        draft.businessDescription ||
        "",
      email:
        vendor?.email ||
        application?.owner_email ||
        draft.email ||
        profile?.email ||
        "",
      phone:
        vendor?.phone ||
        application?.owner_phone ||
        draft.phoneNumber ||
        profile?.phone ||
        "",
      website: vendor?.website || application?.website || draft.website || "",
      taxId: vendor?.tax_id || application?.tax_id || draft.taxId || "",
      categories,
      yearsInBusiness:
        application?.years_in_business ?? draft.yearsInBusiness ?? "",
      references: {
        ref1: {
          name: appRef1?.name ?? draft.ref1Name ?? "",
          company: appRef1?.company ?? draft.ref1Company ?? "",
          phone: appRef1?.phone ?? draft.ref1Phone ?? "",
          email: appRef1?.email ?? draft.ref1Email ?? "",
        },
        ref2: {
          name: appRef2?.name ?? draft.ref2Name ?? "",
          company: appRef2?.company ?? draft.ref2Company ?? "",
          phone: appRef2?.phone ?? draft.ref2Phone ?? "",
          email: appRef2?.email ?? draft.ref2Email ?? "",
        },
      },
      verificationNotes:
        application?.verification_notes ?? draft.verificationNotes ?? "",
      financialVerificationNotes:
        application?.financial_verification_notes ??
        draft.financialVerificationNotes ??
        "",
      memberSince: formatMemberSince(vendor?.created_at),
      isVerified: !!vendor?.verified,
      address: {
        street:
          vendor?.address_street ||
          application?.street_address ||
          draft.address ||
          draft.streetAddress ||
          "",
        city: vendor?.address_city || application?.city || draft.city || "",
        state:
          vendor?.address_state || application?.region || draft.region || "",
        digitalAddress:
          vendor?.digital_address ||
          application?.digital_address ||
          draft.digitalAddress ||
          draft.zipCode ||
          draft.postalCode ||
          "",
        country: vendor?.address_country || draft.country || "",
      },
    };
  }, [vendor, profile, application]);

  const paymentSummary = useMemo(() => {
    const draft = application?.draft_data || {};
    const maskAccount = (value) => {
      if (!value) return "";
      const stringValue = String(value).trim();
      if (!stringValue) return "";
      const last4 = stringValue.slice(-4);
      return last4 ? `****${last4}` : "";
    };
    const rawAccountNumber =
      paymentInfo?.bank_account ||
      paymentInfo?.bank_account_number ||
      application?.bank_account_number ||
      application?.bank_account ||
      draft.bankAccountNumber ||
      "";
    const accountNumberMasked =
      paymentInfo?.bank_account_masked ||
      (paymentInfo?.bank_account_last4
        ? `****${paymentInfo.bank_account_last4}`
        : "") ||
      maskAccount(rawAccountNumber);

    return {
      accountName:
        paymentInfo?.account_name ||
        application?.bank_account_name ||
        draft.accountHolderName ||
        "",
      bankName:
        paymentInfo?.bank_name ||
        application?.bank_name ||
        draft.bankName ||
        "",
      bankBranch:
        paymentInfo?.bank_branch ||
        application?.bank_branch ||
        draft.bankBranch ||
        "",
      accountNumber: rawAccountNumber,
      accountNumberMasked,
      routingNumber:
        paymentInfo?.routing_number ||
        application?.bank_branch_code ||
        draft.routingNumber ||
        "",
      accountType: paymentInfo?.account_type || "",
    };
  }, [paymentInfo, application]);

  const documentList = useMemo(() => {
    const latestDocuments = documentState?.data?.documents;
    if (Array.isArray(latestDocuments)) {
      return latestDocuments;
    }
    return Array.isArray(documents) ? documents : [];
  }, [documentState?.data?.documents, documents]);
  const profileCompletion = useMemo(() => {
    const normalizeDocumentTitle = (value) =>
      (value || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s+/g, " ");
    const hasValue = (value) =>
      value !== null && value !== undefined && String(value).trim() !== "";
    const hasBusinessInfo = Boolean(
      hasValue(vendorSummary.businessName) &&
        Array.isArray(vendorSummary.categories) &&
        vendorSummary.categories.length > 0 &&
        hasValue(vendorSummary.legalName) &&
        hasValue(vendorSummary.businessType) &&
        hasValue(vendorSummary.businessRegistrationNumber) &&
        hasValue(vendorSummary.yearsInBusiness) &&
        hasValue(vendorSummary.email) &&
        hasValue(vendorSummary.phone) &&
        hasValue(vendorSummary.taxId),
    );
    const hasAddress = Boolean(
      hasValue(vendorSummary.address?.street) &&
        hasValue(vendorSummary.address?.city) &&
        hasValue(vendorSummary.address?.state) &&
        hasValue(vendorSummary.address?.digitalAddress) &&
        hasValue(vendorSummary.address?.country),
    );
    const hasPayment = Boolean(
      hasValue(paymentSummary.accountName) &&
        hasValue(paymentSummary.bankName) &&
        hasValue(paymentSummary.bankBranch) &&
        (hasValue(paymentSummary.accountNumber) ||
          hasValue(paymentSummary.accountNumberMasked)) &&
        hasValue(paymentSummary.accountType),
    );
    const requiredDocumentTitles = DOCUMENT_UPLOAD_OPTIONS.map(
      (option) => option.label,
    );
    const hasAllDocuments = requiredDocumentTitles.every((title) => {
      const requiredTitle = normalizeDocumentTitle(title);
      return documentList.some((doc) => {
        const candidateTitle = normalizeDocumentTitle(
          doc?.title ||
            doc?.label ||
            doc?.name ||
            doc?.fileName ||
            doc?.filename ||
            "",
        );
        const url = doc?.url || doc?.href || doc?.link || null;
        return candidateTitle === requiredTitle && Boolean(url);
      });
    });

    const checks = [hasBusinessInfo, hasAddress, hasPayment, hasAllDocuments];
    const completed = checks.filter(Boolean).length;
    const total = checks.length || 1;
    const percent = Math.round((completed / total) * 100);
    const isComplete = completed === total;

    return {
      percent,
      isComplete,
      label: isComplete ? "Complete" : `${completed}/${total} complete`,
    };
  }, [documentList, paymentSummary, vendorSummary]);
  const selectedDocumentTypes = useMemo(
    () => documentQueue.map((row) => row.type).filter(Boolean),
    [documentQueue],
  );
  const isDocumentTypeLimitReached = useMemo(
    () => new Set(selectedDocumentTypes).size >= DOCUMENT_UPLOAD_OPTIONS.length,
    [selectedDocumentTypes],
  );

  const notificationFields = useMemo(
    () => ({
      new_orders: notifications.newOrders,
      order_updates: notifications.orderUpdates,
      payout_alerts: notifications.payoutAlerts,
      low_stock_alerts: notifications.lowStockAlerts,
      product_reviews: notifications.productReviews,
      weekly_reports: notifications.weeklyReports,
      monthly_reports: notifications.monthlyReports,
      marketing_emails: notifications.marketingEmails,
    }),
    [notifications],
  );

  const accountNameRef = useRef(null);
  const bankNameRef = useRef(null);
  const bankBranchRef = useRef(null);
  const accountNumberRef = useRef(null);
  const routingNumberRef = useRef(null);

  const formKey = useMemo(
    () =>
      [
        vendor?.id,
        vendor?.updated_at,
        paymentInfo?.id,
        application?.id,
        notificationPreferences?.id,
      ]
        .filter(Boolean)
        .join("-") || "vendor-profile",
    [vendor, paymentInfo, application, notificationPreferences],
  );

  const handleNotificationChange = (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    setIsLogoSaved(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const isVerifiedVendor = vendorSummary.isVerified;
  const applicationStatus = application?.status?.toLowerCase?.() || "";
  const isApplicationApproved = applicationStatus === "approved";
  const isApplicationRejected = applicationStatus === "rejected";
  const rejectionReason = application?.reason?.trim()
    ? application.reason.trim()
    : "Your application needs updates before it can be approved.";
  const supportEmail = supportContact?.support_email || "hello@mygiftologi.com";
  const supportPhone = supportContact?.support_phone || "";
  const supportWhatsapp = supportContact?.whatsapp_link || "";
  const formErrors = state?.errors || {};
  const requestLinks = [
    supportEmail
      ? { label: "Email Support", href: `mailto:${supportEmail}` }
      : null,
    supportPhone
      ? { label: "Call Support", href: `tel:${supportPhone}` }
      : null,
    supportWhatsapp
      ? { label: "WhatsApp", href: supportWhatsapp, external: true }
      : null,
  ].filter(Boolean);

  const handleEditPayment = () => {
    const target =
      accountNumberRef.current ||
      accountNameRef.current ||
      bankNameRef.current ||
      bankBranchRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus();
    }
  };

  if (loading) {
    return <VendorProfileSkeleton />;
  }

  return (
    <section
      aria-label="Vendor profile settings"
      className="flex flex-col space-y-6 w-full mb-8"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827] focus:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Profile</span>
      </nav>

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {isApplicationRejected && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="text-xs font-semibold text-red-800">
            Application Rejected
          </p>
          <p className="mt-1 whitespace-pre-line">{rejectionReason}</p>
        </div>
      )}

      {state?.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
              : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
          }`}
        >
          {state.message}
        </div>
      )}

      <form id="vendorLogoForm" action={logoAction} className="hidden">
        <input
          type="hidden"
          name="vendor_id"
          value={vendor?.id || ""}
          readOnly
        />
        <input
          id="vendor_logo_file"
          name="logo_file"
          type="file"
          accept="image/*"
          hidden
          onChange={handleLogoChange}
        />
      </form>

      <form
        key={formKey}
        action={formAction}
        className="flex flex-col space-y-6 w-full"
      >
        <input type="hidden" name="action" value="update_profile" />
        <input type="hidden" name="vendor_id" value={vendor?.id || ""} />
        <input
          type="hidden"
          name="payment_info_id"
          value={paymentInfo?.id || ""}
        />
        <input
          type="hidden"
          name="notification_preferences_id"
          value={notificationPreferences?.id || ""}
        />
        {Object.entries(notificationFields).map(([key, value]) => (
          <input
            key={key}
            type="hidden"
            name={key}
            value={value ? "true" : "false"}
          />
        ))}
        <ProfileHeader
          vendorSummary={vendorSummary}
          vendor={vendor}
          logoPreview={logoPreview}
          logoState={logoState}
          canSaveLogo={Boolean(logoFile) && !isLogoSaved}
          isLogoPending={isLogoPending}
          profileCompletion={profileCompletion}
        />
        {logoState?.message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              logoState.success
                ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
            }`}
          >
            {logoState.message}
          </div>
        )}
        <BusinessInformationSection
          vendorSummary={vendorSummary}
          isVerifiedVendor={isVerifiedVendor}
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          errors={formErrors}
        />
        <BusinessAddressSection
          vendorSummary={vendorSummary}
          errors={formErrors}
        />
        <BusinessReferencesSection
          vendorSummary={vendorSummary}
          errors={formErrors}
        />
        <VerificationNotesSection
          vendorSummary={vendorSummary}
          errors={formErrors}
        />
        <PaymentInformationSection
          paymentSummary={paymentSummary}
          isVerifiedVendor={isVerifiedVendor}
          requestLinks={requestLinks}
          errors={formErrors}
          onEditPayment={handleEditPayment}
          paymentFieldRefs={{
            accountName: accountNameRef,
            bankName: bankNameRef,
            bankBranch: bankBranchRef,
            accountNumber: accountNumberRef,
            routingNumber: routingNumberRef,
          }}
        />
        <NotificationPreferencesSection
          notifications={notifications}
          onChange={handleNotificationChange}
        />
        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-[#E5E7EB] text-[#6B7280] text-sm font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
            disabled={isPending}
          >
            <PiFloppyDisk className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <DocumentsSection
        documentList={documentList}
        documentState={documentState}
        documentAction={documentAction}
        documentPending={documentPending}
        isApplicationApproved={isApplicationApproved}
        documentQueue={documentQueue}
        selectedDocumentTypes={selectedDocumentTypes}
        isDocumentTypeLimitReached={isDocumentTypeLimitReached}
        onAddDocumentRow={handleAddDocumentRow}
        onRemoveDocumentRow={handleRemoveDocumentRow}
        onDocumentRowChange={handleDocumentRowChange}
      />
    </section>
  );
}
