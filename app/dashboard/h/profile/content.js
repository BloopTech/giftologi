"use client";
import React, {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import {
  PiUserCircle,
  PiPencilSimple,
  PiMapPin,
  PiBell,
  PiFloppyDisk,
  PiCalendarBlank,
  PiEnvelope,
  PiPhone,
} from "react-icons/pi";
import { toast } from "sonner";
import Image from "next/image";

import { useHostProfileContentContext } from "./context";
import { updateHostProfile, saveHostProfilePhoto } from "./action";
import {
  SectionHeader,
  FormField,
  TextAreaField,
  NotificationRow,
} from "../../v/profile/components/formControls";
import AccountDataSection from "../../../components/AccountDataSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";

const defaultNotificationSettings = {
  registryUpdates: true,
  purchaseAlerts: true,
  deliveryUpdates: true,
  eventReminders: true,
  thankYouReminders: true,
  weeklySummary: false,
  marketingEmails: false,
  pushNotifications: false,
};

const mapNotificationSettings = (preferences) => ({
  registryUpdates:
    preferences?.registry_updates ?? defaultNotificationSettings.registryUpdates,
  purchaseAlerts:
    preferences?.purchase_alerts ?? defaultNotificationSettings.purchaseAlerts,
  deliveryUpdates:
    preferences?.delivery_updates ?? defaultNotificationSettings.deliveryUpdates,
  eventReminders:
    preferences?.event_reminders ?? defaultNotificationSettings.eventReminders,
  thankYouReminders:
    preferences?.thank_you_reminders ??
    defaultNotificationSettings.thankYouReminders,
  weeklySummary:
    preferences?.weekly_summary ?? defaultNotificationSettings.weeklySummary,
  marketingEmails:
    preferences?.marketing_emails ?? defaultNotificationSettings.marketingEmails,
  pushNotifications:
    preferences?.push_notifications ?? defaultNotificationSettings.pushNotifications,
});

const formatMemberSince = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

const skeletonCardClass = "bg-white rounded-xl border border-[#E5E7EB] p-5";

const HostProfileSkeleton = () => (
  <section
    aria-label="Loading host profile"
    className="flex flex-col space-y-6 w-full mb-8 max-w-6xl mx-auto"
  >
    <div className={skeletonCardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-[#E5E7EB] animate-pulse" />
          <div className="space-y-2 pt-2">
            <div className="h-5 w-40 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-3 w-56 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-3 w-28 rounded bg-[#E5E7EB] animate-pulse" />
          </div>
        </div>
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-44 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`field-${idx}`} className="space-y-2">
            <div className="h-3 w-24 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-[#E5E7EB] animate-pulse" />
          </div>
        ))}
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-36 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`addr-${idx}`} className="space-y-2">
            <div className="h-3 w-24 rounded bg-[#E5E7EB] animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-[#E5E7EB] animate-pulse" />
          </div>
        ))}
      </div>
    </div>

    <div className={`${skeletonCardClass} space-y-4`}>
      <div className="h-4 w-52 rounded bg-[#E5E7EB] animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={`notif-${idx}`}
            className="h-10 w-full rounded-lg bg-[#E5E7EB] animate-pulse"
          />
        ))}
      </div>
    </div>
  </section>
);

