"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PiBuilding,
  PiCheckCircle,
  PiPencilSimple,
  PiShieldCheck,
  PiWarningCircle,
  PiUploadSimple,
  PiCreditCard,
  PiBell,
  PiMapPin,
  PiFileText,
  PiUsersThree,
  PiSpinnerGap,
} from "react-icons/pi";

import {
  SectionHeader,
  FormField,
  LockedField,
  TextAreaField,
  NotificationRow,
  DocumentRow,
} from "./formControls";
import { ProgressBar } from "@/app/components/ProgressBar";
import {
  DOCUMENT_UPLOAD_OPTIONS,
  DOCUMENT_ACCEPT_TYPES,
  MAX_VENDOR_DOC_FILE_SIZE_MB,
} from "../documentTypes";

export function ProfileHeader({
  vendorSummary,
  vendor,
  logoPreview,
  canSaveLogo,
  isLogoPending,
  profileCompletion,
}) {
  const logoSrc = logoPreview || vendor?.logo_url;
  return (
    <div className="flex flex-col w-full space-y-4">
      <div className="flex justify-end">
        {profileCompletion && (
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between text-[11px] text-[#6B7280] mb-1">
              <span>Profile completion</span>
              <span className="text-[#111827] font-medium">
                {profileCompletion.label}
              </span>
            </div>
            <ProgressBar
              value={profileCompletion.percent}
              max={100}
              variant="success"
              showAnimation
            />
            {!profileCompletion.isComplete && profileCompletion.missing && (
              <div className="mt-1 text-[11px] text-[#6B7280]">
                Next: <span className="text-[#111827]">{profileCompletion.missing}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#F3F4F6] rounded-xl flex items-center justify-center overflow-hidden">
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt="Vendor Logo"
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              ) : (
                <PiBuilding className="w-8 h-8 text-[#9CA3AF]" />
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-[#111827] text-lg font-semibold font-inter">
                {vendorSummary.businessName}
              </h1>
              <p className="text-[#6B7280] text-sm max-w-xl mt-1">
                {vendorSummary.description ||
                  "Add a short business description to introduce your brand."}
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

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <label
                htmlFor="vendor_logo_file"
                className="cursor-pointer inline-flex items-center gap-2 px-3 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                <PiPencilSimple className="w-4 h-4" />
                Change Logo
              </label>
              {canSaveLogo && (
                <button
                  type="submit"
                  form="vendorLogoForm"
                  disabled={isLogoPending}
                  className="cursor-pointer inline-flex items-center gap-2 px-3 py-2.5 text-white text-sm font-medium bg-[#111827] rounded-lg hover:bg-[#1F2937] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLogoPending ? "Saving..." : "Save Logo"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusinessInformationSection({
  vendorSummary,
  isVerifiedVendor,
  categories = [],
  categoriesLoading = false,
  categoriesError = null,
  errors = {},
}) {
  const selectedCategories = Array.isArray(vendorSummary.categories)
    ? vendorSummary.categories
    : [];
  const categoryOptions = Array.isArray(categories) ? categories : [];
  const mergedCategories = [...categoryOptions];
  const categoryNameSet = new Set(
    categoryOptions.map((category) => category?.name).filter(Boolean),
  );

  selectedCategories.forEach((name) => {
    if (!categoryNameSet.has(name)) {
      mergedCategories.push({ id: `legacy-${name}`, name, isInactive: true });
    }
  });

  const categoryContainerClass = `rounded-lg border px-3 py-3 bg-white space-y-2 ${
    errors.category ? "border-[#FCA5A5]" : "border-[#D1D5DB]"
  }`;

  return (
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
          error={errors.business_name}
        />
        <div className="md:col-span-2">
          <label className="text-[#374151] text-sm font-medium">
            Categories <span className="text-red-500">*</span>
          </label>
          <div className={categoryContainerClass}>
            {categoriesLoading ? (
              <p className="text-sm text-[#6B7280]">Loading categories...</p>
            ) : categoriesError ? (
              <p className="text-sm text-[#B91C1C]">{categoriesError}</p>
            ) : mergedCategories.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No categories available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mergedCategories.map((category) => (
                  <label
                    key={category.id || category.name}
                    className="flex items-center gap-2 text-sm text-[#374151]"
                  >
                    <input
                      type="checkbox"
                      name="category"
                      value={category.name}
                      defaultChecked={selectedCategories.includes(
                        category.name,
                      )}
                      disabled={categoriesLoading}
                      className="h-4 w-4 rounded border-[#D1D5DB] focus:ring-primary accent-primary peer-checked:text-white text-[#111827]"
                    />
                    <span>
                      {category.name}
                      {category.isInactive ? " (inactive)" : ""}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {errors.category && (
            <p className="text-xs text-red-600 mt-1">{errors.category}</p>
          )}
        </div>
        {isVerifiedVendor ? (
          <LockedField
            label="Legal Business Name"
            name="legal_name"
            value={vendorSummary.legalName}
          />
        ) : (
          <FormField
            label="Legal Business Name"
            name="legal_name"
            value={vendorSummary.legalName}
            required
            error={errors.legal_name}
          />
        )}
        {isVerifiedVendor ? (
          <LockedField
            label="Business Type"
            name="business_type"
            value={vendorSummary.businessType}
          />
        ) : (
          <FormField
            label="Business Type"
            name="business_type"
            value={vendorSummary.businessType}
            required
            error={errors.business_type}
          />
        )}
        {isVerifiedVendor ? (
          <LockedField
            label="Business Registration Number"
            name="business_registration_number"
            value={vendorSummary.businessRegistrationNumber}
          />
        ) : (
          <FormField
            label="Business Registration Number"
            name="business_registration_number"
            value={vendorSummary.businessRegistrationNumber}
            required
            error={errors.business_registration_number}
          />
        )}
        <FormField
          label="Years in Business"
          name="yearsInBusiness"
          type="number"
          value={vendorSummary.yearsInBusiness}
          error={errors.years_in_business}
        />
        <FormField
          label="Email Address"
          name="email"
          value={vendorSummary.email}
          required
          error={errors.email}
        />
        <FormField
          label="Phone Number"
          name="phone"
          value={vendorSummary.phone}
          required
          error={errors.phone}
        />
        <FormField
          label="Website"
          name="website"
          value={vendorSummary.website}
          error={errors.website}
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
            error={errors.tax_id}
          />
        )}
      </div>

      <div className="mt-4">
        <TextAreaField
          label="Business Description"
          name="description"
          value={vendorSummary.description}
          placeholder="Tell customers about your business..."
          error={errors.description}
        />
      </div>
    </div>
  );
}

export function BusinessReferencesSection({ vendorSummary, errors = {} }) {
  const references = vendorSummary.references || {};
  const referenceRows = [
    { key: "ref1", label: "Reference 1", data: references.ref1 || {} },
    { key: "ref2", label: "Reference 2", data: references.ref2 || {} },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <SectionHeader icon={PiUsersThree} title="Business References" />
      <p className="text-[#6B7280] text-sm mb-4">
        Provide two business references we can contact if needed.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {referenceRows.map((reference) => (
          <div
            key={reference.key}
            className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3"
          >
            <p className="text-sm font-semibold text-[#374151]">
              {reference.label}
            </p>
            <FormField
              label="Name"
              name={`${reference.key}Name`}
              value={reference.data.name || ""}
              error={errors[`${reference.key}_name`]}
            />
            <FormField
              label="Company"
              name={`${reference.key}Company`}
              value={reference.data.company || ""}
              error={errors[`${reference.key}_company`]}
            />
            <FormField
              label="Phone"
              name={`${reference.key}Phone`}
              value={reference.data.phone || ""}
              error={errors[`${reference.key}_phone`]}
            />
            <FormField
              label="Email"
              name={`${reference.key}Email`}
              type="email"
              value={reference.data.email || ""}
              error={errors[`${reference.key}_email`]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function VerificationNotesSection({ vendorSummary, errors = {} }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <SectionHeader icon={PiShieldCheck} title="Verification Notes" />
      <p className="text-[#6B7280] text-sm mb-4">
        Admin-only notes shared during the verification process.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TextAreaField
          label="Verification Notes"
          name="verificationNotes"
          value={vendorSummary.verificationNotes}
          placeholder="No admin verification notes yet."
          error={errors.verification_notes}
          readOnly
          helperText="Shared by the admin review team."
        />
        <TextAreaField
          label="Financial Verification Notes"
          name="financialVerificationNotes"
          value={vendorSummary.financialVerificationNotes}
          placeholder="No financial verification notes yet."
          error={errors.financial_verification_notes}
          readOnly
          helperText="Shared by the admin review team."
        />
      </div>
    </div>
  );
}

export function BusinessAddressSection({ vendorSummary, errors = {} }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <SectionHeader icon={PiMapPin} title="Business Address" />

      <div className="space-y-4">
        <FormField
          label="Street Address"
          name="address_street"
          value={vendorSummary.address.street}
          required
          error={errors.address_street}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="City"
            name="address_city"
            value={vendorSummary.address.city}
            required
            error={errors.address_city}
          />
          <FormField
            label="State"
            name="address_state"
            value={vendorSummary.address.state}
            required
            error={errors.address_state}
          />
          <FormField
            label="Digital Address"
            name="digital_address"
            value={vendorSummary.address.digitalAddress}
            required
            error={errors.digital_address}
          />
        </div>
        <FormField
          label="Country"
          name="address_country"
          value={vendorSummary.address.country}
          required
          error={errors.address_country}
        />
      </div>
    </div>
  );
}

export function PaymentInformationSection({
  paymentSummary,
  isVerifiedVendor,
  requestLinks,
  isPending,
  errors = {},
  onEditPayment,
  paymentFieldRefs = {},
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <SectionHeader icon={PiCreditCard} title="Payment Information" />
      <p className="text-[#6B7280] text-sm mb-4">
        Manage your payout account details
      </p>

      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <PiShieldCheck className="w-5 h-5 text-[#3B82F6] mt-0.5" />
          <div>
            <p className="text-[#1E40AF] text-sm font-medium">
              Secure Payment Information
            </p>
            <p className="text-[#3B82F6] text-xs mt-0.5">
              Your payment details are encrypted and stored securely. We never
              share your banking information.
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
            To change legal name, tax ID, or payout details, submit a request to
            support.
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
            required: true,
            inputRef: paymentFieldRefs.accountName,
          },
          {
            label: "Bank Name",
            name: "bank_name",
            value: paymentSummary.bankName,
            required: true,
            inputRef: paymentFieldRefs.bankName,
          },
          {
            label: "Bank Branch",
            name: "bank_branch",
            value: paymentSummary.bankBranch,
            required: true,
            inputRef: paymentFieldRefs.bankBranch,
          },
          {
            label: "Account Number",
            name: "bank_account",
            value: isVerifiedVendor
              ? paymentSummary.accountNumberMasked
              : paymentSummary.accountNumber,
            required: true,
            inputRef: paymentFieldRefs.accountNumber,
            helperText:
              !isVerifiedVendor && paymentSummary.accountNumberMasked
                ? `Current on file: ${paymentSummary.accountNumberMasked}`
                : undefined,
          },
          {
            label: "Branch Code (optional)",
            name: "routing_number",
            value: paymentSummary.routingNumber,
            inputRef: paymentFieldRefs.routingNumber,
          },
        ].map((field) =>
          isVerifiedVendor ? (
            <LockedField key={field.name} {...field} mask />
          ) : (
            <FormField key={field.name} {...field} error={errors[field.name]} />
          ),
        )}
      </div>

      <div className="mt-4">
        {isVerifiedVendor ? (
          <LockedField
            label="Account Type"
            name="account_type"
            value={paymentSummary.accountType}
            mask
          />
        ) : (
          <FormField
            label="Account Type"
            name="account_type"
            value={paymentSummary.accountType}
            error={errors.account_type}
          />
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
        {isVerifiedVendor && requestLinks.length ? (
          <Link
            href={requestLinks[0].href}
            className="w-full inline-flex items-center justify-center py-2.5 text-[#92400E] text-sm font-medium border border-[#F59E0B] rounded-lg hover:bg-[#FEF3C7] transition-colors"
          >
            Request Payment Change
          </Link>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer w-full inline-flex items-center justify-center gap-2 py-2.5 text-[#374151] text-sm font-medium border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            {isPending && <PiSpinnerGap className="w-4 h-4 animate-spin" />}
            {isPending ? "Updating..." : "Update Payment Method"}
          </button>
        )}
      </div>
    </div>
  );
}

export function NotificationPreferencesSection({ notifications, onChange }) {
  return (
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
          onChange={(v) => onChange("newOrders", v)}
        />
        <NotificationRow
          title="Order Updates"
          description="Status changes and delivery confirmations"
          enabled={notifications.orderUpdates}
          onChange={(v) => onChange("orderUpdates", v)}
        />
        <NotificationRow
          title="Payout Alerts"
          description="Payment processing and completion notifications"
          enabled={notifications.payoutAlerts}
          onChange={(v) => onChange("payoutAlerts", v)}
        />
        <NotificationRow
          title="Low Stock Alerts"
          description="When products are running low on inventory"
          enabled={notifications.lowStockAlerts}
          onChange={(v) => onChange("lowStockAlerts", v)}
        />
        <NotificationRow
          title="Product Reviews"
          description="Customer reviews and ratings on your products"
          enabled={notifications.productReviews}
          onChange={(v) => onChange("productReviews", v)}
        />
        <NotificationRow
          title="Weekly Reports"
          description="Weekly summary of sales and performance"
          enabled={notifications.weeklyReports}
          onChange={(v) => onChange("weeklyReports", v)}
        />
        <NotificationRow
          title="Monthly Reports"
          description="Monthly analytics and insights"
          enabled={notifications.monthlyReports}
          onChange={(v) => onChange("monthlyReports", v)}
        />
        <NotificationRow
          title="Marketing Emails"
          description="Platform updates and promotional content"
          enabled={notifications.marketingEmails}
          onChange={(v) => onChange("marketingEmails", v)}
        />
      </div>
    </div>
  );
}

export function DocumentsSection({
  documentList,
  documentState,
  documentAction,
  documentPending,
  isApplicationApproved,
  documentQueue,
  selectedDocumentTypes,
  isDocumentTypeLimitReached,
  onAddDocumentRow,
  onRemoveDocumentRow,
  onDocumentRowChange,
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <SectionHeader icon={PiFileText} title="Documents & Compliance" />
      <p className="text-[#6B7280] text-sm mb-4">
        Manage your business documents and certifications
      </p>

      <div className="space-y-1">
        {documentList.length === 0 ? (
          <p className="py-4 text-sm text-[#6B7280]">
            No documents uploaded yet.
          </p>
        ) : (
          documentList.map((doc, index) => (
            <DocumentRow key={doc?.id || doc?.title || index} document={doc} />
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-3">
        {documentState?.message && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              documentState.success
                ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
            }`}
          >
            <PiWarningCircle className="w-4 h-4 mt-0.5" />
            <span>{documentState.message}</span>
          </div>
        )}

        <form action={documentAction} className="space-y-3">
          {documentQueue.map((row, idx) => (
            <div
              key={row.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Document Type
                </label>
                <select
                  name={`document_type_${idx}`}
                  value={row.type}
                  onChange={(e) =>
                    onDocumentRowChange(row.id, "type", e.target.value)
                  }
                  disabled={documentPending || isApplicationApproved}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                >
                  {DOCUMENT_UPLOAD_OPTIONS.map((option) => {
                    const isSelectedElsewhere =
                      selectedDocumentTypes?.includes(option.value) &&
                      option.value !== row.type;
                    return (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={isSelectedElsewhere}
                      >
                        {option.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Select File
                </label>
                <input
                  type="file"
                  name={`document_file_${idx}`}
                  accept={DOCUMENT_ACCEPT_TYPES}
                  disabled={documentPending || isApplicationApproved}
                  onChange={(e) =>
                    onDocumentRowChange(
                      row.id,
                      "file",
                      e.target.files?.[0] || null,
                    )
                  }
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827] file:mr-3 file:rounded-full file:border file:border-[#D1D5DB] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#111827] hover:border-[#9CA3AF] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                />
              </div>

              {documentQueue.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveDocumentRow(row.id)}
                  disabled={documentPending || isApplicationApproved}
                  className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Remove document row"
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          {documentState?.errors?.document_file && (
            <p className="text-xs text-red-600">
              {documentState.errors.document_file}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddDocumentRow}
              disabled={
                documentPending ||
                isApplicationApproved ||
                isDocumentTypeLimitReached
              }
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-lg leading-none">+</span> Add Document
            </button>
          </div>

          <p className="text-xs text-[#6B7280]">
            Files must be {MAX_VENDOR_DOC_FILE_SIZE_MB}MB or smaller. Supported
            formats: {DOCUMENT_ACCEPT_TYPES.replace(/\./g, "").toUpperCase()}.
          </p>

          <button
            type="submit"
            disabled={documentPending || isApplicationApproved}
            className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PiUploadSimple className="w-4 h-4" />
            {isApplicationApproved
              ? "Documents locked after approval"
              : documentPending
                ? "Uploading..."
                : "Upload Documents"}
          </button>
        </form>
      </div>
    </div>
  );
}
