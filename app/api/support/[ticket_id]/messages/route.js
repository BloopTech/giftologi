import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "../../../../utils/supabase/server";
import { verifySupportTicketAccessToken } from "../../../../utils/supportAccessToken";

const MAX_GUEST_ID_LENGTH = 191;

const normalizeGuestId = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_GUEST_ID_LENGTH);
};

const getGuestIdFromRequest = (request) =>
  normalizeGuestId(request?.headers?.get("x-guest-id"));

const getAccessTokenFromRequest = (request, body) => {
  const tokenFromHeader = String(
    request?.headers?.get("x-support-access-token") || ""
  ).trim();
  if (tokenFromHeader) return tokenFromHeader;

  const tokenFromBody = String(body?.accessToken || "").trim();
  if (tokenFromBody) return tokenFromBody;

  const tokenFromQuery = String(request?.nextUrl?.searchParams?.get("access_token") || "").trim();
  return tokenFromQuery || null;
};

/**
 * POST /api/support/[ticket_id]/messages — add a message to a ticket
 */
export async function POST(request, { params }) {
  try {
    const { ticket_id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { message, guestId } = body;
    const normalizedGuestId = normalizeGuestId(
      guestId || getGuestIdFromRequest(request)
    );
    const accessToken = getAccessTokenFromRequest(request, body);
    const isAuthenticated = Boolean(user?.id);

    if (!isAuthenticated && !normalizedGuestId && !accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select(
        "id, created_by, guest_id, guest_email, status, creator:profiles!support_tickets_created_by_fkey(email)"
      )
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user is admin or owner
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

    const tokenVerification = accessToken
      ? await verifySupportTicketAccessToken(accessToken)
      : { valid: false, payload: null };
    const tokenTicketId = String(tokenVerification?.payload?.ticket_id || "").trim();
    const tokenEmail = String(tokenVerification?.payload?.email || "")
      .trim()
      .toLowerCase();
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
      : (ticket.guest_id && ticket.guest_id === normalizedGuestId) || isTokenOwner;

    if (!isAdmin && !isTicketOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAuthenticated && normalizedGuestId && isTokenOwner && ticket.guest_id !== normalizedGuestId) {
      await admin
        .from("support_tickets")
        .update({ guest_id: normalizedGuestId, updated_at: new Date().toISOString() })
        .eq("id", ticket_id);
    }

    const senderRole = isAdmin ? "admin" : "user";

    const { data: newMessage, error: insertError } = await admin
      .from("support_ticket_messages")
      .insert({
        ticket_id,
        sender_id: user?.id || null,
        sender_role: senderRole,
        message: message.trim().slice(0, 5000),
      })
      .select("id, sender_id, sender_role, message, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Re-open ticket if user replies to a resolved/closed ticket
    if (
      senderRole === "user" &&
      (ticket.status === "resolved" || ticket.status === "closed")
    ) {
      await admin
        .from("support_tickets")
        .update({ status: "open", updated_at: new Date().toISOString() })
        .eq("id", ticket_id);
    }

    // Update ticket updated_at
    await admin
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticket_id);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err) {
    console.error("[api/support/messages] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
