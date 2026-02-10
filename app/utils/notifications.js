export const buildNotificationPayload = ({
  userId,
  type,
  message,
  link,
  data,
  createdAt,
}) => {
  if (!userId || !type || !message) return null;
  const timestamp = createdAt || new Date().toISOString();
  return {
    user_id: userId,
    type,
    message,
    link: link || null,
    data: data ?? null,
    read: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

export const createNotification = async ({
  client,
  userId,
  type,
  message,
  link,
  data,
  createdAt,
}) => {
  const payload = buildNotificationPayload({
    userId,
    type,
    message,
    link,
    data,
    createdAt,
  });
  if (!client || !payload) return { data: null, error: null };
  return client.from("notifications").insert(payload);
};

export const createNotifications = async ({
  client,
  userIds,
  type,
  message,
  link,
  data,
  createdAt,
}) => {
  if (!client || !Array.isArray(userIds)) {
    return { data: null, error: null };
  }
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return { data: null, error: null };
  const timestamp = createdAt || new Date().toISOString();
  const payloads = uniqueIds
    .map((userId) =>
      buildNotificationPayload({
        userId,
        type,
        message,
        link,
        data,
        createdAt: timestamp,
      })
    )
    .filter(Boolean);

  if (!payloads.length) return { data: null, error: null };
  return client.from("notifications").insert(payloads);
};

export const fetchUserIdsByRole = async ({ client, roles }) => {
  if (!client || !Array.isArray(roles) || !roles.length) {
    return { data: [], error: null };
  }
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .in("role", roles);
  if (error) return { data: [], error };
  return {
    data: Array.isArray(data) ? data.map((row) => row.id).filter(Boolean) : [],
    error: null,
  };
};

export const fetchVendorNotificationPreferences = async ({
  client,
  vendorId,
}) => {
  const defaults = {
    new_orders: true,
    order_updates: true,
    payout_alerts: true,
    low_stock_alerts: true,
    product_reviews: true,
    weekly_reports: true,
    monthly_reports: true,
    marketing_emails: false,
  };

  if (!client || !vendorId) {
    return { data: defaults, error: null };
  }

  const { data, error } = await client
    .from("vendor_notification_preferences")
    .select(
      "new_orders, order_updates, payout_alerts, low_stock_alerts, product_reviews, weekly_reports, monthly_reports, marketing_emails"
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: defaults, error };

  return {
    data: {
      ...defaults,
      ...(data || {}),
    },
    error: null,
  };
};

export const fetchHostNotificationPreferences = async ({
  client,
  userId,
}) => {
  const defaults = {
    registry_updates: true,
    purchase_alerts: true,
    delivery_updates: true,
    event_reminders: true,
    thank_you_reminders: true,
    weekly_summary: false,
    marketing_emails: false,
  };

  if (!client || !userId) {
    return { data: defaults, error: null };
  }

  const { data, error } = await client
    .from("host_notification_preferences")
    .select(
      "registry_updates, purchase_alerts, delivery_updates, event_reminders, thank_you_reminders, weekly_summary, marketing_emails"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { data: defaults, error };

  return {
    data: {
      ...defaults,
      ...(data || {}),
    },
    error: null,
  };
};

// Maps notification event types → preference key for each role.
// If a mapping returns null, the notification is always sent (no preference gate).
export const VENDOR_EVENT_PREFERENCE_MAP = {
  new_order: "new_orders",
  order_status: "order_updates",
  order_update: "order_updates",
  payout_status: "payout_alerts",
  payout_update: "payout_alerts",
  low_stock: "low_stock_alerts",
  product_review: "product_reviews",
  weekly_report: "weekly_reports",
  monthly_report: "monthly_reports",
  marketing: "marketing_emails",
  vendor_application_status: null,
};

export const HOST_EVENT_PREFERENCE_MAP = {
  registry_purchase: "purchase_alerts",
  registry_contribution: "purchase_alerts",
  registry_update: "registry_updates",
  registry_item_added: "registry_updates",
  order_status: "delivery_updates",
  delivery_update: "delivery_updates",
  event_reminder: "event_reminders",
  thank_you_reminder: "thank_you_reminders",
  weekly_summary: "weekly_summary",
  marketing: "marketing_emails",
};

// Admin and guest notifications are always delivered (no preference gating).
export const ADMIN_EVENT_PREFERENCE_MAP = {};
export const GUEST_EVENT_PREFERENCE_MAP = {};

export const shouldNotify = ({ preferences, eventType, role }) => {
  if (!role || !eventType) return true;

  let map;
  if (role === "vendor") map = VENDOR_EVENT_PREFERENCE_MAP;
  else if (role === "host") map = HOST_EVENT_PREFERENCE_MAP;
  else return true; // admin, guest → always notify

  const prefKey = map[eventType];
  if (prefKey === undefined || prefKey === null) return true;
  if (!preferences) return true;

  return Boolean(preferences[prefKey]);
};
