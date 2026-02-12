"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const HostProfileContentContext = createContext();

const defaultNotificationPreferences = {
  registry_updates: true,
  purchase_alerts: true,
  delivery_updates: true,
  event_reminders: true,
  thank_you_reminders: true,
  weekly_summary: false,
  marketing_emails: false,
  push_notifications: false,
};

const createInitialState = () => ({
  profile: null,
  notificationPreferences: null,
  registriesSummary: null,
  supportContact: null,
});

export function HostProfileContentProvider({ children }) {
  const [data, setData] = useState(createInitialState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseClient();

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userResult?.user?.id;
      if (!userId) {
        setData(createInitialState());
        setError("You must be signed in to view your profile.");
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: notificationData, error: notificationError },
        { data: registriesData, error: registriesError },
        { data: contactSettings, error: contactError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, firstname, lastname, email, phone, image, address, address_street, address_city, address_state, digital_address, bio, role, created_at, updated_at"
          )
          .eq("id", userId)
          .single(),
        supabase
          .from("host_notification_preferences")
          .select(
            "id, user_id, registry_updates, purchase_alerts, delivery_updates, event_reminders, thank_you_reminders, weekly_summary, marketing_emails, push_notifications"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("events")
          .select("id, registries(id)")
          .eq("host_id", userId),
        supabase
          .from("content_contact_settings")
          .select("support_email, support_phone, whatsapp_link")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileError) throw profileError;
      if (notificationError) {
        console.error("Notification preferences fetch error", notificationError);
      }
      if (registriesError) {
        console.error("Registries summary fetch error", JSON.stringify(registriesError, null, 2));
      }
      if (contactError) {
        console.error("Contact settings fetch error", contactError);
      }

      const events = Array.isArray(registriesData) ? registriesData : [];
      const totalEvents = events.length;
      const totalRegistries = events.reduce(
        (sum, event) =>
          sum + (Array.isArray(event?.registries) ? event.registries.length : 0),
        0
      );

      setData({
        profile: profileData || null,
        notificationPreferences:
          notificationData || defaultNotificationPreferences,
        registriesSummary: { totalEvents, totalRegistries },
        supportContact: contactSettings || null,
      });
    } catch (err) {
      console.error("Host profile fetch error", err);
      setError(err?.message || "Failed to load profile data");
      setData(createInitialState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const value = useMemo(
    () => ({
      profile: data.profile,
      notificationPreferences: data.notificationPreferences,
      registriesSummary: data.registriesSummary,
      supportContact: data.supportContact,
      loading,
      error,
      refreshData: fetchProfileData,
    }),
    [data, loading, error, fetchProfileData]
  );

  return (
    <HostProfileContentContext.Provider value={value}>
      {children}
    </HostProfileContentContext.Provider>
  );
}

export function useHostProfileContentContext() {
  return useContext(HostProfileContentContext);
}
