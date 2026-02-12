"use client";

import React, { useState, useEffect, useActionState, useCallback } from "react";
import { PiBell, PiFloppyDisk } from "react-icons/pi";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { saveNotificationPreferences } from "./action";

const defaultNotifications = {
  newOrders: true,
  orderUpdates: true,
  payoutAlerts: true,
  lowStockAlerts: true,
  productReviews: true,
  weeklyReports: true,
  monthlyReports: true,
  marketingEmails: false,
  pushNotifications: false,
};

const DB_TO_UI_MAP = {
  new_orders: "newOrders",
  order_updates: "orderUpdates",
  payout_alerts: "payoutAlerts",
  low_stock_alerts: "lowStockAlerts",
  product_reviews: "productReviews",
  weekly_reports: "weeklyReports",
  monthly_reports: "monthlyReports",
  marketing_emails: "marketingEmails",
  push_notifications: "pushNotifications",
};

const UI_TO_DB_MAP = Object.fromEntries(
  Object.entries(DB_TO_UI_MAP).map(([k, v]) => [v, k]),
);

function NotificationToggle({ title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#111827]">{title}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
          enabled ? "bg-[#111827]" : "bg-[#D1D5DB]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function VendorSettingsContent() {
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);

  const [state, formAction, isPending] = useActionState(
    saveNotificationPreferences,
    { success: false, message: "", errors: {} },
  );

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("profiles_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!vendor?.id) return;
      setVendorId(vendor.id);

      const { data: prefs } = await supabase
        .from("vendor_notification_preferences")
        .select(
          "id, new_orders, order_updates, payout_alerts, low_stock_alerts, product_reviews, weekly_reports, monthly_reports, marketing_emails, push_notifications",
        )
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prefs) {
        const mapped = { ...defaultNotifications };
        for (const [dbKey, uiKey] of Object.entries(DB_TO_UI_MAP)) {
          if (typeof prefs[dbKey] === "boolean") {
            mapped[uiKey] = prefs[dbKey];
          }
        }
        setNotifications(mapped);
      }
    } catch (err) {
      console.error("Settings fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (state?.success) {
      fetchPreferences();
    }
  }, [state, fetchPreferences]);

  const handleChange = (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="h-8 w-48 rounded-lg bg-[#E5E7EB] animate-pulse" />
        <div className="h-64 w-full rounded-2xl bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 w-full mb-8">
      <div>
        <h1 className="text-lg font-semibold text-[#111827] font-brasley-medium">
          Settings
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage your notification preferences and account settings
        </p>
      </div>

      {state?.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
              : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
          }`}
        >
          {state.message}
        </div>
      )}

      <form action={formAction}>
        {Object.entries(UI_TO_DB_MAP).map(([uiKey, dbKey]) => (
          <input
            key={dbKey}
            type="hidden"
            name={dbKey}
            value={notifications[uiKey] ? "true" : "false"}
          />
        ))}

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-2 mb-1">
            <PiBell className="w-5 h-5 text-[#374151]" />
            <h2 className="text-base font-semibold text-[#111827] font-brasley-medium">
              Notification Preferences
            </h2>
          </div>
          <p className="text-[#6B7280] text-sm mb-4">
            Choose how you want to receive updates
          </p>

          <div className="space-y-1">
            <NotificationToggle
              title="New Orders"
              description="Get notified when you receive new orders"
              enabled={notifications.newOrders}
              onChange={(v) => handleChange("newOrders", v)}
            />
            <NotificationToggle
              title="Order Updates"
              description="Status changes and delivery confirmations"
              enabled={notifications.orderUpdates}
              onChange={(v) => handleChange("orderUpdates", v)}
            />
            <NotificationToggle
              title="Payout Alerts"
              description="Payment processing and completion notifications"
              enabled={notifications.payoutAlerts}
              onChange={(v) => handleChange("payoutAlerts", v)}
            />
            <NotificationToggle
              title="Low Stock Alerts"
              description="When products are running low on inventory"
              enabled={notifications.lowStockAlerts}
              onChange={(v) => handleChange("lowStockAlerts", v)}
            />
            <NotificationToggle
              title="Product Reviews"
              description="Customer reviews and ratings on your products"
              enabled={notifications.productReviews}
              onChange={(v) => handleChange("productReviews", v)}
            />
            <NotificationToggle
              title="Weekly Reports"
              description="Weekly summary of sales and performance"
              enabled={notifications.weeklyReports}
              onChange={(v) => handleChange("weeklyReports", v)}
            />
            <NotificationToggle
              title="Monthly Reports"
              description="Monthly analytics and insights"
              enabled={notifications.monthlyReports}
              onChange={(v) => handleChange("monthlyReports", v)}
            />
            <NotificationToggle
              title="Marketing Emails"
              description="Platform updates and promotional content"
              enabled={notifications.marketingEmails}
              onChange={(v) => handleChange("marketingEmails", v)}
            />
            <NotificationToggle
              title="Push Notifications"
              description="Receive browser push notifications for important updates"
              enabled={notifications.pushNotifications}
              onChange={(v) => handleChange("pushNotifications", v)}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={isPending}
            className="disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
          >
            <PiFloppyDisk className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}
