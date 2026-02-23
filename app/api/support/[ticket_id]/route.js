import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "../../../utils/supabase/server";
import { verifySupportTicketAccessToken } from "../../../utils/supportAccessToken";

const MAX_GUEST_ID_LENGTH = 191;

const normalizeGuestId = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_GUEST_ID_LENGTH);
};

const getGuestIdFromRequest = (request) =>
  normalizeGuestId(request?.headers?.get("x-guest-id"));

const getAccessTokenFromRequest = (request) => {
  const headerToken = String(
    request?.headers?.get("x-support-access-token") || ""
  ).trim();
  if (headerToken) return headerToken;

  const queryToken = String(request?.nextUrl?.searchParams?.get("access_token") || "").trim();
  return queryToken || null;
};

/**
 * GET /api/support/[ticket_id] — get ticket details + messages
 */
export async function GET(request, { params }) {
  try {
    const { ticket_id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const guestId = getGuestIdFromRequest(request);
    const accessToken = getAccessTokenFromRequest(request);
    const isAuthenticated = Boolean(user?.id);

    if (!isAuthenticated && !guestId && !accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns this ticket or is admin
    let profile = null;
    if (isAuthenticated) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      profile = data;
    }

    const isAdmin = [
      "super_admin",
      "customer_support_admin",
      "operations_manager_admin",
    ].includes(profile?.role);

    const admin = createAdminClient();

    const ticketQuery = admin
      .from("support_tickets")
      .select(
        "id, subject, description, category, status, priority, order_id, assigned_admin_id, guest_id, guest_email, guest_name, created_by, created_at, updated_at, resolved_at, closed_at, creator:profiles!support_tickets_created_by_fkey(email)"
      )
      .eq("id", ticket_id)
      .single();

    const { data: ticket, error: ticketError } = await ticketQuery;

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Authorization: requester must own the ticket or be admin
    const tokenVerification = accessToken
      ? await verifySupportTicketAccessToken(accessToken)
      : { valid: false, payload: null };

    const tokenEmail = String(tokenVerification?.payload?.email || "")
      .trim()
      .toLowerCase();
    const tokenTicketId = String(tokenVerification?.payload?.ticket_id || "").trim();
    const normalizedGuestEmail = String(ticket.guest_email || "")
      .trim()
      .toLowerCase();
    const normalizedCreatorEmail = String(ticket.creator?.email || "")
      .trim()
      .toLowerCase();

    const isTokenOwner =
      tokenVerification.valid &&
      tokenTicketId === ticket.id &&
      tokenEmail &&
      (tokenEmail === normalizedGuestEmail || tokenEmail === normalizedCreatorEmail);

    const isTicketOwner = isAuthenticated
      ? ticket.created_by === user.id
      : (ticket.guest_id && ticket.guest_id === guestId) || isTokenOwner;

    if (!isAdmin && !isTicketOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAuthenticated && guestId && isTokenOwner && ticket.guest_id !== guestId) {
      await admin
        .from("support_tickets")
        .update({ guest_id: guestId, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);
      ticket.guest_id = guestId;
    }

    // Fetch messages
    const { data: messages } = await admin
      .from("support_ticket_messages")
      .select("id, sender_id, sender_role, message, attachments, created_at")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });

    // Fetch creator profile
    let creator = null;
    if (ticket.created_by) {
      const { data } = await admin
        .from("profiles")
        .select("id, firstname, lastname, email, image")
        .eq("id", ticket.created_by)
        .single();
      creator = data || null;
    }

    // Fetch assigned admin profile if any
    let assignedAdmin = null;
    if (ticket.assigned_admin_id) {
      const { data: adminProfile } = await admin
        .from("profiles")
        .select("id, firstname, lastname, email")
        .eq("id", ticket.assigned_admin_id)
        .single();
      assignedAdmin = adminProfile;
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        creator: creator || null,
        assignedAdmin: assignedAdmin || null,
      },
      messages: messages || [],
    });
  } catch (err) {
    console.error("[api/support/ticket] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
