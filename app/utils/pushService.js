/**
 * Server-side Web Push sending utility.
 *
 * Uses the `web-push` package to send push notifications
 * to subscribed users via their stored push subscriptions.
 *
 * Required env vars:
 *   VAPID_PRIVATE_KEY
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_SUBJECT  (e.g. "mailto:hello@giftologi.com")
 */
import webpush from "web-push";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@giftologi.com";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[pushService] VAPID keys not configured — push disabled.");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
  return true;
}

/**
 * Send a push notification to a specific user.
 *
 * @param {object}  options
 * @param {object}  options.client       – Supabase service-role client
 * @param {string}  options.userId       – Target user id
 * @param {string}  options.title        – Notification title
 * @param {string}  options.body         – Notification body text
 * @param {string}  [options.url]        – Click-through URL
 * @param {string}  [options.icon]       – Icon URL
 * @param {string}  [options.tag]        – Notification tag for collapsing
 * @returns {Promise<{sent: number, failed: number, error: string|null}>}
 */
export async function sendPushToUser({
  client,
  userId,
  title,
  body,
  url,
  icon,
  tag,
}) {
  const result = { sent: 0, failed: 0, error: null };

  if (!ensureVapid()) {
    result.error = "VAPID not configured";
    return result;
  }

  if (!client || !userId) {
    result.error = "Missing client or userId";
    return result;
  }

  try {
    const { data: subscriptions, error: fetchError } = await client
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", userId);

    if (fetchError) {
      result.error = fetchError.message;
      return result;
    }

    if (!subscriptions?.length) return result;

    const payload = JSON.stringify({
      title: title || "Giftologi",
      body: body || "",
      url: url || "/",
      icon: icon || "/icons/icon-192x192.png",
      tag: tag || "giftologi",
    });

    const staleIds = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        };

        try {
          await webpush.sendNotification(pushSub, payload);
          result.sent++;
        } catch (err) {
          result.failed++;
          // 410 Gone or 404 = subscription expired → clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleIds.push(sub.id);
          } else {
            console.error(
              `[pushService] push failed for sub ${sub.id}:`,
              err.statusCode || err.message
            );
          }
        }
      })
    );

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      await client
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds)
        .then(({ error: delErr }) => {
          if (delErr) {
            console.error("[pushService] stale cleanup error:", delErr.message);
          }
        });
    }
  } catch (err) {
    result.error = err?.message || "Unexpected push error";
    console.error("[pushService] error:", err);
  }

  return result;
}

/**
 * Send a push notification to multiple users.
 *
 * @param {object}  options
 * @param {object}  options.client
 * @param {string[]} options.userIds
 * @param {string}  options.title
 * @param {string}  options.body
 * @param {string}  [options.url]
 * @param {string}  [options.icon]
 * @param {string}  [options.tag]
 * @returns {Promise<{sent: number, failed: number}>}
 */
export async function sendPushToUsers({
  client,
  userIds,
  title,
  body,
  url,
  icon,
  tag,
}) {
  const totals = { sent: 0, failed: 0 };

  if (!userIds?.length) return totals;

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      sendPushToUser({ client, userId, title, body, url, icon, tag })
    )
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      totals.sent += r.value.sent;
      totals.failed += r.value.failed;
    } else {
      totals.failed++;
    }
  }

  return totals;
}
