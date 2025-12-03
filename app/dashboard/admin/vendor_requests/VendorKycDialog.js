"use client";

import React, { useMemo, useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/app/components/Dialog";
import { Badge } from "@/app/components/Badge";
import { cx } from "@/app/components/utils";

const TABS = [
  { id: "business", label: "Business Info" },
  { id: "owner", label: "Owner Details" },
  { id: "documents", label: "Documents" },
  { id: "financial", label: "Financial Info" },
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function safeText(value) {
  if (value === null || typeof value === "undefined") return "";
  const str = String(value).trim();
  return str.length ? str : "";
}

export default function VendorKycDialog({
  request,
  approveAction,
  rejectAction,
  approvePending,
  rejectPending,
}) {
  const [activeTab, setActiveTab] = useState("business");

  const data = useMemo(() => {
    if (!request) return {};
    const app = request.__raw || {};

    return {
      vendorId: request.vendorId || "",
      appliedDate: request.appliedDate || app.created_at || null,
      status: request.status || app.status || "pending",
      businessName: request.businessName || app.business_name || "",
      category: request.category || app.category || "",
      contactName: request.contactName || "",
      contactEmail: request.contactEmail || "",
      businessType: app.business_type || "",
      businessRegistrationNumber: app.business_registration_number || "",
      taxId: app.tax_id || "",
      yearsInBusiness: app.years_in_business,
      website: app.website || "",
      businessDescription: app.business_description || "",
      streetAddress: app.street_address || "",
      city: app.city || "",
      region: app.region || "",
      postalCode: app.postal_code || "",
      ownerFullName: app.owner_full_name || "",
      ownerEmail: app.owner_email || "",
      ownerPhone: app.owner_phone || "",
      businessReferences: Array.isArray(app.business_references)
        ? app.business_references
        : [],
      documents: Array.isArray(app.documents) ? app.documents : [],
      verificationNotes: app.verification_notes || "",
      bankAccountName: app.bank_account_name || "",
      bankName: app.bank_name || "",
      bankAccountNumber: app.bank_account_number || "",
      bankBranchCode: app.bank_branch_code || "",
      financialVerificationNotes: app.financial_verification_notes || "",
      applicationId: request.id,
    };
  }, [request]);

  if (!request) return null;

  const {
    vendorId,
    appliedDate,
    status,
    businessName,
    category,
    contactName,
    contactEmail,
    businessType,
    businessRegistrationNumber,
    taxId,
    yearsInBusiness,
    website,
    businessDescription,
    streetAddress,
    city,
    region,
    postalCode,
    ownerFullName,
    ownerEmail,
    ownerPhone,
    businessReferences,
    documents,
    verificationNotes,
    bankAccountName,
    bankName,
    bankAccountNumber,
    bankBranchCode,
    financialVerificationNotes,
    applicationId,
  } = data;

  const normalizedStatus = (status || "pending").toLowerCase();
  const statusLabel = (status || "pending").replace(/^./, (c) => c.toUpperCase());
  const isPendingStatus = normalizedStatus === "pending";

  const hasBusinessCore = !!(businessName && businessName.trim() && category);
  const hasAddress = !!(
    streetAddress &&
    streetAddress.trim() &&
    city &&
    city.trim() &&
    region &&
    region.trim() &&
    postalCode &&
    postalCode.trim()
  );
  const hasOwner = !!(
    (ownerFullName || contactName) &&
    (ownerEmail || contactEmail)
  );
  const hasBank = !!(
    (bankAccountName || businessName) &&
    bankAccountNumber &&
    bankName &&
    bankBranchCode
  );
  const normalizedDocuments = Array.isArray(documents) ? documents : [];

  const REQUIRED_DOCUMENT_TITLES = [
    "Business Registration Certificate",
    "Tax Clearance Certificate",
    "Owner ID Card/Passport",
    "Bank Statement (Last 3 Months)",
    "Proof of Business Address",
  ];

  const missingRequiredDocuments = REQUIRED_DOCUMENT_TITLES.filter(
    (requiredTitle) => {
      const requiredTitleLower = requiredTitle.toLowerCase();
      return !normalizedDocuments.some((doc) => {
        const candidateTitle = (
          doc?.title ||
          doc?.label ||
          doc?.name ||
          doc?.fileName ||
          doc?.filename ||
          ""
        )
          .toString()
          .trim()
          .toLowerCase();

        if (!candidateTitle) return false;

        const url = doc?.url || doc?.href || doc?.link || null;

        return candidateTitle === requiredTitleLower && !!url;
      });
    }
  );

  const hasAllRequiredDocuments = missingRequiredDocuments.length === 0;
  const hasAnyDocuments = normalizedDocuments.length > 0;

  const isKycComplete =
    hasBusinessCore && hasAddress && hasOwner && hasBank && hasAllRequiredDocuments;

  const disableActions =
    !isPendingStatus || !isKycComplete || approvePending || rejectPending;

  const topMetaLabelParts = [];
  if (vendorId) topMetaLabelParts.push(`Vendor ID: ${vendorId}`);
  if (appliedDate) topMetaLabelParts.push(`Applied: ${formatDate(appliedDate)}`);
  const topMetaLabel = topMetaLabelParts.join(" — ");

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Vendor KYC & Application Details
            </DialogTitle>
            <DialogDescription className="mt-1 text-[11px] text-[#717182]">
              {topMetaLabel || "Review this vendor's KYC information before approval."}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                statusLabel === "Approved"
                  ? "success"
                  : statusLabel === "Rejected"
                  ? "error"
                  : "neutral"
              }
              className="text-[11px]"
            >
              {isPendingStatus ? "Pending Review" : statusLabel || "Pending"}
            </Badge>
            {isPendingStatus && !isKycComplete && (
              <span className="text-[10px] text-[#F97316]">
                KYC information is incomplete. Approve / Reject actions are
                disabled until all required details are captured.
              </span>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="mt-3 space-y-4 text-xs text-[#0A0A0A]">
        {/* Tabs */}
        <div className="mb-1">
          <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "px-3 py-1.5 rounded-full cursor-pointer transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-[#0A0A0A] shadow-sm"
                    : "text-[#6A7282] hover:text-[#0A0A0A]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "business" && (
          <div className="space-y-4">
            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Business Information
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Business Name" value={businessName} />
                  <Field label="Business Type" value={businessType} />
                  <Field
                    label="Business Registration Number"
                    value={businessRegistrationNumber}
                  />
                  <Field label="Tax ID (TIN)" value={taxId} />
                  <Field label="Category" value={category} />
                  <Field
                    label="Years in Business"
                    value={
                      typeof yearsInBusiness === "number"
                        ? `${yearsInBusiness} year${
                            yearsInBusiness === 1 ? "" : "s"
                          }`
                        : ""
                    }
                  />
                  <div className="col-span-2">
                    <p className="text-[11px] text-[#717182]">Website</p>
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-xs text-[#286AD4] break-all"
                      >
                        {website}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-[#6A7282]">
                        
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Business Description
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs text-[#4B5563] whitespace-pre-line">
                  {businessDescription?.trim() || "No description provided."}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Business Address
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                <Field label="Street Address" value={streetAddress} />
                <Field label="City" value={city} />
                <Field label="Region" value={region} />
                <Field label="Postal Code" value={postalCode} />
              </div>
            </section>
          </div>
        )}

        {activeTab === "owner" && (
          <div className="space-y-4">
            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Owner / Primary Contact
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                <Field label="Full Name" value={ownerFullName || contactName} />
                <Field label="Email Address" value={ownerEmail || contactEmail} />
                <Field label="Phone Number" value={ownerPhone} />
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Business References
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                {!businessReferences.length ? (
                  <p className="text-[11px] text-[#717182]">
                    No business references provided.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {businessReferences.map((ref, index) => {
                      const name = safeText(ref?.name || ref?.contact_name);
                      const company = safeText(ref?.company || ref?.business_name);
                      const phone = safeText(ref?.phone || ref?.phone_number);
                      const email = safeText(ref?.email);

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-1"
                        >
                          <p className="text-xs font-medium text-[#0A0A0A]">
                            {name}
                          </p>
                          <p className="text-[11px] text-[#6A7282]">{company}</p>
                          <p className="text-[11px] text-[#6A7282]">{phone}</p>
                          <p className="text-[11px] text-[#6A7282]">{email}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-4">
            {!hasAllRequiredDocuments && (
              <section>
                <div className="rounded-2xl border border-[#F97316] bg-[#FFF7ED] p-3">
                  <p className="text-[11px] text-[#9A3412]">
                    This application is missing one or more required
                    documents. Please ensure all five required documents
                    are uploaded and reviewed before approving this vendor.
                  </p>
                  {missingRequiredDocuments.length > 0 && (
                    <p className="mt-1 text-[10px] text-[#B45309]">
                      Missing: {missingRequiredDocuments.join(", ")}
                    </p>
                  )}
                </div>
              </section>
            )}
            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Submitted Documents
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-2">
                {!hasAnyDocuments ? (
                  <p className="text-[11px] text-[#717182]">
                    No documents have been uploaded for this application.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {normalizedDocuments.map((doc, index) => {
                      const title =
                        doc?.title ||
                        doc?.label ||
                        doc?.name ||
                        `Document ${index + 1}`;
                      const fileName =
                        doc?.fileName ||
                        doc?.filename ||
                        doc?.file ||
                        doc?.path ||
                        "";
                      const url = doc?.url || doc?.href || doc?.link || null;

                      return (
                        <li
                          key={index}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-[#0A0A0A]">
                              {title}
                            </span>
                            {fileName ? (
                              <span className="text-[11px] text-[#6A7282]">
                                {fileName}
                              </span>
                            ) : null}
                          </div>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
                            >
                              View Document
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="rounded-full border border-gray-200 bg-gray-100 px-4 py-1.5 text-[11px] font-medium text-[#9CA3AF] cursor-not-allowed"
                            >
                              View Document
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Verification Checklist
              </p>
              <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                <p className="text-[11px] text-[#1D4ED8] whitespace-pre-line">
                  {verificationNotes?.trim() ||
                    "Add internal verification notes here once documents have been reviewed."}
                </p>
              </div>
            </section>
          </div>
        )}

        {activeTab === "financial" && (
          <div className="space-y-4">
            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Bank Account Details
              </p>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                <Field label="Account Name" value={bankAccountName || businessName} />
                <Field label="Account Number" value={bankAccountNumber} />
                <Field label="Bank Name" value={bankName} />
                <Field label="Branch Code" value={bankBranchCode} />
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium text-[#717182]">
                Financial Verification Notes
              </p>
              <div className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
                <p className="text-[11px] text-[#92400E] whitespace-pre-line">
                  {financialVerificationNotes?.trim() ||
                    "Bank account details must be verified before the vendor can receive payouts."}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <DialogClose asChild>
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
          >
            Close
          </button>
        </DialogClose>

        <div className="flex items-center gap-3">
          <form action={rejectAction}>
            <input type="hidden" name="applicationId" value={applicationId || ""} />
            <button
              type="submit"
              disabled={disableActions}
              className={cx(
                "rounded-full px-5 py-2 text-xs font-medium cursor-pointer border",
                "border-[#DF0404] text-[#DF0404] bg-white hover:bg-[#DF0404] hover:text-white",
                disableActions &&
                  "opacity-60 cursor-not-allowed hover:bg-white hover:text-[#DF0404]"
              )}
            >
              Reject Application
            </button>
          </form>
          <form action={approveAction}>
            <input type="hidden" name="applicationId" value={applicationId || ""} />
            <button
              type="submit"
              disabled={disableActions}
              className={cx(
                "rounded-full px-5 py-2 text-xs font-medium cursor-pointer border",
                "border-[#6EA30B] text:white bg-[#6EA30B] hover:bg:white hover:text-[#6EA30B]",
                disableActions &&
                  "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text:white"
              )}
            >
              Approve Vendor
            </button>
          </form>
        </div>
      </div>
    </DialogContent>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-[#717182]">{label}</p>
      <p className="mt-1 text-xs font-medium text-[#0A0A0A]">{safeText(value)}</p>
    </div>
  );
}
