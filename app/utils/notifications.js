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
