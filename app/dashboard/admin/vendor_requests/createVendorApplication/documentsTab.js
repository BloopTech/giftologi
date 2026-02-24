"use client";
import React from "react";
import Link from "next/link";

export default function DocumentsTab(props) {
  const {
    isPending,
    handleDocumentFileChange,
    docErrors,
    selectedFiles = {},
    existingDocuments = [],
    height
  } = props;

  const normalizedDocs = Array.isArray(existingDocuments)
    ? existingDocuments
    : [];

  const findExisting = (title) => {
    const target = title.toLowerCase();
    return normalizedDocs.find((doc) => {
      const candidate = (doc?.title || "").toString().trim().toLowerCase();
      return candidate === target && doc?.url;
    });
  };

  const renderMeta = (title, fileKey) => {
    const selected = selectedFiles?.[fileKey];
    const existing = findExisting(title);

    if (selected?.name) {
      return (
        <p className="text-[10px] text-[#2563EB]">Selected: {selected.name}</p>
      );
    }

    if (existing?.url) {
      return (
        <Link
          href={existing.url}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-[#2563EB] underline"
        >
          View current document
        </Link>
      );
    }

    return null;
  };

  return (
    <div className={`space-y-4 w-full ${height} scroll-smooth`}>
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Submitted Documents
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Business Registration Certificate
            </p>
            <input
              name="businessRegistrationCertificate"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc,.webp"
              className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
              disabled={isPending}
              onChange={(event) =>
                handleDocumentFileChange(
                  event,
                  "businessRegistrationCertificate",
                )
              }
            />
            {docErrors.businessRegistrationCertificate && (
              <p className="text-[10px] text-red-600">
                {docErrors.businessRegistrationCertificate}
              </p>
            )}
            {renderMeta(
              "Business Registration Certificate",
              "businessRegistrationCertificate",
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Tax Clearance Certificate
            </p>
            <input
              name="taxClearanceCertificate"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc,.webp"
              className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
              disabled={isPending}
              onChange={(event) =>
                handleDocumentFileChange(event, "taxClearanceCertificate")
              }
            />
            {docErrors.taxClearanceCertificate && (
              <p className="text-[10px] text-red-600">
                {docErrors.taxClearanceCertificate}
              </p>
            )}
            {renderMeta("Tax Clearance Certificate", "taxClearanceCertificate")}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Owner ID Card / Passport <span className="text-red-500">*</span>
            </p>
            <input
              name="ownerIdDocument"
              required
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc,.webp"
              className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
              disabled={isPending}
              onChange={(event) =>
                handleDocumentFileChange(event, "ownerIdDocument")
              }
            />
            {docErrors.ownerIdDocument && (
              <p className="text-[10px] text-red-600">
                {docErrors.ownerIdDocument}
              </p>
            )}
            {renderMeta("Owner ID Card / Passport", "ownerIdDocument")}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Bank Statement (Last 3 Months)
            </p>
            <input
              name="bankStatement"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc,.webp"
              className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
              disabled={isPending}
              onChange={(event) =>
                handleDocumentFileChange(event, "bankStatement")
              }
            />
            {docErrors.bankStatement && (
              <p className="text-[10px] text-red-600">
                {docErrors.bankStatement}
              </p>
            )}
            {renderMeta("Bank Statement (Last 3 Months)", "bankStatement")}
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-[11px] text-[#717182]">
              Proof of Business Address
            </p>
            <input
              name="proofOfBusinessAddress"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc,.webp"
              className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
              disabled={isPending}
              onChange={(event) =>
                handleDocumentFileChange(event, "proofOfBusinessAddress")
              }
            />
            {docErrors.proofOfBusinessAddress && (
              <p className="text-[10px] text-red-600">
                {docErrors.proofOfBusinessAddress}
              </p>
            )}
            {renderMeta("Proof of Business Address", "proofOfBusinessAddress")}
          </div>
        </div>
        <p className="text-[10px] text-[#9CA3AF]">
          Owner ID Card / Passport is required for approval.
        </p>
        <p className="text-[10px] text-[#9CA3AF]">
          Supported formats: PDF, JPEG, JPG, WEBP, PNG, DOCX, DOC. Each file
          must be 2MB or smaller. Files are uploaded securely and stored as URLs
          on the vendor application.
        </p>
      </section>
    </div>
  );
}
