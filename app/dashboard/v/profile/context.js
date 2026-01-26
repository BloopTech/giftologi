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

const VendorProfileContext = createContext();

const defaultNotificationPreferences = {
  new_orders: true,
  order_updates: true,
  payout_alerts: true,
  low_stock_alerts: true,
  product_reviews: true,
  weekly_reports: true,
  monthly_reports: true,
  marketing_emails: false,
};

const createInitialState = () => ({
  profile: null,
  vendor: null,
  paymentInfo: null,
  notificationPreferences: null,
  documents: [],
  application: null,
  supportContact: null,
});

export const VendorProfileProvider = ({ children }) => {
  const [data, setData] = useState(createInitialState);
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
        { data: vendorRecord, error: vendorError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, firstname, lastname, email, phone")
          .eq("id", userId)
          .single(),
        supabase
          .from("vendors")
          .select(
            "id, business_name, legal_name, business_type, business_registration_number, description, email, phone, website, tax_id, address_street, address_city, address_state, digital_address, address_country, logo_url, verified, created_at, updated_at",
          )
          .eq("profiles_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileError) throw profileError;
      if (vendorError && vendorError.code !== "PGRST116") throw vendorError;

      const hasVendor = Boolean(vendorRecord?.id);
      const emptyResult = { data: null, error: null };

      const [
        { data: paymentInfoData, error: paymentInfoError },
        { data: notificationData, error: notificationError },
        { data: applicationData, error: applicationError },
        { data: contactSettings, error: contactError },
      ] = await Promise.all([
        hasVendor
          ? supabase
              .from("payment_info")
              .select(
                "id, vendor_id, bank_name, bank_account_masked, bank_account_last4, bank_branch, momo_number, momo_network, account_name, account_type, routing_number",
              )
              .eq("vendor_id", vendorRecord.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve(emptyResult),
        hasVendor
          ? supabase
              .from("vendor_notification_preferences")
              .select(
                "id, vendor_id, new_orders, order_updates, payout_alerts, low_stock_alerts, product_reviews, weekly_reports, monthly_reports, marketing_emails",
              )
              .eq("vendor_id", vendorRecord.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve(emptyResult),
        supabase
          .from("vendor_applications")
          .select(
            "id, documents, created_at, business_name, business_type, business_registration_number, tax_id, website, business_description, street_address, city, region, digital_address, bank_account_name, bank_name, bank_account_number, bank_branch, bank_branch_code, owner_email, owner_phone, status, draft_data",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("content_contact_settings")
          .select("support_email, support_phone, whatsapp_link")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (paymentInfoError) throw paymentInfoError;
      if (notificationError) throw notificationError;
      if (applicationError) throw applicationError;
      if (contactError) {
        console.error("Contact settings fetch error", contactError);
      }

      const documents = Array.isArray(applicationData?.documents)
        ? applicationData.documents
        : [];

      setData({
        profile: profileData || null,
        vendor: vendorRecord || null,
        paymentInfo: paymentInfoData || null,
        notificationPreferences: notificationData || defaultNotificationPreferences,
        documents,
        application: applicationData || null,
        supportContact: contactSettings || null,
      });

      if (!hasVendor && !applicationData?.id) {
        setError("Vendor profile not found.");
      }
    } catch (err) {
      console.error("Vendor profile fetch error", err);
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
      vendor: data.vendor,
      paymentInfo: data.paymentInfo,
      notificationPreferences: data.notificationPreferences,
      documents: data.documents,
      application: data.application,
      supportContact: data.supportContact,
      loading,
      error,
      refreshData: fetchProfileData,
    }),
    [data, loading, error, fetchProfileData],
  );

  return (
    <VendorProfileContext.Provider value={value}>
      {children}
    </VendorProfileContext.Provider>
  );
};

export const useVendorProfileContext = () =>
  useContext(VendorProfileContext);