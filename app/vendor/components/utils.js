"use client";
import React, { Fragment } from "react";
import { Check, Upload } from "lucide-react";
import {
  DOCUMENT_ACCEPT_TYPES,
  MAX_VENDOR_DOC_FILE_SIZE_MB,
} from "../../dashboard/v/profile/documentTypes";

// Step indicator component
export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center w-full px-4 py-6">
      {steps.map((step, index) => (
        <Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                index < currentStep
                  ? "bg-[#22C55E] border-[#22C55E] text-white"
                  : index === currentStep
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {index < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            <span
              className={`text-xs mt-2 font-medium ${
                index === currentStep
                  ? "text-primary"
                  : index < currentStep
                    ? "text-[#22C55E]"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                index < currentStep ? "bg-[#22C55E]" : "bg-gray-300"
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// Generate Application ID
export function generateApplicationId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `APP-${year}-${randomNum}`;
}

// File Upload Component
export function FileUploadArea({
  label,
  required,
  documentType,
  documents,
  onUpload,
  uploadingDocumentType,
  error,
  disabled,
}) {
  const existingDocument = (documents || []).find((doc) => {
    const candidate = (doc?.title || doc?.label || doc?.name || "")
      .toString()
      .toLowerCase();
    return candidate === label.toLowerCase();
  });

  const isUploading = uploadingDocumentType === documentType;

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !onUpload) return;
    await onUpload({ documentType, file: selectedFile });
    e.target.value = "";
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        className={`border rounded-lg p-4 ${
          disabled ? "border-gray-200 bg-gray-50" : "border-gray-300"
        }`}
      >
        <label
          className={`flex flex-col items-center ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            type="file"
            accept={DOCUMENT_ACCEPT_TYPES}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <Upload className="w-6 h-6 text-gray-400 mb-2" />
          {existingDocument?.url ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-emerald-600 font-semibold">
                Uploaded
              </span>
              <a
                href={existingDocument.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary font-medium hover:underline"
              >
                View document
              </a>
            </div>
          ) : (
            <span className="text-sm text-[#3B82F6]">
              {isUploading ? "Uploading..." : "Click to upload"}
            </span>
          )}
          <span className="text-xs text-gray-400 mt-1">
            Accepted: PDF, JPG, PNG, DOC (Max {MAX_VENDOR_DOC_FILE_SIZE_MB}MB)
          </span>
        </label>
      </div>
      {error ? (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      ) : null}
    </div>
  );
}
