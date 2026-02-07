"use client";
import React from "react";
import Link from "next/link";
import { FileUploadArea } from "./utils";
import { DOCUMENT_UPLOAD_OPTIONS } from "../../dashboard/v/profile/documentTypes";




// Step 5: Documents
export function DocumentsStep({
  formData,
  setFormData,
  documents,
  onUpload,
  uploadingDocumentType,
  documentErrors,
  disabled,
}) {
  const handleCheckboxChange = (field) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          Step 5 of 5: Documents
        </h3>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm text-gray-500">
            Upload required documents and review terms
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            Required Documents
          </p>
        </div>

        {DOCUMENT_UPLOAD_OPTIONS.filter((o) => !o.optional).map((option) => (
          <FileUploadArea
            key={option.value}
            label={option.label}
            required
            documentType={option.value}
            documents={documents}
            onUpload={onUpload}
            uploadingDocumentType={uploadingDocumentType}
            error={documentErrors?.[option.value]}
            disabled={disabled}
          />
        ))}

        <div className="pt-2">
          <p className="text-sm font-semibold text-gray-900">
            Optional Documents
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            These are not required but may help speed up your application review
          </p>
        </div>

        {DOCUMENT_UPLOAD_OPTIONS.filter((o) => o.optional).map((option) => (
          <FileUploadArea
            key={option.value}
            label={option.label}
            documentType={option.value}
            documents={documents}
            onUpload={onUpload}
            uploadingDocumentType={uploadingDocumentType}
            error={documentErrors?.[option.value]}
            disabled={disabled}
          />
        ))}

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            Terms & Conditions
          </h4>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreeTerms || false}
                onChange={() => handleCheckboxChange("agreeTerms")}
                disabled={disabled}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-gray-600">
                I agree to the{" "}
                <Link href="/terms" className="text-[#3B82F6] hover:underline">
                  Vendor Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[#3B82F6] hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreeCommission || false}
                onChange={() => handleCheckboxChange("agreeCommission")}
                disabled={disabled}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-gray-600">
                I agree to the 15% commission rate on all sales and understand
                that payouts are processed bi-monthly
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
