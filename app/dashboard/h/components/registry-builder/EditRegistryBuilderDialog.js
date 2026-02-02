"use client";

import React, {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { DialogClose } from "../../../../components/Dialog";
import StepIndicator from "./StepIndicator";
import { DeliveryAddressStep, PrivacyStep } from "./steps";
import FormDatePicker from "./FormDatePicker";
import FormInput from "./FormInput";

const EDIT_STEPS = [
  { id: 1, label: "Event Details" },
  { id: 2, label: "Delivery Address" },
  { id: 3, label: "Privacy" },
];

const STEP_TITLES = {
  1: "Registry Builder",
  2: "Delivery Address",
  3: "Privacy",
};

const initialState = {
  message: "",
  errors: {
    location: [],
    date: [],
    privacy: [],
    street_address: [],
    street_address_2: [],
    city: [],
    state_province: [],
    postal_code: [],
    gps_location: [],
    digital_address: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

export default function EditRegistryBuilderDialog({
  onClose,
  action,
  registry,
  event,
  deliveryAddress,
  onSuccess,
}) {
  const [currentStep, setCurrentStep] = useState(1);

  const normalizedEvent = useMemo(() => {
    if (!event) return null;
    return Array.isArray(event) ? event[0] : event;
  }, [event]);

  const normalizedDelivery = useMemo(() => {
    if (!deliveryAddress) return null;
    return Array.isArray(deliveryAddress) ? deliveryAddress[0] : deliveryAddress;
  }, [deliveryAddress]);

  const [formData, setFormData] = useState({
    date: undefined,
    location: "",
    useCurrentLocation: false,
    gpsLocation: "",
    digitalAddress: "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    privacy: "public",
  });

  const [state, formAction, isPending] = useActionState(action, initialState);
  const successToastShownRef = useRef(false);
  const errorToastShownRef = useRef(false);

  useEffect(() => {
    if (isPending) {
      successToastShownRef.current = false;
      errorToastShownRef.current = false;
    }
  }, [isPending]);

  useEffect(() => {
    setFormData({
      date: normalizedEvent?.date ? new Date(normalizedEvent.date) : undefined,
      location: (normalizedEvent?.location || "").toString(),
      useCurrentLocation: false,
      gpsLocation: (normalizedDelivery?.gps_location || "").toString(),
      digitalAddress: (normalizedDelivery?.digital_address || "").toString(),
      streetAddress: (normalizedDelivery?.street_address || "").toString(),
      streetAddress2: (normalizedDelivery?.street_address_2 || "").toString(),
      city: (normalizedDelivery?.city || "").toString(),
      stateProvince: (normalizedDelivery?.state_province || "").toString(),
      postalCode: (normalizedDelivery?.postal_code || "").toString(),
      privacy: (normalizedEvent?.privacy || "public").toString().toLowerCase(),
    });
  }, [normalizedEvent, normalizedDelivery]);

  useEffect(() => {
    const hasActualErrors =
      state?.message &&
      state?.errors &&
      Object.values(state.errors).some(
        (err) => Array.isArray(err) && err.length > 0,
      );

    if (hasActualErrors && !errorToastShownRef.current) {
      toast.error(state.message);
      errorToastShownRef.current = true;
    }

    if (state?.message && state?.status_code === 200 && !successToastShownRef.current) {
      toast.success(state.message);
      successToastShownRef.current = true;
      onSuccess?.(state);
      onClose?.();
    }
  }, [state, onClose, onSuccess]);

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleContinue = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return formData.location && formData.date;
      case 2:
        return formData.streetAddress && formData.city && formData.stateProvince;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const errors = state?.errors || {};

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      errors,
      disabled: isPending,
    };

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <FormDatePicker
              label="Date"
              name="date"
              placeholder="DD/MM/YYYY"
              value={formData.date}
              onChange={(date) => updateFormData("date", date)}
              disabledDays={{ before: new Date() }}
              error={errors.date}
              disabled={isPending}
              required
            />
            <FormInput
              label="Location"
              name="location"
              placeholder="Accra"
              value={formData.location || ""}
              onChange={(e) => updateFormData("location", e.target.value)}
              error={errors.location}
              disabled={isPending}
              required
            />
          </div>
        );
      case 2:
        return <DeliveryAddressStep {...stepProps} />;
      case 3:
        return <PrivacyStep {...stepProps} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === 3;

  return (
    <div className="flex flex-col">
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

      <div className="mb-8">
        <StepIndicator currentStep={currentStep} steps={EDIT_STEPS} />
      </div>

      <form action={formAction}>
        <input type="hidden" name="registry_id" value={registry?.id || ""} />
        <input type="hidden" name="event_id" value={normalizedEvent?.id || ""} />
        <input type="hidden" name="location" value={formData.location || ""} />
        <input
          type="hidden"
          name="date"
          value={formData.date ? formData.date.toISOString() : ""}
        />
        <input type="hidden" name="privacy" value={formData.privacy || "public"} />

        <input
          type="hidden"
          name="street_address"
          value={formData.streetAddress || ""}
        />
        <input
          type="hidden"
          name="street_address_2"
          value={formData.streetAddress2 || ""}
        />
        <input type="hidden" name="city" value={formData.city || ""} />
        <input
          type="hidden"
          name="state_province"
          value={formData.stateProvince || ""}
        />
        <input
          type="hidden"
          name="postal_code"
          value={formData.postalCode || ""}
        />
        <input
          type="hidden"
          name="gps_location"
          value={formData.gpsLocation || ""}
        />
        <input
          type="hidden"
          name="digital_address"
          value={formData.digitalAddress || ""}
        />

        <div className="min-h-[320px] max-h-[50vh] overflow-y-auto pr-2">
          {renderStep()}
        </div>

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

          {isLastStep ? (
            <button
              type="submit"
              disabled={isPending || !canContinue()}
              className="px-8 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-white hover:text-primary border border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] flex items-center justify-center"
            >
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
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
