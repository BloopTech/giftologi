"use client";
import React, { useActionState, useEffect, useState, useCallback } from "react";
import { createRegistryAction } from "../../action";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { DialogClose } from "../../../../components/Dialog";
import StepIndicator from "./StepIndicator";
import {
  EventDetailsStep,
  DeliveryAddressStep,
  PersonaliseStep,
  PrivacyStep,
  ShareStep,
} from "./steps";

const STEP_TITLES = {
  1: "Registry Builder",
  2: "Delivery Address",
  3: "Personalise",
  4: "Privacy",
  5: "Share Registry",
};

const initialState = {
  message: "",
  errors: {
    title: [],
    type: [],
    location: [],
    description: [],
    date: [],
    deadline: [],
    privacy: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

export default function RegistryBuilderDialog({ onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    date: undefined,
    location: "",
    description: "",
    useCurrentLocation: false,
    gpsLocation: "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    privacy: "public",
    eventPhoto: null,
    coverPhoto: null,
  });

  const [state, formAction, isPending] = useActionState(
    createRegistryAction,
    initialState
  );

  useEffect(() => {
    if (state?.message && state?.errors && Object.keys(state.errors).length) {
      const hasActualErrors = Object.values(state.errors).some(
        (err) => Array.isArray(err) && err.length > 0
      );
      if (hasActualErrors) {
        toast.error(state.message);
      }
    }
    if (state?.message && state?.data && Object.keys(state.data).length) {
      toast.success(state.message);
      onClose?.();
    }
  }, [state?.message, state?.errors, state?.data, onClose]);

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleContinue = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return formData.title && formData.type && formData.date;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      errors: state?.errors || {},
      disabled: isPending,
    };

    switch (currentStep) {
      case 1:
        return <EventDetailsStep {...stepProps} />;
      case 2:
        return <DeliveryAddressStep {...stepProps} />;
      case 3:
        return <PersonaliseStep {...stepProps} />;
      case 4:
        return <PrivacyStep {...stepProps} />;
      case 5:
        return <ShareStep {...stepProps} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === 5;

  return (
    <div className="flex flex-col">
      {/* Header with Back button and Title */}
      <div className="flex items-center gap-4 mb-6">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#A5914B] border border-[#A5914B] rounded-full hover:bg-[#A5914B]/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-900 flex-1 text-center pr-[72px]">
          {STEP_TITLES[currentStep]}
        </h2>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Form Content */}
      <form action={formAction}>
        {/* Hidden inputs for form submission */}
        <input type="hidden" name="title" value={formData.title} />
        <input type="hidden" name="type" value={formData.type} />
        <input
          type="hidden"
          name="date"
          value={formData.date ? formData.date.toISOString() : ""}
        />
        <input type="hidden" name="location" value={formData.location} />
        <input type="hidden" name="description" value={formData.description} />
        <input type="hidden" name="privacy" value={formData.privacy || "public"} />
        <input
          type="hidden"
          name="deadline"
          value={formData.date ? formData.date.toISOString() : ""}
        />

        {/* Address fields */}
        <input type="hidden" name="streetAddress" value={formData.streetAddress} />
        <input type="hidden" name="streetAddress2" value={formData.streetAddress2} />
        <input type="hidden" name="city" value={formData.city} />
        <input type="hidden" name="stateProvince" value={formData.stateProvince} />
        <input type="hidden" name="postalCode" value={formData.postalCode} />
        <input type="hidden" name="gpsLocation" value={formData.gpsLocation} />

        <div className="min-h-[320px] max-h-[50vh] overflow-y-auto pr-2">
          {renderStep()}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-center gap-4 pt-6 mt-6 border-t border-gray-100">
          <DialogClose asChild>
            <button
              type="button"
              className="px-8 py-2.5 text-sm font-medium text-red-500 border border-red-500 rounded-full hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              disabled={isPending}
            >
              Cancel
            </button>
          </DialogClose>

          {/* Skip button for Personalise step */}
          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleContinue}
              disabled={isPending}
              className="px-8 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Skip
            </button>
          )}

          {isLastStep ? (
            <button
              type="submit"
              disabled={isPending || !canContinue()}
              className="px-8 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-white hover:text-primary border border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] flex items-center justify-center"
            >
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                "Add Gifts"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              disabled={isPending || !canContinue()}
              className="px-8 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-white hover:text-primary border border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
