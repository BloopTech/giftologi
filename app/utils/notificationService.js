import {
  buildNotificationPayload,
  fetchHostNotificationPreferences,
  fetchVendorNotificationPreferences,
  fetchUserIdsByRole,
  shouldNotify,
} from "./notifications";
import { sendPushToUser, sendPushToUsers } from "./pushService";

/**
 * Centralized notification dispatch.
 *
 * Handles preference-gating, in-app notification creation, and email queuing
 * for all roles (host, vendor, admin, guest).
 *
 * @param {object}  options
 * @param {object}  options.client        – Supabase admin/service client
 * @param {string}  options.recipientId   – Target user's profile id
 * @param {string}  options.recipientRole – "host" | "vendor" | "admin" | "guest"
 * @param {string}  options.eventType     – e.g. "new_order", "registry_purchase"
 * @param {string}  options.message       – Human-readable notification text
 * @param {string}  [options.link]        – Optional in-app link
 * @param {object}  [options.data]        – Optional JSON metadata
 * @param {string}  [options.vendorId]    – Required when recipientRole is "vendor"
 * @param {object}  [options.emailPayload]– If provided, queues an email
 *   @param {string}  emailPayload.templateSlug – content_email_templates.slug
 *   @param {string}  emailPayload.to           – Recipient email address
 *   @param {object}  [emailPayload.variables]  – Template variable interpolation
 * @param {object}  [options.pushPayload] – If provided, sends a web push
 *   @param {string}  pushPayload.title
 *   @param {string}  pushPayload.body
 *   @param {string}  [pushPayload.url]
 * @returns {Promise<{notified: boolean, emailQueued: boolean, pushSent: boolean, error: string|null}>}
 */
export async function dispatchNotification({
  client,
  recipientId,
  recipientRole,
  eventType,
  message,
  link,
  data,
  vendorId,
  emailPayload,
  pushPayload,
}) {
  const result = { notified: false, emailQueued: false, pushSent: false, error: null };

  if (!client || !recipientId || !eventType || !message) {
    result.error = "Missing required fields for notification dispatch.";
    return result;
  }

  try {
    // 1. Fetch preferences based on role
    let preferences = null;

    if (recipientRole === "vendor" && vendorId) {
      const { data: prefs } = await fetchVendorNotificationPreferences({
        client,
        vendorId,
      });
      preferences = prefs;
    } else if (recipientRole === "host") {
      const { data: prefs } = await fetchHostNotificationPreferences({
        client,
        userId: recipientId,
      });
      preferences = prefs;
    }
    // admin & guest → no preferences, always notify

    // 2. Check if in-app notification should be sent
    const shouldSendInApp = shouldNotify({
      preferences,
      eventType,
      role: recipientRole,
    });

    if (shouldSendInApp) {
      const payload = buildNotificationPayload({
        userId: recipientId,
        type: eventType,
        message,
        link,
        data,
      });

      if (payload) {
        const { error: insertError } = await client
          .from("notifications")
          .insert(payload);

        if (insertError) {
          console.error(
            `[notificationService] in-app insert failed for ${recipientId}:`,
            insertError.message
          );
        } else {
          result.notified = true;
        }
      }
    }

    // 3. Queue email if payload provided and preference allows
    if (emailPayload?.templateSlug && emailPayload?.to) {
      // Email preference uses the same gate as in-app
      const shouldSendEmail = shouldNotify({
        preferences,
        eventType,
        role: recipientRole,
      });

      if (shouldSendEmail) {
        const { error: queueError } = await client
          .from("notification_email_queue")
          .insert({
            recipient_id: recipientId,
            recipient_email: emailPayload.to,
            template_slug: emailPayload.templateSlug,
            variables: emailPayload.variables || {},
            status: "pending",
          });

        if (queueError) {
          console.error(
            `[notificationService] email queue failed for ${recipientId}:`,
            queueError.message
          );
        } else {
          result.emailQueued = true;
        }
      }
    }

    // 4. Send push notification if payload provided and preferences allow
    if (pushPayload?.title || pushPayload?.body) {
      const shouldSendPush =
        preferences?.push_notifications !== false &&
        shouldNotify({ preferences, eventType, role: recipientRole });

      if (shouldSendPush) {
        try {
          const pushResult = await sendPushToUser({
            client,
            userId: recipientId,
            title: pushPayload.title || message,
            body: pushPayload.body || message,
            url: pushPayload.url || link || "/",
          });
          if (pushResult.sent > 0) {
            result.pushSent = true;
          }
        } catch (pushErr) {
          console.error(
            `[notificationService] push failed for ${recipientId}:`,
            pushErr?.message
          );
        }
      }
    }
  } catch (err) {
    result.error = err?.message || "Unexpected error in dispatchNotification";
    console.error("[notificationService] dispatch error:", err);
  }

  return result;
}

/**
 * Dispatch the same notification to multiple users (e.g. all admins).
 *
 * @param {object}  options
 * @param {object}  options.client
 * @param {string[]} options.recipientIds
 * @param {string}  options.recipientRole
 * @param {string}  options.eventType
 * @param {string}  options.message
 * @param {string}  [options.link]
 * @param {object}  [options.data]
 * @returns {Promise<{notifiedCount: number, error: string|null}>}
 */
export async function dispatchNotificationBulk({
  client,
  recipientIds,
  recipientRole,
  eventType,
  message,
  link,
  data,
}) {
  const result = { notifiedCount: 0, error: null };

  if (!client || !Array.isArray(recipientIds) || !recipientIds.length) {
    return result;
  }

  const uniqueIds = Array.from(new Set(recipientIds.filter(Boolean)));
  if (!uniqueIds.length) return result;

  const timestamp = new Date().toISOString();
  const payloads = uniqueIds
    .map((userId) =>
      buildNotificationPayload({
        userId,
        type: eventType,
        message,
        link,
        data,
        createdAt: timestamp,
      })
    )
    .filter(Boolean);

  if (!payloads.length) return result;

  try {
    const { error: insertError } = await client
      .from("notifications")
      .insert(payloads);

    if (insertError) {
      result.error = insertError.message;
      console.error(
        "[notificationService] bulk insert failed:",
        insertError.message
      );
    } else {
      result.notifiedCount = payloads.length;
    }
  } catch (err) {
    result.error = err?.message || "Unexpected error in dispatchNotificationBulk";
    console.error("[notificationService] bulk error:", err);
  }

  return result;
}

/**
 * Convenience: dispatch a notification to all admin users.
 */
export async function dispatchToAdmins({
  client,
  eventType,
  message,
  link,
  data,
}) {
  const { data: adminIds } = await fetchUserIdsByRole({
    client,
    roles: [
      "super_admin",
      "finance_admin",
      "operations_manager_admin",
      "customer_support_admin",
    ],
  });

  if (!adminIds?.length) return { notifiedCount: 0, pushSent: 0, error: null };

  const bulkResult = await dispatchNotificationBulk({
    client,
    recipientIds: adminIds,
    recipientRole: "admin",
    eventType,
    message,
    link,
    data,
  });

  // Also send push to admins
  try {
    const pushResult = await sendPushToUsers({
      client,
      userIds: adminIds,
      title: "Giftologi Admin",
      body: message,
      url: link || "/dashboard/admin",
    });
    bulkResult.pushSent = pushResult.sent;
  } catch (pushErr) {
    console.error("[notificationService] admin push error:", pushErr?.message);
  }

  return bulkResult;
}
