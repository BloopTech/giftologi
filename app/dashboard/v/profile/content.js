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
  PaymentInformationSection,
  NotificationPreferencesSection,
  DocumentsSection,
} from "./components/profileSections";
import { DOCUMENT_UPLOAD_OPTIONS } from "./documentTypes";

const defaultNotificationSettings = {
  newOrders: true,
  orderUpdates: true,
  payoutAlerts: true,
  lowStockAlerts: true,
  productReviews: true,
  weeklyReports: true,
  monthlyReports: true,
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

export default function VendorProfileContent() {
  const {
    profile,
    vendor,
    paymentInfo,
    notificationPreferences,
    documents,
    application,
    supportContact,
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
  const [logoState, logoAction, isLogoPending] = useActionState(saveVendorLogo, {
    success: false,
    message: "",
    errors: {},
    data: {},
  });
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
  const [documentQueue, setDocumentQueue] = useState(() => [createDocumentRow()]);

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

      return prev.map((row) => (row.id === id ? { ...row, [field]: value } : row));
    });
  };

  useEffect(() => {
    setNotifications(mapNotificationSettings(notificationPreferences));
  }, [notificationPreferences]);

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
        state: vendor?.address_state || application?.region || draft.region || "",
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
    const accountNumberMasked =
      paymentInfo?.bank_account_masked ||
      (paymentInfo?.bank_account_last4
        ? `****${paymentInfo.bank_account_last4}`
        : "") ||
      maskAccount(application?.bank_account_number || draft.accountNumber);

    return {
      accountName:
        paymentInfo?.account_name ||
        application?.bank_account_name ||
        draft.accountHolderName ||
        "",
      bankName:
        paymentInfo?.bank_name || application?.bank_name || draft.bankName || "",
      bankBranch:
        paymentInfo?.bank_branch ||
        application?.bank_branch ||
        draft.bankBranch ||
        "",
      accountNumber: "",
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
      accountNameRef.current ||
      bankNameRef.current ||
      bankBranchRef.current ||
      accountNumberRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus();
    }
  };

  return (
    <section aria-label="Vendor profile settings" className="flex flex-col space-y-6 w-full mb-8">
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

      {loading && (
        <div className="text-xs text-[#6B7280]">Refreshing profile data...</div>
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

      <form
        id="vendorLogoForm"
        action={logoAction}
        encType="multipart/form-data"
        className="hidden"
      >
        <input type="hidden" name="vendor_id" value={vendor?.id || ""} readOnly />
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
          <input key={key} type="hidden" name={key} value={value ? "true" : "false"} />
        ))}
        <ProfileHeader
          vendorSummary={vendorSummary}
          vendor={vendor}
          logoPreview={logoPreview}
          logoState={logoState}
          canSaveLogo={Boolean(logoFile) && !isLogoSaved}
          isLogoPending={isLogoPending}
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
          errors={formErrors}
        />
        <BusinessAddressSection vendorSummary={vendorSummary} errors={formErrors} />
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
