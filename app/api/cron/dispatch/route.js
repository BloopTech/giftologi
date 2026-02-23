import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";
import { sendTemplatedEmail } from "../../../utils/emailService";
import { dispatchNotification } from "../../../utils/notificationService";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;

/**
 * Unified cron dispatcher — single Vercel invocation handles all scheduled tasks:
 *   1. Process email queue (flush pending emails via nodemailer)
 *   2. Create event reminders (7-day, 3-day, 1-day)
 *   3. Expire stale pending orders
 *
 * Protected by CRON_SECRET bearer token.
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const results = {};

    // ─── Task 1: Process email queue ──────────────────────────────────
    results.emails = await processEmailQueue(admin);

    // ─── Task 2: Event reminders ──────────────────────────────────────
    results.reminders = await createEventReminders(admin);

    // ─── Task 3: Expire stale pending orders ──────────────────────────
    results.expiredOrders = await expirePendingOrders(admin);

    // ─── Task 4: Reconcile pending ExpressPay payments ────────────────
    results.paymentReconciliation =
      await reconcilePendingExpressPayPayments(admin);

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("[cron/dispatch] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel cron (Vercel cron sends GET by default)
export async function GET(request) {
  return POST(request);
}

// ─── Email Queue Processor ───────────────────────────────────────────────────

async function processEmailQueue(admin) {
  const summary = { processed: 0, sent: 0, failed: 0 };

  try {
    const { data: pendingEmails, error: fetchError } = await admin
      .from("notification_email_queue")
      .select("id, recipient_email, template_slug, variables, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("[cron/dispatch] Email queue fetch error:", fetchError);
      return { ...summary, error: fetchError.message };
    }

    if (!pendingEmails?.length) return summary;

    for (const email of pendingEmails) {
      summary.processed++;
      const nowIso = new Date().toISOString();

      try {
        // Mark as processing
        await admin
          .from("notification_email_queue")
          .update({
            status: "processing",
            attempts: (email.attempts || 0) + 1,
            processed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", email.id);

        const result = await sendTemplatedEmail({
          client: admin,
          templateSlug: email.template_slug,
          to: email.recipient_email,
          variables: email.variables || {},
        });

        if (result.success) {
          await admin
            .from("notification_email_queue")
            .update({
              status: "sent",
              sent_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", email.id);
          summary.sent++;
        } else {
          const newAttempts = (email.attempts || 0) + 1;
          await admin
            .from("notification_email_queue")
            .update({
              status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
              last_error: result.error || "Unknown send failure",
              updated_at: nowIso,
            })
            .eq("id", email.id);
          summary.failed++;
        }
      } catch (err) {
        console.error(
          `[cron/dispatch] Email send error for ${email.id}:`,
          err?.message
        );
        await admin
          .from("notification_email_queue")
          .update({
            status:
              (email.attempts || 0) + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
            last_error: err?.message || "Exception during send",
            updated_at: nowIso,
          })
          .eq("id", email.id);
        summary.failed++;
      }
    }
  } catch (err) {
    console.error("[cron/dispatch] Email queue error:", err);
    summary.error = err?.message;
  }

  return summary;
}

async function reconcilePendingExpressPayPayments(admin) {
  const summary = {
    scanned: 0,
    attempted: 0,
    reconciled: 0,
    failed: 0,
  };

  try {
    const { data: pendingOrders, error: pendingError } = await admin
      .from("orders")
      .select("id, order_code, order_type, payment_token")
      .eq("status", "pending")
      .not("payment_token", "is", null)
      .order("created_at", { ascending: true })
      .limit(150);

    if (pendingError) {
      summary.error = pendingError.message;
      return summary;
    }

    const orders = Array.isArray(pendingOrders) ? pendingOrders : [];
    summary.scanned = orders.length;

    if (!orders.length) return summary;

    const baseUrl =
      process.env.CRON_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";

    if (!baseUrl) {
      summary.error =
        "CRON_BASE_URL or NEXT_PUBLIC_APP_URL is required for payment reconciliation.";
      return summary;
    }

    for (const order of orders) {
      if (!order?.payment_token) continue;

      summary.attempted += 1;

      const webhookPath =
        order.order_type === "registry"
          ? "/api/registry/payment/webhook"
          : "/api/storefront/checkout/webhook";

      const formData = new FormData();
      formData.set("token", order.payment_token);
      if (order.order_code) {
        formData.set("order-id", order.order_code);
      }

      try {
        const response = await fetch(`${baseUrl}${webhookPath}`, {
          method: "POST",
          body: formData,
          cache: "no-store",
        });

        if (response.ok) {
          summary.reconciled += 1;
        } else {
          summary.failed += 1;
        }
      } catch (error) {
        summary.failed += 1;
      }
    }
  } catch (error) {
    summary.error = error?.message || "Unexpected reconciliation error.";
  }

  return summary;
}

// ─── Event Reminders ─────────────────────────────────────────────────────────

const REMINDER_WINDOWS = [
  { type: "7_day", daysOut: 7, label: "7 days" },
  { type: "3_day", daysOut: 3, label: "3 days" },
  { type: "1_day", daysOut: 1, label: "1 day" },
];

async function createEventReminders(admin) {
  const summary = { checked: 0, created: 0 };

  try {
    const now = new Date();

    for (const window of REMINDER_WINDOWS) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + window.daysOut);

      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Find events happening on the target date
      const { data: events, error: eventsError } = await admin
        .from("events")
        .select("id, title, date, host_id, host:profiles!Events_host_id_fkey(id, firstname, lastname, email)")
        .gte("date", dayStart.toISOString())
        .lte("date", dayEnd.toISOString());

      if (eventsError) {
        console.error(
          `[cron/dispatch] Event query error (${window.type}):`,
          eventsError
        );
        continue;
      }

      if (!events?.length) continue;
      summary.checked += events.length;

      for (const event of events) {
        // Check if reminder already sent (idempotent)
        const { data: existing } = await admin
          .from("event_reminders_log")
          .select("id")
          .eq("event_id", event.id)
          .eq("reminder_type", window.type)
          .maybeSingle();

        if (existing) continue;

        const host = event.host;
        if (!host?.id || !host?.email) continue;

        const hostName =
          [host.firstname, host.lastname].filter(Boolean).join(" ") || "there";

        // Dispatch notification (in-app + email queue + push)
        await dispatchNotification({
          client: admin,
          recipientId: host.id,
          recipientRole: "host",
          eventType: "event_reminder",
          message: `Your event "${event.title}" is ${window.label} away!`,
          link: "/dashboard/h",
          data: { event_id: event.id },
          emailPayload: {
            templateSlug: "host_event_reminder",
            to: host.email,
            variables: {
              host_name: hostName,
              event_title: event.title,
              days_until: String(window.daysOut),
              event_date: new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            },
          },
          pushPayload: {
            title: "Event Reminder",
            body: `Your event "${event.title}" is ${window.label} away!`,
            url: "/dashboard/h",
          },
        });

        // Log so we don't re-send
        await admin.from("event_reminders_log").insert({
          event_id: event.id,
          reminder_type: window.type,
        });

        summary.created++;
      }
    }
  } catch (err) {
    console.error("[cron/dispatch] Event reminders error:", err);
    summary.error = err?.message;
  }

  return summary;
}

// ─── Expire Pending Orders ──────────────────────────────────────────────────

async function expirePendingOrders(admin) {
  const timeoutHours = parseInt(
    process.env.PENDING_ORDER_TIMEOUT_HOURS || "24",
    10
  );
  const summary = { expired: 0, cancelled: 0 };

  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - timeoutHours);

    const { data: expiredOrders, error: selectError } = await admin
      .from("orders")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", cutoff.toISOString())
      .limit(500);

    if (selectError) {
      summary.error = selectError.message;
      return summary;
    }

    if (!expiredOrders?.length) return summary;

    const orderIds = expiredOrders.map((o) => o.id);

    await admin
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", orderIds);

    await admin
      .from("order_items")
      .update({
        fulfillment_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .in("order_id", orderIds)
      .eq("fulfillment_status", "pending");

    summary.expired = orderIds.length;
    summary.cancelled = orderIds.length;
  } catch (err) {
    console.error("[cron/dispatch] Expire orders error:", err);
    summary.error = err?.message;
  }

  return summary;
}
