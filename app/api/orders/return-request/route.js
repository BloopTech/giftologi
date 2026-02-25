import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";
import { rateLimit, getClientIp } from "../../../utils/rateLimit";
import { logSecurityEvent, SecurityEvents } from "../../../utils/securityLogger";

const returnLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = returnLimiter.check(ip);
    if (!allowed) {
      logSecurityEvent(SecurityEvents.RATE_LIMITED, { ip, route: "/api/orders/return-request" });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { order_code, guest_email, order_item_id, request_type, reason, details } = body;

    if (!order_code || !guest_email || !reason) {
      return NextResponse.json(
        { error: "Order code, email, and reason are required." },
        { status: 400 }
      );
    }

    if (request_type && !["return", "exchange"].includes(request_type)) {
      return NextResponse.json(
        { error: "Invalid request type. Must be 'return' or 'exchange'." },
        { status: 400 }
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        { error: "Reason must be 1000 characters or less." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Look up order by order_code and verify email matches
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, order_code, buyer_email, gifter_email, status")
      .eq("order_code", order_code.trim())
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Verify email matches buyer or gifter
    const normalizedEmail = guest_email.trim().toLowerCase();
    const buyerMatch = order.buyer_email?.toLowerCase() === normalizedEmail;
    const gifterMatch = order.gifter_email?.toLowerCase() === normalizedEmail;

    if (!buyerMatch && !gifterMatch) {
      return NextResponse.json(
        { error: "Email does not match the order." },
        { status: 403 }
      );
    }

    // Only allow return requests for paid/completed/processing orders
    const allowedStatuses = ["paid", "completed", "processing"];
    if (!allowedStatuses.includes(order.status?.toLowerCase())) {
      return NextResponse.json(
        { error: `Returns are not available for orders with status "${order.status}".` },
        { status: 400 }
      );
    }

    // If order_item_id is provided, verify it belongs to this order
    if (order_item_id) {
      const { data: item } = await admin
        .from("order_items")
        .select("id")
        .eq("id", order_item_id)
        .eq("order_id", order.id)
        .maybeSingle();

      if (!item) {
        return NextResponse.json(
          { error: "Order item not found." },
          { status: 404 }
        );
      }
    }

    // Check for duplicate pending request on same order + item
    const dupQuery = admin
      .from("return_requests")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", "pending");

    if (order_item_id) {
      dupQuery.eq("order_item_id", order_item_id);
    }

    const { data: existing } = await dupQuery.limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "A pending request already exists for this item." },
        { status: 409 }
      );
    }

    // Create return request
    const { data: returnReq, error: insertError } = await admin
      .from("return_requests")
      .insert({
        order_id: order.id,
        order_item_id: order_item_id || null,
        request_type: request_type || "return",
        reason: reason.trim(),
        details: details?.trim() || null,
        guest_email: normalizedEmail,
        guest_name: body.guest_name?.trim() || null,
      })
      .select("id, request_type, status, created_at")
      .single();

    if (insertError) {
      console.error("Return request insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create request. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Return/exchange request submitted successfully.",
      request: returnReq,
    });
  } catch (err) {
    console.error("Return request API error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
