"use client";
import React from "react";

export default function DocumentsTab(props) {
  const { isPending, handleDocumentFileChange, docErrors } = props;

  return (
    <div className="space-y-4">
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
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
              className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
              disabled={isPending}
              onChange={(event) =>
                handleDocumentFileChange(
                  event,
                  "businessRegistrationCertificate"
                )
              }
            />
            {docErrors.businessRegistrationCertificate && (
              <p className="text-[10px] text-red-600">
                {docErrors.businessRegistrationCertificate}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Tax Clearance Certificate
            </p>
            <input
              name="taxClearanceCertificate"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
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
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Owner ID Card / Passport
            </p>
            <input
              name="ownerIdDocument"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
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
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-[#717182]">
              Bank Statement (Last 3 Months)
            </p>
            <input
              name="bankStatement"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
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
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-[11px] text-[#717182]">
              Proof of Business Address
            </p>
            <input
              name="proofOfBusinessAddress"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
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
          </div>
        </div>
        <p className="text-[10px] text-[#9CA3AF]">
          Supported formats: PDF, JPEG, JPG, PNG, DOCX, DOC. Each file must be
          2MB or smaller. Files are uploaded securely and stored as URLs on the
          vendor application.
        </p>
      </section>
    </div>
  );
}
