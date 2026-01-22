"use client";
import React, { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  PiBuilding,
  PiEnvelope,
  PiPhone,
  PiGlobe,
  PiMapPin,
  PiCreditCard,
  PiBell,
  PiFileText,
  PiCheckCircle,
  PiUploadSimple,
  PiPencilSimple,
  PiShieldCheck,
  PiFloppyDisk,
  PiLockKey
} from "react-icons/pi";

import { useVendorProfileContext } from "./context";
import { manageProfile } from "./action";

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
  orderUpdates: preferences?.order_updates ?? defaultNotificationSettings.orderUpdates,
  payoutAlerts: preferences?.payout_alerts ?? defaultNotificationSettings.payoutAlerts,
  lowStockAlerts: preferences?.low_stock_alerts ?? defaultNotificationSettings.lowStockAlerts,
  productReviews: preferences?.product_reviews ?? defaultNotificationSettings.productReviews,
  weeklyReports: preferences?.weekly_reports ?? defaultNotificationSettings.weeklyReports,
  monthlyReports: preferences?.monthly_reports ?? defaultNotificationSettings.monthlyReports,
  marketingEmails: preferences?.marketing_emails ?? defaultNotificationSettings.marketingEmails,
});

const formatMemberSince = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#374151]" />
      <h2 className="text-[#111827] text-base font-semibold font-inter">{title}</h2>
    </div>
  );
}

function FormField({
  label,
  value,
  icon: Icon,
  required,
  className = "",
  name,
  type = "text",
  readOnly = false,
}) {
  const inputClasses = `w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
    readOnly ? "bg-[#F9FAFB] text-[#9CA3AF] cursor-not-allowed" : "bg-white text-[#111827]"
  }`;
  const inputValue = value ?? "";
  const inputProps = readOnly
    ? {
        value: inputValue,
      }
    : {
        defaultValue: inputValue,
      };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[#374151] text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        )}
        <input
          type={type}
          name={name}
          readOnly={readOnly}
          aria-readonly={readOnly}
          tabIndex={readOnly ? -1 : 0}
          className={inputClasses}
          {...inputProps}
        />
      </div>
    </div>
  );
}

function LockedField({ label, value, icon: Icon, name }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#374151] text-sm font-medium flex items-center gap-2">
        {label}
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] px-2 py-0.5">
          <PiLockKey className="w-3 h-3" /> Locked
        </span>
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2.5 text-sm text-[#92400E]">
        {Icon && <Icon className="w-4 h-4 text-[#F59E0B]" />}
        <span className="truncate">{value || "—"}</span>
      </div>
      <input type="hidden" name={name} value={value || ""} />
    </div>
  );
}

