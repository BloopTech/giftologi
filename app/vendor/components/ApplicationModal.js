"use client";
import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  Landmark,
  Package,
  User,
} from "lucide-react";
import Image from "next/image";
import logo from "../../../public/giftologi-logo.png";
import { useVendorApplicationContext } from "../context";
import { SuccessScreen } from "./success";
import { BusinessInfoStep } from "./businessInfo";
import { DocumentsStep } from "./documents";
import { BankingStep } from "./banking";
import { ProductsStep } from "./products";
import { ContactDetailsStep } from "./contactDetails";
import { StepIndicator } from "./utils";

// Main Modal Component
export default function ApplicationModal({ isOpen, onClose }) {
  const {
    authUser,
    authLoading,
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    documents,
    status,
    applicationId,
    rejectionReason,
    loading,
    saving,
    submitting,
    uploadingDocumentType,
    notice,
    error,
    documentErrors,
    categories,
    categoriesLoading,
    categoriesError,
    isReadOnly,
    saveDraft,
    uploadDocument,
    submitApplication,
  } = useVendorApplicationContext();

  const steps = [
    { id: "contact", label: "Contact Details", icon: User },
    { id: "business", label: "Business Info", icon: Building2 },
    { id: "products", label: "Products", icon: Package },
    { id: "banking", label: "Banking", icon: Landmark },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      if (!isReadOnly) {
        const response = await saveDraft({
          draftData: formData,
          currentStep: nextStep,
        });
        if (!response?.success) return;
      }
      setCurrentStep(nextStep);
      return;
    }

    if (!isReadOnly) {
      await submitApplication();
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 0) {
      const previousStep = currentStep - 1;
      if (!isReadOnly) {
        const response = await saveDraft({
          draftData: formData,
          currentStep: previousStep,
        });
        if (!response?.success) return;
      }
      setCurrentStep(previousStep);
    }
  };

  const handleClose = async () => {
    if (!isReadOnly) {
      await saveDraft({ draftData: formData, currentStep });
    }
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ContactDetailsStep
            formData={formData}
            setFormData={setFormData}
            disabled={isReadOnly}
          />
        );
      case 1:
        return (
          <BusinessInfoStep
            formData={formData}
            setFormData={setFormData}
            disabled={isReadOnly}
          />
        );
      case 2:
        return (
          <ProductsStep
            formData={formData}
            setFormData={setFormData}
            disabled={isReadOnly}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
          />
        );
      case 3:
        return (
          <BankingStep
            formData={formData}
            setFormData={setFormData}
            disabled={isReadOnly}
          />
        );
      case 4:
        return (
          <DocumentsStep
            formData={formData}
            setFormData={setFormData}
            documents={documents}
            onUpload={uploadDocument}
            uploadingDocumentType={uploadingDocumentType}
            documentErrors={documentErrors}
            disabled={isReadOnly}
          />
        );
      default:
        return null;
    }
  };

  const normalizedStatus = (status || "").toLowerCase();
  const isSubmitted = ["pending", "approved"].includes(normalizedStatus);
  const isRejected = normalizedStatus === "rejected";
  const rejectionMessage = rejectionReason?.trim()
    ? rejectionReason.trim()
    : "Your application needs updates before it can be approved.";
  const isBusy = loading || saving || submitting;

  if (!isOpen) return null;

  // Show success screen after submission
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <SuccessScreen
            applicationId={applicationId}
            email={formData.email || authUser?.email}
            onClose={handleClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex aspect-square items-center justify-center">
            <Image src={logo} alt="logo" width={40} height={40} priority />
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-4">
          <h2 className="text-xl font-bold text-gray-900">
            Vendor Application
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Complete all steps to submit your application
          </p>
        </div>

        {(error || notice?.message) && (
          <div className="px-6 pt-4 space-y-2">
            {/* {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )} */}
            {notice?.message && (
              <div
                className={`rounded-xl border px-4 py-3 text-xs ${
                  notice.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {notice.message}
              </div>
            )}
          </div>
        )}

        {isRejected && (
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              <p className="text-[11px] font-semibold text-red-800">
                Application Rejected
              </p>
              <p className="mt-1 whitespace-pre-line">{rejectionMessage}</p>
            </div>
          </div>
        )}

        {/* {!authLoading && !authUser && (
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Sign in to save your progress and submit your application.
            </div>
          </div>
        )} */}

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Divider */}
        <div className="h-1 bg-linear-to-r from-primary via-[#D4C896] to-[#E8E0C0]" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Loading your application...
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0 || isBusy}
            className={`flex items-center gap-2 text-sm font-medium ${
              currentStep === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={isBusy || (isReadOnly && currentStep === steps.length - 1)}
            className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-[#22C55E] text-white text-sm font-medium rounded-full hover:bg-[#16A34A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {currentStep === steps.length - 1
              ? submitting
                ? "Submitting..."
                : "Submit"
              : saving
                ? "Saving..."
                : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
