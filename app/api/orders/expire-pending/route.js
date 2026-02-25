import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";
import { logSecurityEvent, SecurityEvents } from "../../../utils/securityLogger";

const PENDING_ORDER_TIMEOUT_HOURS = parseInt(
  process.env.PENDING_ORDER_TIMEOUT_HOURS || "24",
  10,
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[cron/expire-pending] CRON_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logSecurityEvent(SecurityEvents.INVALID_CRON_SECRET, {
        route: "/api/orders/expire-pending",
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - PENDING_ORDER_TIMEOUT_HOURS);
    const cutoffIso = cutoff.toISOString();

    const { data: expiredOrders, error: selectError } = await admin
      .from("orders")
      .select("id, order_code, created_at")
      .eq("status", "pending")
      .lt("created_at", cutoffIso)
      .limit(500);

    if (selectError) {
      console.error("Expire pending orders select error:", selectError);
      return NextResponse.json(
        { error: selectError.message },
        { status: 500 },
      );
    }

    if (!expiredOrders?.length) {
      return NextResponse.json({
        success: true,
        message: "No pending orders to expire.",
        expired: 0,
        cancelled: 0,
      });
    }

    const orderIds = expiredOrders.map((o) => o.id);

    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .in("id", orderIds);

    if (updateError) {
      console.error("Expire pending orders update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    const { error: syncItemsError } = await admin
      .from("order_items")
      .update({
        fulfillment_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .in("order_id", orderIds)
      .eq("fulfillment_status", "pending");

    if (syncItemsError) {
      console.error("Expire pending orders item sync error:", syncItemsError);
      return NextResponse.json(
        { error: syncItemsError.message },
        { status: 500 },
      );
    }

    console.log(
      `Cancelled ${orderIds.length} pending orders older than ${PENDING_ORDER_TIMEOUT_HOURS}h`,
    );

    return NextResponse.json({
      success: true,
      expired: orderIds.length,
      cancelled: orderIds.length,
      cutoff: cutoffIso,
    });
  } catch (error) {
    console.error("Expire pending orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
