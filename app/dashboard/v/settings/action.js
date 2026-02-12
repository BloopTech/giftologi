"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export async function saveNotificationPreferences(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in.",
      errors: {},
    };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id")
    .eq("profiles_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorError || !vendor) {
    return {
      success: false,
      message: "Vendor profile not found.",
      errors: {},
    };
  }

  const boolField = (key) => formData.get(key) === "true";

  const payload = {
    vendor_id: vendor.id,
    new_orders: boolField("new_orders"),
    order_updates: boolField("order_updates"),
    payout_alerts: boolField("payout_alerts"),
    low_stock_alerts: boolField("low_stock_alerts"),
    product_reviews: boolField("product_reviews"),
    weekly_reports: boolField("weekly_reports"),
    monthly_reports: boolField("monthly_reports"),
    marketing_emails: boolField("marketing_emails"),
    push_notifications: boolField("push_notifications"),
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("vendor_notification_preferences")
    .upsert(payload, { onConflict: "vendor_id" })
    .select("id")
    .single();

  if (upsertError) {
    return {
      success: false,
      message: upsertError.message || "Failed to save notification preferences.",
      errors: {},
    };
  }

  revalidatePath("/dashboard/v/settings");

  return {
    success: true,
    message: "Notification preferences saved.",
    errors: {},
  };
}
