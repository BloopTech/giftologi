import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "../../../../utils/supabase/server";

/**
 * POST /api/support/[ticket_id]/messages — add a message to a ticket
 */
export async function POST(request, { params }) {
  try {
    const { ticket_id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

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
      .select("id, created_by, status")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user is admin or owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = [
      "super_admin",
      "customer_support_admin",
      "operations_manager_admin",
    ].includes(profile?.role);

    if (!isAdmin && ticket.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const senderRole = isAdmin ? "admin" : "user";

    const { data: newMessage, error: insertError } = await admin
      .from("support_ticket_messages")
      .insert({
        ticket_id,
        sender_id: user.id,
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
