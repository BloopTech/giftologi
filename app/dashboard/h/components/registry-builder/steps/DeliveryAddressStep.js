"use client";
import { useState } from "react";
import { toast } from "sonner";
import FormInput from "../FormInput";
import FormCheckbox from "../FormCheckbox";
import { MapPin } from "lucide-react";

export default function DeliveryAddressStep({
  formData,
  updateFormData,
  errors = {},
  disabled = false,
}) {
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = (checked) => {
    updateFormData("useCurrentLocation", checked);

    if (!checked) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      updateFormData("useCurrentLocation", false);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        updateFormData("gpsLocation", mapLink);
        updateFormData("digitalAddress", "");
        setIsLocating(false);
      },
      () => {
        toast.error("Unable to access your location. Please enter it manually.");
        updateFormData("useCurrentLocation", false);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-5">
      <FormCheckbox
        label={"Use my current location"}
        name="useCurrentLocation"
        checked={formData.useCurrentLocation || false}
        onChange={handleUseCurrentLocation}
        disabled={disabled || isLocating}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-900">GPS Location</label>
        <FormInput
          name="gpsLocation"
          placeholder="Google Maps link or coordinates"
          value={formData.gpsLocation || ""}
          onChange={(e) => updateFormData("gpsLocation", e.target.value)}
          error={errors.gpsLocation}
          disabled={disabled || isLocating}
          icon={<MapPin className="w-5 h-5" />}
        />
      </div>

      <FormInput
        name="digitalAddress"
        placeholder="Digital address (optional)"
        value={formData.digitalAddress || ""}
        onChange={(e) => updateFormData("digitalAddress", e.target.value)}
        error={errors.digitalAddress}
        disabled={disabled || isLocating}
      />

      <div className="space-y-4">
        <label className="text-sm font-medium text-gray-900">Address</label>
        
        <FormInput
          name="streetAddress"
          placeholder="Street Address"
          value={formData.streetAddress || ""}
          onChange={(e) => updateFormData("streetAddress", e.target.value)}
          error={errors.streetAddress}
          disabled={disabled || isLocating}
        />

        <FormInput
          name="streetAddress2"
          placeholder="Street Address line 2"
          value={formData.streetAddress2 || ""}
          onChange={(e) => updateFormData("streetAddress2", e.target.value)}
          error={errors.streetAddress2}
          disabled={disabled || isLocating}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="city"
            placeholder="City"
            value={formData.city || ""}
            onChange={(e) => updateFormData("city", e.target.value)}
            error={errors.city}
            disabled={disabled || isLocating}
          />

          <FormInput
            name="stateProvince"
            placeholder="State/Province"
            value={formData.stateProvince || ""}
            onChange={(e) => updateFormData("stateProvince", e.target.value)}
            error={errors.stateProvince}
            disabled={disabled || isLocating}
          />
        </div>

        <FormInput
          name="postalCode"
          placeholder="Postal / Zip Code"
          value={formData.postalCode || ""}
          onChange={(e) => updateFormData("postalCode", e.target.value)}
          error={errors.postalCode}
          disabled={disabled || isLocating}
        />
      </div>
    </div>
  );
}
