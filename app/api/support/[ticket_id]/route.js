import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "../../../utils/supabase/server";

/**
 * GET /api/support/[ticket_id] — get ticket details + messages
 */
export async function GET(request, { params }) {
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

    // Check if user owns this ticket or is admin
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

    const admin = createAdminClient();

    const ticketQuery = admin
      .from("support_tickets")
      .select(
        "id, subject, description, category, status, priority, order_id, assigned_admin_id, guest_email, guest_name, created_by, created_at, updated_at, resolved_at, closed_at"
      )
      .eq("id", ticket_id)
      .single();

    const { data: ticket, error: ticketError } = await ticketQuery;

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Authorization: user must own the ticket or be admin
    if (!isAdmin && ticket.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch messages
    const { data: messages } = await admin
      .from("support_ticket_messages")
      .select("id, sender_id, sender_role, message, attachments, created_at")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });

    // Fetch creator profile
    const { data: creator } = await admin
      .from("profiles")
      .select("id, firstname, lastname, email, image")
      .eq("id", ticket.created_by)
      .single();

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
