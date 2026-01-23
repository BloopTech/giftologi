"use client";
import React, { Fragment } from "react";
import { Check, Upload } from "lucide-react";

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
                    ? "bg-[#BBA96C] border-[#BBA96C] text-white"
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
                  ? "text-[#BBA96C]"
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
  fileKey,
  formData,
  setFormData,
}) {
  const file = formData[fileKey];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFormData((prev) => ({ ...prev, [fileKey]: selectedFile }));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="border border-gray-300 rounded-lg p-4">
        <label className="flex flex-col items-center cursor-pointer">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-6 h-6 text-gray-400 mb-2" />
          {file ? (
            <span className="text-sm text-[#BBA96C] font-medium">
              {file.name}
            </span>
          ) : (
            <span className="text-sm text-[#3B82F6]">Click to upload</span>
          )}
          <span className="text-xs text-gray-400 mt-1">
            PDF, JPG or PNG (Max 10MB)
          </span>
        </label>
      </div>
    </div>
  );
}
