import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "../../utils/supabase/server";
import { issueSupportTicketAccessToken } from "../../utils/supportAccessToken";
import { rateLimit, getClientIp } from "../../utils/rateLimit";
import { logSecurityEvent, SecurityEvents } from "../../utils/securityLogger";

const supportLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_GUEST_ID_LENGTH = 191;

const normalizeGuestId = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_GUEST_ID_LENGTH);
};

const getGuestIdFromRequest = (request) =>
  normalizeGuestId(request?.headers?.get("x-guest-id"));

/**
 * GET  /api/support — list tickets for authenticated users or guest sessions
 * POST /api/support — create a new support ticket
 */

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const guestId = getGuestIdFromRequest(request);
    const isAuthenticated = Boolean(user?.id);

    if (!isAuthenticated && !guestId) {
      return NextResponse.json({ tickets: [] });
    }

    const admin = createAdminClient();

    let query = admin
      .from("support_tickets")
      .select(
        "id, subject, description, category, status, priority, order_id, guest_id, created_at, updated_at, resolved_at, closed_at"
      )
      .order("created_at", { ascending: false });

    if (isAuthenticated) {
      query = query.eq("created_by", user.id);
    } else {
      query = query.eq("guest_id", guestId);
    }

    const { data: tickets, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets: tickets || [] });
  } catch (err) {
    console.error("[api/support] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = supportLimiter.check(ip);
    if (!allowed) {
      logSecurityEvent(SecurityEvents.RATE_LIMITED, { ip, route: "/api/support" });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      subject,
      description,
      category,
      orderId,
      orderCode,
      guestEmail,
      guestName,
      guestId,
    } = body;

    const isAuthenticated = Boolean(user?.id);
    const normalizedGuestEmail = String(guestEmail || "")
      .trim()
      .toLowerCase();
    const normalizedGuestName = String(guestName || "").trim();
    const normalizedOrderCode = String(orderCode || "").trim();
    const normalizedGuestId = normalizeGuestId(
      guestId || getGuestIdFromRequest(request)
    );

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!isAuthenticated) {
      if (!normalizedGuestId) {
        return NextResponse.json(
          {
            error:
              "Unable to identify this guest session. Please refresh and try again.",
          },
          { status: 400 }
        );
      }
      if (!normalizedGuestEmail) {
        return NextResponse.json(
          { error: "Email is required when creating a guest support ticket" },
          { status: 400 }
        );
      }
      if (!EMAIL_PATTERN.test(normalizedGuestEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address" },
          { status: 400 }
        );
      }
    }

    const validCategories = [
      "order",
      "payment",
      "shipping",
      "account",
      "vendor",
      "registry",
      "product",
      "treat",
      "general",
      "other",
    ];
    const safeCategory = validCategories.includes(category)
      ? category
      : "general";

    const admin = createAdminClient();
    let linkedOrderId = null;

    if (orderId || normalizedOrderCode) {
      let orderQuery = admin
        .from("orders")
        .select("id, buyer_id, buyer_email")
        .limit(1);

      if (orderId) {
        orderQuery = orderQuery.eq("id", orderId);
      } else {
        orderQuery = orderQuery.eq("order_code", normalizedOrderCode);
      }

      const { data: order, error: orderLookupError } = await orderQuery.maybeSingle();

      if (orderLookupError) {
        return NextResponse.json(
          { error: "Failed to validate order details" },
          { status: 500 }
        );
      }

      if (!order) {
        return NextResponse.json(
          { error: "Order not found for the provided details" },
          { status: 404 }
        );
      }

      const orderEmail = String(order.buyer_email || "")
        .trim()
        .toLowerCase();

      if (isAuthenticated) {
        const userEmail = String(user?.email || "")
          .trim()
          .toLowerCase();
        if (order.buyer_id && order.buyer_id !== user.id) {
          return NextResponse.json(
            { error: "You can only link support tickets to your own orders" },
            { status: 403 }
          );
        }
        if (!order.buyer_id && orderEmail && userEmail && orderEmail !== userEmail) {
          return NextResponse.json(
            { error: "You can only link support tickets to your own orders" },
            { status: 403 }
          );
        }
      } else {
        if (!orderEmail || orderEmail !== normalizedGuestEmail) {
          return NextResponse.json(
            { error: "Order email does not match the guest email provided" },
            { status: 400 }
          );
        }
      }

      linkedOrderId = order.id;
    }

    const insertPayload = {
      created_by: isAuthenticated ? user.id : null,
      subject: subject.trim().slice(0, 200),
      description: (description || "").trim().slice(0, 5000),
      category: safeCategory,
      status: "open",
      priority: "normal",
      guest_id: isAuthenticated ? null : normalizedGuestId,
      guest_email: isAuthenticated ? null : normalizedGuestEmail,
      guest_name: isAuthenticated
        ? null
        : normalizedGuestName
          ? normalizedGuestName.slice(0, 120)
          : null,
    };

    if (linkedOrderId) insertPayload.order_id = linkedOrderId;

    const { data: ticket, error: insertError } = await admin
      .from("support_tickets")
      .insert(insertPayload)
      .select("id, subject, category, status, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // If there's a description, also create the first message
    if (description?.trim()) {
      await admin.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: user?.id || null,
        sender_role: "user",
        message: description.trim().slice(0, 5000),
      });
    }

    if (!isAuthenticated && normalizedGuestEmail) {
      let ticketPath = `/support/${ticket.id}`;
      let accessToken = null;

      try {
        accessToken = await issueSupportTicketAccessToken({
          ticketId: ticket.id,
          email: normalizedGuestEmail,
        });

        if (accessToken) {
          ticketPath = `${ticketPath}?access_token=${encodeURIComponent(accessToken)}`;
        }
      } catch (tokenError) {
        console.error(
          "[api/support] Failed to create guest support access token:",
          tokenError
        );
      }

      try {
        await admin.from("notification_email_queue").insert({
          recipient_email: normalizedGuestEmail,
          template_slug: "support_ticket_created_guest",
          variables: {
            guest_name: normalizedGuestName || "Customer",
            ticket_id: ticket.id,
            ticket_subject: ticket.subject,
            ticket_category: safeCategory,
            ticket_url: ticketPath,
            support_access_token: accessToken,
          },
          status: "pending",
        });
      } catch (queueError) {
        console.error(
          "[api/support] Failed to queue guest support ticket email:",
          queueError
        );
      }
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    console.error("[api/support] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
