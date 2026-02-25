import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";
import { issueSupportTicketAccessToken } from "../../../utils/supportAccessToken";
import { rateLimit, getClientIp } from "../../../utils/rateLimit";
import { logSecurityEvent, SecurityEvents } from "../../../utils/securityLogger";

const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TICKETS_PER_REQUEST = 10;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = recoveryLimiter.check(ip);
    if (!allowed) {
      logSecurityEvent(SecurityEvents.RATE_LIMITED, { ip, route: "/api/support/recovery" });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    if (!process.env.SUPPORT_ACCESS_TOKEN_SECRET) {
      return NextResponse.json(
        { error: "Support recovery is temporarily unavailable." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: tickets, error: ticketsError } = await admin
      .from("support_tickets")
      .select("id, subject, guest_name, guest_email, status, created_at")
      .eq("guest_email", email)
      .order("created_at", { ascending: false })
      .limit(MAX_TICKETS_PER_REQUEST);

    if (ticketsError) {
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    if (Array.isArray(tickets) && tickets.length) {
      for (const ticket of tickets) {
        try {
          const accessToken = await issueSupportTicketAccessToken({
            ticketId: ticket.id,
            email,
          });

          await admin.from("notification_email_queue").insert({
            recipient_email: email,
            template_slug: "support_ticket_recovery_guest",
            variables: {
              guest_name: ticket.guest_name || "Customer",
              ticket_id: ticket.id,
              ticket_subject: ticket.subject || "Support ticket",
              ticket_status: ticket.status || "open",
              ticket_url: `/support/${ticket.id}?access_token=${encodeURIComponent(accessToken)}`,
              support_access_token: accessToken,
            },
            status: "pending",
          });
        } catch (queueError) {
          console.error(
            `[api/support/recovery] Failed to queue recovery email for ticket ${ticket.id}:`,
            queueError
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If support tickets are associated with that email, recovery links will be sent shortly.",
    });
  } catch (error) {
    console.error("[api/support/recovery] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
