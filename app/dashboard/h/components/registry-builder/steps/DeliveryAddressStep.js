"use client";
import FormInput from "../FormInput";
import FormCheckbox from "../FormCheckbox";
import { MapPin } from "lucide-react";

export default function DeliveryAddressStep({
  formData,
  updateFormData,
  errors = {},
  disabled = false,
}) {
  return (
    <div className="space-y-5">
      <FormCheckbox
        label="Use my current location"
        name="useCurrentLocation"
        checked={formData.useCurrentLocation || false}
        onChange={(checked) => updateFormData("useCurrentLocation", checked)}
        disabled={disabled}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-900">GPS Location</label>
        <FormInput
          name="gpsLocation"
          placeholder="Location Link"
          value={formData.gpsLocation || ""}
          onChange={(e) => updateFormData("gpsLocation", e.target.value)}
          error={errors.gpsLocation}
          disabled={disabled}
          icon={<MapPin className="w-5 h-5" />}
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium text-gray-900">Address</label>
        
        <FormInput
          name="streetAddress"
          placeholder="Street Address"
          value={formData.streetAddress || ""}
          onChange={(e) => updateFormData("streetAddress", e.target.value)}
          error={errors.streetAddress}
          disabled={disabled}
        />

        <FormInput
          name="streetAddress2"
          placeholder="Street Address line 2"
          value={formData.streetAddress2 || ""}
          onChange={(e) => updateFormData("streetAddress2", e.target.value)}
          error={errors.streetAddress2}
          disabled={disabled}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="city"
            placeholder="City"
            value={formData.city || ""}
            onChange={(e) => updateFormData("city", e.target.value)}
            error={errors.city}
            disabled={disabled}
          />

          <FormInput
            name="stateProvince"
            placeholder="State/Province"
            value={formData.stateProvince || ""}
            onChange={(e) => updateFormData("stateProvince", e.target.value)}
            error={errors.stateProvince}
            disabled={disabled}
          />
        </div>

        <FormInput
          name="postalCode"
          placeholder="Postal / Zip Code"
          value={formData.postalCode || ""}
          onChange={(e) => updateFormData("postalCode", e.target.value)}
          error={errors.postalCode}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