function TextAreaField({ label, value, placeholder, name }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#374151] text-sm font-medium">{label}</label>
      <textarea
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none"
      />
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-[#111827]" : "bg-[#D1D5DB]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NotificationRow({ title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
      <div>
        <p className="text-[#111827] text-sm font-medium">{title}</p>
        <p className="text-[#6B7280] text-xs">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

function DocumentRow({ document }) {
  const title = document?.title || document?.name || document?.label || "Document";
  const url = document?.url;
  const verifiedDate = document?.verifiedDate || document?.created_at || null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#D1FAE5] rounded-full">
          <PiCheckCircle className="w-4 h-4 text-[#10B981]" />
        </div>
        <div>
          <p className="text-[#111827] text-sm font-medium">{title}</p>
          <p className="text-[#6B7280] text-xs">
            {verifiedDate ? `Verified on ${formatMemberSince(verifiedDate)}` : "Uploaded"}
          </p>
        </div>
      </div>
      {url ? (
        <Link
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-[#6B7280] text-sm font-medium hover:text-[#111827] transition-colors"
        >
          View
        </Link>
      ) : (
        <span className="text-[#9CA3AF] text-sm">Pending</span>
      )}
    </div>
  );
}

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
  } = useVendorProfileContext();
  const [notifications, setNotifications] = useState(defaultNotificationSettings);
  const [state, formAction, isPending] = useActionState(manageProfile, {
    success: false,
    message: "",
    errors: {},
  });

  useEffect(() => {
    setNotifications(mapNotificationSettings(notificationPreferences));
  }, [notificationPreferences]);

  const vendorSummary = useMemo(
    () => ({
      businessName: vendor?.business_name || application?.business_name || "Your Business",
      legalName: vendor?.legal_name || vendor?.business_name || "",
      description: vendor?.description || application?.business_description || "",
      email: vendor?.email || application?.owner_email || profile?.email || "",
      phone: vendor?.phone || application?.owner_phone || profile?.phone || "",
      website: vendor?.website || application?.website || "",
      taxId: vendor?.tax_id || application?.tax_id || "",
      memberSince: formatMemberSince(vendor?.created_at),
      isVerified: !!vendor?.verified,
      address: {
        street: vendor?.address_street || application?.street_address || "",
        city: vendor?.address_city || application?.city || "",
        state: vendor?.address_state || application?.region || "",
        digitalAddress: vendor?.digital_address || application?.digital_address || "",
        country: vendor?.address_country || "",
      },
    }),
    [vendor, profile, application],
  );

  const paymentSummary = useMemo(
    () => ({
      accountName: paymentInfo?.account_name || application?.bank_account_name || "",
      bankName: paymentInfo?.bank_name || application?.bank_name || "",
      accountNumber: paymentInfo?.bank_account || application?.bank_account_number || "",
      routingNumber: paymentInfo?.routing_number || application?.bank_branch_code || "",
      accountType: paymentInfo?.account_type || "",
    }),
    [paymentInfo, application],
  );
  console.log("paymentSummary", paymentInfo, application);

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
  const supportEmail = supportContact?.support_email || "hello@mygiftologi.com";
  const supportPhone = supportContact?.support_phone || "";
  const supportWhatsapp = supportContact?.whatsapp_link || "";
  const requestLinks = [
    supportEmail
      ? { label: "Email Support", href: `mailto:${supportEmail}` }
      : null,
    supportPhone ? { label: "Call Support", href: `tel:${supportPhone}` } : null,
    supportWhatsapp
      ? { label: "WhatsApp", href: supportWhatsapp, external: true }
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/v" className="text-[#6B7280] hover:text-[#111827]">
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Profile</span>
      </div>

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
        <input type="hidden" name="payment_info_id" value={paymentInfo?.id || ""} />
        <input
          type="hidden"
          name="notification_preferences_id"
          value={notificationPreferences?.id || ""}
        />
        {Object.entries(notificationFields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value ? "true" : "false"} />
        ))}

        {/* Vendor Header Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-xl flex items-center justify-center overflow-hidden">
                {vendor?.logo_url ? (
                  <Image
                    src={vendor.logo_url}
                    alt="Vendor Logo"
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <PiBuilding className="w-8 h-8 text-[#9CA3AF]" />
                )}
              </div>
              {/* Info */}
              <div className="flex flex-col">
                <h1 className="text-[#111827] text-lg font-semibold font-inter">
                  {vendorSummary.businessName}
                </h1>
                <p className="text-[#6B7280] text-sm max-w-xl mt-1">
                  {vendorSummary.description || "Add a short business description to introduce your brand."}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {vendorSummary.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF3C7] text-[#D97706] text-xs font-medium rounded-full">
                      <PiCheckCircle className="w-3 h-3" />
                      Verified Vendor
                    </span>
                  )}
                  <span className="text-[#6B7280] text-xs">
                    Member since {vendorSummary.memberSince}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <PiPencilSimple className="w-4 h-4" />
              Change Logo
            </button>
          </div>
        </div>

        {/* Business Information Section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <SectionHeader icon={PiBuilding} title="Business Information" />
          <p className="text-[#6B7280] text-sm mb-4">
            Manage your business details and contact information
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Business Name"
              name="business_name"
              value={vendorSummary.businessName}
              required
            />
            {isVerifiedVendor ? (
              <LockedField
                label="Legal Name"
                name="legal_name"
                value={vendorSummary.legalName}
              />
            ) : (
              <FormField
                label="Legal Name"
                name="legal_name"
                value={vendorSummary.legalName}
                required
              />
            )}
            <FormField
              label="Email Address"
              name="email"
              value={vendorSummary.email}
              icon={PiEnvelope}
              required
            />
            <FormField
              label="Phone Number"
              name="phone"
              value={vendorSummary.phone}
              icon={PiPhone}
              required
            />
            <FormField
              label="Website"
              name="website"
              value={vendorSummary.website}
              icon={PiGlobe}
            />
            {isVerifiedVendor ? (
              <LockedField
                label="Tax ID / EIN"
                name="tax_id"
                value={vendorSummary.taxId}
              />
            ) : (
              <FormField
                label="Tax ID / EIN"
                name="tax_id"
                value={vendorSummary.taxId}
                required
              />
            )}
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Business Description"
              name="description"
              value={vendorSummary.description}
              placeholder="Tell customers about your business..."
            />
          </div>
        </div>

        {/* Business Address Section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <SectionHeader icon={PiMapPin} title="Business Address" />

          <div className="space-y-4">
            <FormField
              label="Street Address"
              name="address_street"
              value={vendorSummary.address.street}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="City"
                name="address_city"
                value={vendorSummary.address.city}
                required
              />
              <FormField
                label="State"
                name="address_state"
                value={vendorSummary.address.state}
                required
              />
              <FormField
                label="Digital Address"
                name="digital_address"
                value={vendorSummary.address.digitalAddress}
                required
              />
            </div>
            <FormField
              label="Country"
              name="address_country"
              value={vendorSummary.address.country}
              required
            />
          </div>
        </div>

        {/* Payment Information Section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <SectionHeader icon={PiCreditCard} title="Payment Information" />
          <p className="text-[#6B7280] text-sm mb-4">
            Manage your payout account details
          </p>

          {/* Secure Info Banner */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <PiShieldCheck className="w-5 h-5 text-[#3B82F6] mt-0.5" />
              <div>
                <p className="text-[#1E40AF] text-sm font-medium">
                  Secure Payment Information
                </p>
                <p className="text-[#3B82F6] text-xs mt-0.5">
                  Your payment details are encrypted and stored securely. We never share your banking information.
                </p>
              </div>
            </div>
          </div>

          {isVerifiedVendor && (
            <div className="border border-[#FDE68A] bg-[#FFFBEB] rounded-lg p-4 mb-4">
              <p className="text-[#92400E] text-sm font-medium">
                Compliance fields are locked after verification.
              </p>
              <p className="text-[#B45309] text-xs mt-1">
                To change legal name, tax ID, or payout details, submit a request to support.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {requestLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                    className="inline-flex items-center justify-center rounded-full border border-[#F59E0B] px-3 py-1.5 text-xs font-medium text-[#92400E] hover:bg-[#FEF3C7]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: "Account Name",
                name: "account_name",
                value: paymentSummary.accountName,
              },
              { label: "Bank Name", name: "bank_name", value: paymentSummary.bankName },
              {
                label: "Account Number",
                name: "bank_account",
                value: paymentSummary.accountNumber,
              },
              {
                label: "Routing Number",
                name: "routing_number",
                value: paymentSummary.routingNumber,
              },
            ].map((field) =>
              isVerifiedVendor ? (
                <LockedField key={field.name} {...field} />
              ) : (
                <FormField key={field.name} {...field} />
              ),
            )}
          </div>

          <div className="mt-4">
            {isVerifiedVendor ? (
              <LockedField
                label="Account Type"
                name="account_type"
                value={paymentSummary.accountType}
              />
            ) : (
              <FormField
                label="Account Type"
                name="account_type"
                value={paymentSummary.accountType}
              />
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            {isVerifiedVendor && requestLinks.length ? (
              <a
                href={requestLinks[0].href}
                className="w-full inline-flex items-center justify-center py-2.5 text-[#92400E] text-sm font-medium border border-[#F59E0B] rounded-lg hover:bg-[#FEF3C7] transition-colors"
              >
                Request Payment Change
              </a>
            ) : (
              <button
                type="button"
                className="w-full py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                Update Payment Method
              </button>
            )}
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <SectionHeader icon={PiBell} title="Notification Preferences" />
          <p className="text-[#6B7280] text-sm mb-4">
            Choose how you want to receive updates
          </p>

          <div className="space-y-1">
            <NotificationRow
              title="New Orders"
              description="Get notified when you receive new orders"
              enabled={notifications.newOrders}
              onChange={(v) => handleNotificationChange("newOrders", v)}
            />
            <NotificationRow
              title="Order Updates"
              description="Status changes and delivery confirmations"
              enabled={notifications.orderUpdates}
              onChange={(v) => handleNotificationChange("orderUpdates", v)}
            />
            <NotificationRow
              title="Payout Alerts"
              description="Payment processing and completion notifications"
              enabled={notifications.payoutAlerts}
              onChange={(v) => handleNotificationChange("payoutAlerts", v)}
            />
            <NotificationRow
              title="Low Stock Alerts"
              description="When products are running low on inventory"
              enabled={notifications.lowStockAlerts}
              onChange={(v) => handleNotificationChange("lowStockAlerts", v)}
            />
            <NotificationRow
              title="Product Reviews"
              description="Customer reviews and ratings on your products"
              enabled={notifications.productReviews}
              onChange={(v) => handleNotificationChange("productReviews", v)}
            />
            <NotificationRow
              title="Weekly Reports"
              description="Weekly summary of sales and performance"
              enabled={notifications.weeklyReports}
              onChange={(v) => handleNotificationChange("weeklyReports", v)}
            />
            <NotificationRow
              title="Monthly Reports"
              description="Monthly analytics and insights"
              enabled={notifications.monthlyReports}
              onChange={(v) => handleNotificationChange("monthlyReports", v)}
            />
            <NotificationRow
              title="Marketing Emails"
              description="Platform updates and promotional content"
              enabled={notifications.marketingEmails}
              onChange={(v) => handleNotificationChange("marketingEmails", v)}
            />
          </div>
        </div>

        {/* Documents & Compliance Section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <SectionHeader icon={PiFileText} title="Documents & Compliance" />
          <p className="text-[#6B7280] text-sm mb-4">
            Manage your business documents and certifications
          </p>

          <div className="space-y-1">
            {documentList.length === 0 ? (
              <p className="py-4 text-sm text-[#6B7280]">No documents uploaded yet.</p>
            ) : (
              documentList.map((doc, index) => (
                <DocumentRow key={doc?.id || doc?.title || index} document={doc} />
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <PiUploadSimple className="w-4 h-4" />
              Upload New Document
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="reset"
            className="px-6 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
            disabled={isPending}
          >
            <PiFloppyDisk className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}