"use client";
import React, { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PiFloppyDisk } from "react-icons/pi";

import { useVendorProfileContext } from "./context";
import {
  manageProfile,
  uploadVendorDocument,
  defaultDocumentUploadState,
} from "./action";
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
  const [documentState, documentAction, documentPending] = useActionState(
    uploadVendorDocument,
    defaultDocumentUploadState,
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    DOCUMENT_UPLOAD_OPTIONS[0]?.value || "",
  );
  const fileInputRef = useRef(null);

  useEffect(() => {
    setNotifications(mapNotificationSettings(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    if (documentState?.success) {
      refreshData?.();
    }
  }, [documentState?.success, refreshData]);

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
      accountNumber:
        paymentInfo?.bank_account ||
        application?.bank_account_number ||
        draft.accountNumber ||
        "",
      routingNumber:
        paymentInfo?.routing_number ||
        application?.bank_branch_code ||
        draft.routingNumber ||
        "",
      accountType: paymentInfo?.account_type || "",
    };
  }, [paymentInfo, application]);

  const documentList = useMemo(
    () => (Array.isArray(documents) ? documents : []),
    [documents],
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
        <ProfileHeader vendorSummary={vendorSummary} vendor={vendor} />
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
        selectedDocumentType={selectedDocumentType}
        setSelectedDocumentType={setSelectedDocumentType}
        fileInputRef={fileInputRef}
        isApplicationApproved={isApplicationApproved}
      />
    </section>
  );
}
