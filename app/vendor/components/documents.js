"use client";
import React from "react";
import Link from "next/link";
import { FileUploadArea } from "./utils";




// Step 5: Documents
export function DocumentsStep({ formData, setFormData }) {
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

        <FileUploadArea
          label="Business License"
          required
          fileKey="businessLicense"
          formData={formData}
          setFormData={setFormData}
        />

        <FileUploadArea
          label="Tax Certificate / Reseller Permit"
          required
          fileKey="taxCertificate"
          formData={formData}
          setFormData={setFormData}
        />

        <FileUploadArea
          label="W-9 Form"
          required
          fileKey="w9Form"
          formData={formData}
          setFormData={setFormData}
        />

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
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#BBA96C] focus:ring-[#BBA96C]"
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
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#BBA96C] focus:ring-[#BBA96C]"
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
