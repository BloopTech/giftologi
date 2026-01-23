"use client";
import React, { useState, Fragment } from "react";
import Link from "next/link";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  Package,
  Landmark,
  FileText,
  Check,
  MapPin,
  Info,
  Upload,
  Mail,
  Clock,
  CheckCircle,
  Copy,
} from "lucide-react";
import Image from "next/image";
import logo from "../../../public/giftologi-logo.png";
import { SuccessScreen } from "./success";
import { BusinessInfoStep } from "./businessInfo";
import { DocumentsStep } from "./documents";
import { BankingStep } from "./banking";
import { ProductsStep } from "./products";
import { ContactDetailsStep } from "./contactDetails";
import { generateApplicationId, StepIndicator } from "./utils";

// Main Modal Component
export default function ApplicationModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");

  const steps = [
    { id: "business", label: "Business Info", icon: Building2 },
    { id: "contact", label: "Contact Details", icon: User },
    { id: "products", label: "Products", icon: Package },
    { id: "banking", label: "Banking", icon: Landmark },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit the application
      const newApplicationId = generateApplicationId();
      setApplicationId(newApplicationId);
      setIsSubmitted(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFormData({});
    setIsSubmitted(false);
    setApplicationId("");
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BusinessInfoStep formData={formData} setFormData={setFormData} />
        );
      case 1:
        return (
          <ContactDetailsStep formData={formData} setFormData={setFormData} />
        );
      case 2:
        return <ProductsStep formData={formData} setFormData={setFormData} />;
      case 3:
        return <BankingStep formData={formData} setFormData={setFormData} />;
      case 4:
        return <DocumentsStep formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  // Show success screen after submission
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <SuccessScreen
            applicationId={applicationId}
            email={formData.email}
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

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Divider */}
        <div className="h-1 bg-gradient-to-r from-[#BBA96C] via-[#D4C896] to-[#E8E0C0]" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{renderStep()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
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
            className="flex items-center gap-2 px-6 py-2.5 bg-[#22C55E] text-white text-sm font-medium rounded-full hover:bg-[#16A34A] transition-colors"
          >
            {currentStep === steps.length - 1 ? "Submit" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
