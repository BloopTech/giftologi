"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import FormInput from "../FormInput";
import FormCheckbox from "../FormCheckbox";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";

export default function DeliveryAddressStep({
  formData,
  updateFormData,
  errors = {},
  disabled = false,
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [shippingRegions, setShippingRegions] = useState([]);
  const [zonesState, setZonesState] = useState({ loading: false, error: null });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [availableCities, setAvailableCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(null);

  const fieldErrors = useMemo(
    () => ({
      streetAddress: errors.streetAddress || errors.street_address,
      streetAddress2: errors.streetAddress2 || errors.street_address_2,
      city: errors.city,
      stateProvince: errors.stateProvince || errors.state_province,
      postalCode: errors.postalCode || errors.postal_code,
      gpsLocation: errors.gpsLocation || errors.gps_location,
      digitalAddress: errors.digitalAddress || errors.digital_address,
    }),
    [errors],
  );

  const renderError = (error) => {
    if (!error) return null;
    const messages = Array.isArray(error) ? error : [error];
    return (
      <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
        {messages.map((message, index) => (
          <li key={`${message}-${index}`}>{message}</li>
        ))}
      </ul>
    );
  };

  const hasStateProvinceError = Boolean(fieldErrors.stateProvince) && !selectedRegion?.name;
  const hasCityError = Boolean(fieldErrors.city) && !String(formData.city || "").trim();

  useEffect(() => {
    let cancelled = false;
    const loadZones = async () => {
      setZonesState({ loading: true, error: null });
      try {
        const response = await fetch("/api/shipping/aramex/zones?country=GH");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.details || payload?.error || "Failed to load regions.");
        }
        if (cancelled) return;
        setShippingRegions(Array.isArray(payload?.zones) ? payload.zones : []);
        setZonesState({ loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setShippingRegions([]);
        setZonesState({
          loading: false,
          error: error?.message || "Failed to load regions.",
        });
      }
    };

    loadZones();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shippingRegions.length) {
      setSelectedRegion(null);
      return;
    }

    const stateValue = String(formData.stateProvince || "").trim().toLowerCase();
    if (!stateValue) {
      setSelectedRegion(null);
      return;
    }

    const match = shippingRegions.find((region) => {
      const regionName = String(region?.name || "").trim().toLowerCase();
      const regionCode = String(region?.aramex_code || "").trim().toLowerCase();
      return stateValue === regionName || stateValue === regionCode;
    });

    if (!match) {
      setSelectedRegion(null);
      updateFormData("stateProvince", "");
      if (formData.city) updateFormData("city", "");
      setAvailableCities([]);
      return;
    }

    setSelectedRegion(match);
    if (formData.stateProvince !== match.name) {
      updateFormData("stateProvince", match.name);
    }
  }, [shippingRegions, formData.stateProvince, updateFormData]);

  useEffect(() => {
    if (!selectedRegion?.name) {
      setAvailableCities([]);
      setCitiesError(null);
      return;
    }

    let cancelled = false;
    const loadCities = async () => {
      setCitiesLoading(true);
      setCitiesError(null);
      try {
        const stateCode = selectedRegion.aramex_code || selectedRegion.name || "";
        const response = await fetch(
          `/api/shipping/cities?country=GH&stateCode=${encodeURIComponent(stateCode)}`,
        );
        const payload = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.details || payload?.error || "Failed to load cities.");
        }

        const cities = Array.isArray(payload?.cities) ? payload.cities : [];
        setAvailableCities(cities);

        const currentCity = String(formData.city || "").trim();
        if (currentCity && !cities.includes(currentCity)) {
          updateFormData("city", "");
        }
      } catch (error) {
        if (cancelled) return;
        setAvailableCities([]);
        setCitiesError(error?.message || "Failed to load cities.");
        if (formData.city) updateFormData("city", "");
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [
    selectedRegion?.id,
    selectedRegion?.aramex_code,
    selectedRegion?.name,
    updateFormData,
  ]);

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
          error={fieldErrors.gpsLocation}
          disabled={disabled || isLocating}
          icon={<MapPin className="w-5 h-5" />}
        />
      </div>

      <FormInput
        name="digitalAddress"
        placeholder="Digital address (optional)"
        value={formData.digitalAddress || ""}
        onChange={(e) => updateFormData("digitalAddress", e.target.value)}
        error={fieldErrors.digitalAddress}
        disabled={disabled || isLocating}
      />

      <div className="space-y-4">
        <label className="text-sm font-medium text-gray-900">Address</label>
        
        <FormInput
          label="Street Address"
          name="streetAddress"
          placeholder="Street Address"
          value={formData.streetAddress || ""}
          onChange={(e) => updateFormData("streetAddress", e.target.value)}
          error={fieldErrors.streetAddress}
          required
          disabled={disabled || isLocating}
        />

        <FormInput
          name="streetAddress2"
          placeholder="Street Address line 2"
          value={formData.streetAddress2 || ""}
          onChange={(e) => updateFormData("streetAddress2", e.target.value)}
          error={fieldErrors.streetAddress2}
          disabled={disabled || isLocating}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="stateProvince" className="text-sm font-medium text-gray-900">
                Region/State <span className="text-red-600">*</span>
              </label>
            </div>
            <Select
              value={selectedRegion?.id ? String(selectedRegion.id) : ""}
              onValueChange={(value) => {
                const region = shippingRegions.find((item) => String(item.id) === value);
                setSelectedRegion(region || null);
                updateFormData("stateProvince", region?.name || "");
                updateFormData("city", "");
                setAvailableCities([]);
                setCitiesError(null);
              }}
              disabled={
                disabled ||
                isLocating ||
                zonesState.loading ||
                shippingRegions.length === 0
              }
            >
              <SelectTrigger
                className="w-full"
                hasError={hasStateProvinceError}
              >
                <SelectValue
                  placeholder={
                    zonesState.loading
                      ? "Loading regions..."
                      : shippingRegions.length === 0
                        ? "No regions available"
                        : "Select region"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {shippingRegions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No regions available</div>
                ) : (
                  shippingRegions.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {zonesState.error && !fieldErrors.stateProvince && (
              <p className="text-xs text-red-600">{zonesState.error}</p>
            )}
            {hasStateProvinceError ? renderError(fieldErrors.stateProvince) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="city" className="text-sm font-medium text-gray-900">
                City <span className="text-red-600">*</span>
              </label>
            </div>
            <Select
              value={formData.city || ""}
              onValueChange={(value) => updateFormData("city", value)}
              disabled={
                disabled ||
                isLocating ||
                !selectedRegion ||
                citiesLoading ||
                availableCities.length === 0
              }
            >
              <SelectTrigger className="w-full" hasError={hasCityError}>
                <SelectValue
                  placeholder={
                    citiesLoading
                      ? "Loading cities..."
                      : !selectedRegion
                        ? "Select region first"
                        : availableCities.length === 0
                          ? "No cities available"
                          : "Select city"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableCities.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No cities available</div>
                ) : (
                  availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {citiesError && !fieldErrors.city && (
              <p className="text-xs text-red-600">{citiesError}</p>
            )}
            {hasCityError ? renderError(fieldErrors.city) : null}
          </div>
        </div>

        <FormInput
          name="postalCode"
          placeholder="Postal / Zip Code"
          value={formData.postalCode || ""}
          onChange={(e) => updateFormData("postalCode", e.target.value)}
          error={fieldErrors.postalCode}
          disabled={disabled || isLocating}
        />
      </div>
    </div>
  );
}
