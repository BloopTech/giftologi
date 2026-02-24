import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";
import { sendEmail, sendTemplatedEmail } from "../../../utils/emailService";
import { dispatchNotification } from "../../../utils/notificationService";
import {
  buildAnalyticsCsv,
  buildAnalyticsExportEmailHtml,
  fetchAdminAnalyticsMetrics,
} from "../../../utils/analytics/adminReporting";
import {
  buildVendorOrdersCsv,
  buildVendorOrdersExportEmailHtml,
  normalizeVendorOrderExportFilters,
} from "../../../utils/vendorOrderExport";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;
const EXPORT_JOB_RETENTION_HOURS = Number.parseInt(
  process.env.EXPORT_JOB_RETENTION_HOURS || "24",
  10,
);

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

    // ─── Task 5: Process analytics export queue ────────────────────────
    results.analyticsExports = await processAnalyticsExportQueue(admin);

    // ─── Task 6: Process vendor order export queue ─────────────────────
    results.vendorOrderExports = await processVendorOrderExportQueue(admin);

    // ─── Task 7: Clean up stale completed export jobs ───────────────────
    results.exportJobCleanup = await cleanupCompletedExportJobs(admin);

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

async function processAnalyticsExportQueue(admin) {
  const summary = { processed: 0, completed: 0, failed: 0 };

  try {
    const { data: jobs, error: fetchError } = await admin
      .from("analytics_export_jobs")
      .select("id, requested_by, recipient_email, tab_id, date_range, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("queued_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      return { ...summary, error: fetchError.message };
    }

    if (!jobs?.length) {
      return summary;
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.CRON_BASE_URL ||
      "";

    for (const job of jobs) {
      summary.processed += 1;
      const nowIso = new Date().toISOString();
      const nextAttempts = (job.attempts || 0) + 1;

      try {
        await admin
          .from("analytics_export_jobs")
          .update({
            status: "processing",
            attempts: nextAttempts,
            started_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", job.id)
          .eq("status", "pending");

        const metrics = await fetchAdminAnalyticsMetrics({
          adminClient: admin,
          dateRange: job.date_range,
        });

        const csvContent = buildAnalyticsCsv({
          tabId: job.tab_id,
          metricsByTab: metrics,
        });

        const completedAt = new Date().toISOString();

        const { error: completeError } = await admin
          .from("analytics_export_jobs")
          .update({
            status: "completed",
            csv_content: csvContent,
            completed_at: completedAt,
            updated_at: completedAt,
            last_error: null,
          })
          .eq("id", job.id);

        if (completeError) {
          throw new Error(completeError.message || "Failed to finalize export job");
        }

        if (job.recipient_email) {
          const normalizedBase = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
          const downloadUrl = normalizedBase
            ? `${normalizedBase}/api/admin/analytics/exports/${job.id}`
            : `/api/admin/analytics/exports/${job.id}`;

          const emailResult = await sendEmail({
            to: job.recipient_email,
            subject: "Your Giftologi analytics export is ready",
            html: buildAnalyticsExportEmailHtml({
              downloadUrl,
              tabId: job.tab_id,
              dateRange: job.date_range,
            }),
          });

          if (emailResult?.success) {
            await admin
              .from("analytics_export_jobs")
              .update({
                notified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.id);
          } else {
            await admin
              .from("analytics_export_jobs")
              .update({
                status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
                last_error: emailResult?.error || "Failed to send export email",
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            summary.failed += 1;
            continue;
          }
        }

        summary.completed += 1;
      } catch (error) {
        const failedAt = new Date().toISOString();
        await admin
          .from("analytics_export_jobs")
          .update({
            status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
            last_error: error?.message || "Failed to process analytics export",
            updated_at: failedAt,
          })
          .eq("id", job.id);

        summary.failed += 1;
      }
    }
  } catch (error) {
    summary.error = error?.message || "Failed to process analytics export queue.";
  }

  return summary;
}

const MAX_VENDOR_EXPORT_ROWS = 20000;

function normalizeOrderStatus(value) {
  const status = String(value || "pending").toLowerCase();
  return status === "canceled" ? "cancelled" : status;
}

function deriveFulfillmentStatus(fulfillmentStatus, orderStatus) {
  const normalizedFulfillment = String(fulfillmentStatus || "pending").toLowerCase();
  const normalizedOrder = normalizeOrderStatus(orderStatus);

  if (
    (normalizedFulfillment === "pending" || !fulfillmentStatus) &&
    (normalizedOrder === "cancelled" || normalizedOrder === "expired")
  ) {
    return normalizedOrder;
  }

  return normalizedFulfillment;
}

function formatVariationForExport(variation) {
  if (!variation) return "Standard";

  if (typeof variation === "string") {
    const trimmed = variation.trim();
    return trimmed || "Standard";
  }

  if (typeof variation === "object") {
    if (variation.label) return String(variation.label);
    if (variation.name) return String(variation.name);

    const skipKeys = new Set([
      "id",
      "key",
      "sku",
      "stock_qty",
      "price",
      "label",
      "name",
    ]);

    const parts = Object.entries(variation)
      .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${value}`);

    if (parts.length > 0) return parts.join(", ");
  }

  return "Standard";
}

function parseFilterDate(value, endOfDay = false) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay && raw.length <= 10) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

async function processVendorOrderExportQueue(admin) {
  const summary = { processed: 0, completed: 0, failed: 0 };

  try {
    const { data: jobs, error: fetchError } = await admin
      .from("vendor_order_export_jobs")
      .select("id, requested_by, vendor_id, recipient_email, filters, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("queued_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      return { ...summary, error: fetchError.message };
    }

    if (!jobs?.length) {
      return summary;
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.CRON_BASE_URL ||
      "";

    for (const job of jobs) {
      summary.processed += 1;
      const nowIso = new Date().toISOString();
      const nextAttempts = (job.attempts || 0) + 1;

      try {
        await admin
          .from("vendor_order_export_jobs")
          .update({
            status: "processing",
            attempts: nextAttempts,
            started_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", job.id)
          .eq("status", "pending");

        const filters = normalizeVendorOrderExportFilters(job.filters || {});

        const { data: orderRows, error: orderError } = await admin
          .from("order_items")
          .select(
            `
            quantity,
            price,
            variation,
            fulfillment_status,
            created_at,
            orders (
              order_code,
              status,
              created_at,
              buyer_firstname,
              buyer_lastname,
              registries ( title )
            ),
            products (
              name,
              product_code
            )
          `,
          )
          .eq("vendor_id", job.vendor_id)
          .order("created_at", { ascending: false })
          .limit(MAX_VENDOR_EXPORT_ROWS);

        if (orderError) {
          throw new Error(orderError.message || "Failed to load vendor orders");
        }

        const normalizedRows = (orderRows || []).map((row) => {
          const order = row?.orders || {};
          const product = row?.products || {};
          const createdAtRaw = order?.created_at || row?.created_at || null;
          const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;

          return {
            orderCode: order?.order_code || "",
            productName: product?.name || "",
            productSku: product?.product_code || "",
            variation: formatVariationForExport(row?.variation),
            customerName:
              `${order?.buyer_firstname || ""} ${order?.buyer_lastname || ""}`.trim(),
            registryTitle: order?.registries?.title || "",
            quantity: Number(row?.quantity || 0),
            amount: Number(row?.price || 0) * Number(row?.quantity || 0),
            status: deriveFulfillmentStatus(row?.fulfillment_status, order?.status),
            createdAt,
            date:
              createdAt && !Number.isNaN(createdAt.getTime())
                ? createdAt.toISOString()
                : "",
          };
        });

        const fromDate = parseFilterDate(filters.from, false);
        const toDate = parseFilterDate(filters.to, true);
        const queryText = String(filters.q || "").toLowerCase();

        const filteredRows = normalizedRows.filter((row) => {
          if (filters.status !== "all") {
            const status = String(row?.status || "").toLowerCase();
            if (status !== filters.status) return false;
          }

          if (fromDate && row.createdAt && row.createdAt < fromDate) {
            return false;
          }

          if (toDate && row.createdAt && row.createdAt > toDate) {
            return false;
          }

          if (queryText) {
            const searchable = [
              row.orderCode,
              row.productName,
              row.productSku,
              row.customerName,
              row.registryTitle,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (!searchable.includes(queryText)) return false;
          }

          return true;
        });

        const csvContent = buildVendorOrdersCsv(filteredRows);
        const completedAt = new Date().toISOString();

        const { error: completeError } = await admin
          .from("vendor_order_export_jobs")
          .update({
            status: "completed",
            csv_content: csvContent,
            completed_at: completedAt,
            updated_at: completedAt,
            last_error: null,
          })
          .eq("id", job.id);

        if (completeError) {
          throw new Error(completeError.message || "Failed to finalize vendor export job");
        }

        const normalizedBase = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
        const downloadUrl = normalizedBase
          ? `${normalizedBase}/api/vendor/orders/exports/${job.id}`
          : `/api/vendor/orders/exports/${job.id}`;

        const emailResult = await sendEmail({
          to: job.recipient_email,
          subject: "Your Giftologi vendor orders export is ready",
          html: buildVendorOrdersExportEmailHtml({
            downloadUrl,
            status: filters.status,
            q: filters.q,
            from: filters.from,
            to: filters.to,
          }),
        });

        if (emailResult?.success) {
          await admin
            .from("vendor_order_export_jobs")
            .update({
              notified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        } else {
          await admin
            .from("vendor_order_export_jobs")
            .update({
              status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
              last_error: emailResult?.error || "Failed to send export email",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          summary.failed += 1;
          continue;
        }

        summary.completed += 1;
      } catch (error) {
        const failedAt = new Date().toISOString();
        await admin
          .from("vendor_order_export_jobs")
          .update({
            status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
            last_error: error?.message || "Failed to process vendor order export",
            updated_at: failedAt,
          })
          .eq("id", job.id);

        summary.failed += 1;
      }
    }
  } catch (error) {
    summary.error = error?.message || "Failed to process vendor order export queue.";
  }

  return summary;
}

async function purgeOldJobsForTable(admin, tableName, cutoffIso) {
  const PAGE_SIZE = 200;
  let deleted = 0;

  while (true) {
    const { data: jobs, error: fetchError } = await admin
      .from(tableName)
      .select("id")
      .in("status", ["completed", "failed"])
      .lt("updated_at", cutoffIso)
      .order("updated_at", { ascending: true })
      .limit(PAGE_SIZE);

    if (fetchError) {
      return { deleted, error: fetchError.message || "Failed to load stale jobs" };
    }

    if (!jobs?.length) {
      return { deleted, error: null };
    }

    const ids = jobs.map((job) => job?.id).filter(Boolean);
    if (!ids.length) {
      return { deleted, error: null };
    }

    const { error: deleteError } = await admin.from(tableName).delete().in("id", ids);
    if (deleteError) {
      return {
        deleted,
        error: deleteError.message || "Failed to delete stale export jobs",
      };
    }

    deleted += ids.length;

    if (jobs.length < PAGE_SIZE) {
      return { deleted, error: null };
    }
  }
}

async function cleanupCompletedExportJobs(admin) {
  const retentionHours =
    Number.isFinite(EXPORT_JOB_RETENTION_HOURS) && EXPORT_JOB_RETENTION_HOURS > 0
      ? EXPORT_JOB_RETENTION_HOURS
      : 24;

  const cutoffIso = new Date(
    Date.now() - retentionHours * 60 * 60 * 1000,
  ).toISOString();

  const summary = {
    retentionHours,
    cutoffIso,
    deleted: 0,
    analyticsExportJobsDeleted: 0,
    vendorOrderExportJobsDeleted: 0,
  };

  const analyticsResult = await purgeOldJobsForTable(
    admin,
    "analytics_export_jobs",
    cutoffIso,
  );
  summary.analyticsExportJobsDeleted = analyticsResult.deleted;
  summary.deleted += analyticsResult.deleted;

  const vendorResult = await purgeOldJobsForTable(
    admin,
    "vendor_order_export_jobs",
    cutoffIso,
  );
  summary.vendorOrderExportJobsDeleted = vendorResult.deleted;
  summary.deleted += vendorResult.deleted;

  if (analyticsResult.error || vendorResult.error) {
    summary.error =
      analyticsResult.error ||
      vendorResult.error ||
      "Failed to clean export jobs";
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