export default function HostProfileContent() {
  const {
    profile,
    notificationPreferences,
    registriesSummary,
    loading,
    error,
    refreshData,
  } = useHostProfileContentContext();

  const [notifications, setNotifications] = useState(
    defaultNotificationSettings
  );
  const [state, formAction, isPending] = useActionState(updateHostProfile, {
    success: false,
    message: "",
    errors: {},
  });
  const [photoState, photoAction, isPhotoPending] = useActionState(
    saveHostProfilePhoto,
    { success: false, message: "", errors: {}, data: {} }
  );
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isPhotoSaved, setIsPhotoSaved] = useState(false);
  const [shippingRegions, setShippingRegions] = useState([]);
  const [zonesState, setZonesState] = useState({ loading: false, error: null });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [availableCities, setAvailableCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(null);
  const [addressValues, setAddressValues] = useState({ city: "", state: "" });

  useEffect(() => {
    setNotifications(mapNotificationSettings(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    setAddressValues({
      city: profile?.address_city || "",
      state: profile?.address_state || "",
    });
  }, [profile?.address_city, profile?.address_state]);

  useEffect(() => {
    let cancelled = false;
    const loadZones = async () => {
      setZonesState({ loading: true, error: null });
      try {
        const response = await fetch("/api/shipping/aramex/zones?country=GH");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.details || payload?.error || "Failed to load regions.",
          );
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

    const stateValue = String(addressValues.state || "").trim().toLowerCase();
    if (!stateValue) {
      setSelectedRegion(null);
      setAvailableCities([]);
      return;
    }

    const match = shippingRegions.find((region) => {
      const regionName = String(region?.name || "").trim().toLowerCase();
      const regionCode = String(region?.aramex_code || "").trim().toLowerCase();
      return stateValue === regionName || stateValue === regionCode;
    });

    if (!match) {
      setSelectedRegion(null);
      setAvailableCities([]);
      return;
    }

    setSelectedRegion(match);
    setAddressValues((prev) =>
      prev.state === match.name ? prev : { ...prev, state: match.name },
    );
  }, [shippingRegions, addressValues.state]);

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
          throw new Error(
            payload?.details || payload?.error || "Failed to load cities.",
          );
        }

        const cities = Array.isArray(payload?.cities) ? payload.cities : [];
        setAvailableCities(cities);
        setAddressValues((prev) =>
          prev.city && !cities.includes(prev.city) ? { ...prev, city: "" } : prev,
        );
      } catch (error) {
        if (cancelled) return;
        setAvailableCities([]);
        setCitiesError(error?.message || "Failed to load cities.");
        setAddressValues((prev) => (prev.city ? { ...prev, city: "" } : prev));
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion?.id, selectedRegion?.aramex_code, selectedRegion?.name]);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Profile updated.");
      refreshData?.();
    } else if (state?.message && !state?.success && state.message !== "") {
      toast.error(state.message);
    }
  }, [state, refreshData]);

  useEffect(() => {
    if (profile?.image) {
      setPhotoPreview(profile.image);
      setIsPhotoSaved(true);
    } else {
      setPhotoPreview(null);
      setIsPhotoSaved(false);
    }
  }, [profile?.image]);

  useEffect(() => {
    if (photoState?.success && photoState?.data?.image) {
      setPhotoPreview(photoState.data.image);
      setPhotoFile(null);
      setIsPhotoSaved(true);
      toast.success(photoState.message || "Photo saved.");
      refreshData?.();
    } else if (
      photoState?.message &&
      !photoState?.success &&
      photoState.message !== ""
    ) {
      toast.error(photoState.message);
    }
  }, [photoState, refreshData]);

  const photoInputRef = useRef(null);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setIsPhotoSaved(false);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePhotoSubmit = useCallback(() => {
    if (!photoFile) return;
    const formData = new FormData();
    formData.append("photo", photoFile);
    photoAction(formData);
  }, [photoFile, photoAction]);

  const handleNotificationChange = (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const canSavePhoto = Boolean(photoFile && !isPhotoSaved);

  const notificationFields = useMemo(
    () => ({
      registry_updates: notifications.registryUpdates,
      purchase_alerts: notifications.purchaseAlerts,
      delivery_updates: notifications.deliveryUpdates,
      event_reminders: notifications.eventReminders,
      thank_you_reminders: notifications.thankYouReminders,
      weekly_summary: notifications.weeklySummary,
      marketing_emails: notifications.marketingEmails,
      push_notifications: notifications.pushNotifications,
    }),
    [notifications]
  );

  const errors = state?.errors || {};

  const formKey = useMemo(
    () =>
      [profile?.id, profile?.updated_at, notificationPreferences?.id]
        .filter(Boolean)
        .join("-") || "host-profile",
    [profile, notificationPreferences]
  );

  if (loading) return <HostProfileSkeleton />;

  if (error && !profile) {
    return (
      <section className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[#B91C1C]">{error}</p>
        <button
          type="button"
          onClick={refreshData}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition-colors cursor-pointer"
        >
          Retry
        </button>
      </section>
    );
  }

  const fullName = [profile?.firstname, profile?.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <section
      aria-label="Host profile"
      className="dark:text-white bg-[#FAFAFA] mt-10 py-8 dark:bg-gray-950 mx-auto max-w-6xl w-full font-brasley-medium min-h-screen"
    >
      <div className="flex flex-col space-y-6 w-full mb-8 px-5 md:px-10">
        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-[#F3F4F6] flex items-center justify-center overflow-hidden border-2 border-[#E5E7EB]">
                  {photoPreview ? (
                    <ImageWithFallback
                      src={photoPreview}
                      alt="Profile photo"
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                      priority
                    />
                  ) : (
                    <PiUserCircle className="w-10 h-10 text-[#9CA3AF]" />
                  )}
                </div>
                <label
                  htmlFor="host_photo_file"
                  className="absolute bottom-0 right-0 p-1.5 bg-white border border-[#E5E7EB] rounded-full shadow-sm cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                >
                  <PiPencilSimple className="w-3.5 h-3.5 text-[#374151]" />
                </label>
              </div>
              <div className="flex flex-col pt-1">
                <h1 className="text-[#111827] text-lg font-semibold font-brasley-medium">
                  {fullName || "Your Profile"}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  {profile?.email && (
                    <span className="inline-flex items-center gap-1 text-[#6B7280] text-sm">
                      <PiEnvelope className="w-3.5 h-3.5" />
                      {profile.email}
                    </span>
                  )}
                  {profile?.phone && (
                    <span className="inline-flex items-center gap-1 text-[#6B7280] text-sm">
                      <PiPhone className="w-3.5 h-3.5" />
                      {profile.phone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EBF9E3] text-[#5CAE2D] text-xs font-medium rounded-full">
                    <PiCalendarBlank className="w-3 h-3" />
                    Member since {formatMemberSince(profile?.created_at)}
                  </span>
                  {registriesSummary && (
                    <span className="text-[#6B7280] text-xs">
                      {registriesSummary.totalRegistries} registr
                      {registriesSummary.totalRegistries === 1 ? "y" : "ies"} ·{" "}
                      {registriesSummary.totalEvents} event
                      {registriesSummary.totalEvents === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canSavePhoto && (
                <button
                  type="button"
                  onClick={handlePhotoSubmit}
                  disabled={isPhotoPending}
                  className="cursor-pointer inline-flex items-center gap-2 px-3 py-2.5 text-white text-sm font-medium bg-[#111827] rounded-lg hover:bg-[#1F2937] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPhotoPending ? "Saving..." : "Save Photo"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input (sr-only so label can trigger it) */}
        <input
          id="host_photo_file"
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="sr-only"
        />

        {/* Main profile form */}
        <form key={formKey} action={formAction}>
          {/* Hidden notification fields */}
          {Object.entries(notificationFields).map(([key, value]) => (
            <input
              key={key}
              type="hidden"
              name={key}
              value={String(value)}
            />
          ))}

          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <SectionHeader icon={PiUserCircle} title="Personal Information" />
            <p className="text-[#6B7280] text-sm mb-4">
              Manage your name, contact details, and bio
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                name="firstname"
                value={profile?.firstname}
                required
                error={errors.firstname}
              />
              <FormField
                label="Last Name"
                name="lastname"
                value={profile?.lastname}
                required
                error={errors.lastname}
              />
              <FormField
                label="Email Address"
                name="email_display"
                value={profile?.email}
                readOnly
                helperText="Email cannot be changed here"
              />
              <FormField
                label="Phone Number"
                name="phone"
                value={profile?.phone}
                error={errors.phone}
              />
            </div>
            <div className="mt-4">
              <TextAreaField
                label="Bio"
                name="bio"
                value={profile?.bio}
                placeholder="Tell us a little about yourself..."
                error={errors.bio}
                helperText="Visible to gift givers on your registries"
              />
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mt-6">
            <SectionHeader icon={PiMapPin} title="Default Address" />
            <p className="text-[#6B7280] text-sm mb-4">
              Your default delivery address for registries
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Street Address"
                name="address_street"
                value={profile?.address_street}
                error={errors.address_street}
                className="md:col-span-2"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">Region / State</label>
                <Select
                  value={selectedRegion?.name || ""}
                  onValueChange={(value) => {
                    const region = shippingRegions.find((item) => item.name === value);
                    setSelectedRegion(region || null);
                    setAddressValues((prev) => ({
                      ...prev,
                      state: region?.name || "",
                      city: "",
                    }));
                    setAvailableCities([]);
                    setCitiesError(null);
                  }}
                  disabled={zonesState.loading || shippingRegions.length === 0}
                >
                  <SelectTrigger
                    className="w-full"
                    hasError={Boolean(errors.address_state)}
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
                        <SelectItem key={region.name} value={region.name}>
                          {region.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {zonesState.error && !errors.address_state && (
                  <p className="text-xs text-red-600">{zonesState.error}</p>
                )}
                {errors.address_state && (
                  <p className="text-xs text-red-600">{errors.address_state}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">City</label>
                <Select
                  value={addressValues.city}
                  onValueChange={(value) => {
                    setAddressValues((prev) => ({ ...prev, city: value }));
                  }}
                  disabled={
                    !selectedRegion || citiesLoading || availableCities.length === 0
                  }
                >
                  <SelectTrigger className="w-full" hasError={Boolean(errors.address_city)}>
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
                {citiesError && !errors.address_city && (
                  <p className="text-xs text-red-600">{citiesError}</p>
                )}
                {errors.address_city && (
                  <p className="text-xs text-red-600">{errors.address_city}</p>
                )}
              </div>
              <input type="hidden" name="address_state" value={addressValues.state} />
              <input type="hidden" name="address_city" value={addressValues.city} />
              <FormField
                label="Digital Address (Ghana Post GPS)"
                name="digital_address"
                value={profile?.digital_address}
                error={errors.digital_address}
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mt-6">
            <SectionHeader icon={PiBell} title="Notification Preferences" />
            <p className="text-[#6B7280] text-sm mb-4">
              Choose how you want to receive updates about your registries
            </p>

            <div className="space-y-1">
              <NotificationRow
                title="Registry Updates"
                description="When items are added or registry details change"
                enabled={notifications.registryUpdates}
                onChange={(v) => handleNotificationChange("registryUpdates", v)}
              />
              <NotificationRow
                title="Purchase Alerts"
                description="When someone purchases a gift from your registry"
                enabled={notifications.purchaseAlerts}
                onChange={(v) => handleNotificationChange("purchaseAlerts", v)}
              />
              <NotificationRow
                title="Delivery Updates"
                description="Shipping and delivery status for your gifts"
                enabled={notifications.deliveryUpdates}
                onChange={(v) => handleNotificationChange("deliveryUpdates", v)}
              />
              <NotificationRow
                title="Event Reminders"
                description="Reminders as your event date approaches"
                enabled={notifications.eventReminders}
                onChange={(v) => handleNotificationChange("eventReminders", v)}
              />
              <NotificationRow
                title="Thank-you Reminders"
                description="Reminders to send thank-you notes to gifters"
                enabled={notifications.thankYouReminders}
                onChange={(v) =>
                  handleNotificationChange("thankYouReminders", v)
                }
              />
              <NotificationRow
                title="Weekly Summary"
                description="Weekly digest of registry activity"
                enabled={notifications.weeklySummary}
                onChange={(v) => handleNotificationChange("weeklySummary", v)}
              />
              <NotificationRow
                title="Marketing Emails"
                description="Platform updates and promotional content"
                enabled={notifications.marketingEmails}
                onChange={(v) => handleNotificationChange("marketingEmails", v)}
              />
              <NotificationRow
                title="Push Notifications"
                description="Receive browser push notifications for important updates"
                enabled={notifications.pushNotifications}
                onChange={(v) => handleNotificationChange("pushNotifications", v)}
              />
            </div>
          </div>

          {/* Status + Save */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
            <div>
              {state?.message && (
                <p
                  className={`text-sm ${
                    state.success ? "text-[#15803D]" : "text-[#B91C1C]"
                  }`}
                >
                  {state.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium bg-[#111827] border border-[#111827] rounded-lg hover:bg-white hover:text-[#1F2937] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PiFloppyDisk className="w-4 h-4" />
              {isPending ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>

        {/* Data & Privacy (Export + Deletion) */}
        <AccountDataSection />
      </div>
    </section>
  );
}