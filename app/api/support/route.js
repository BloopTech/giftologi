import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "../../utils/supabase/server";

/**
 * GET  /api/support — list tickets for the authenticated user
 * POST /api/support — create a new support ticket
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select(
        "id, subject, description, category, status, priority, order_id, created_at, updated_at, resolved_at, closed_at"
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, description, category, orderId } = body;

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    const validCategories = [
      "order",
      "payment",
      "shipping",
      "account",
      "vendor",
      "registry",
      "general",
      "other",
    ];
    const safeCategory = validCategories.includes(category)
      ? category
      : "general";

    const admin = createAdminClient();

    const insertPayload = {
      created_by: user.id,
      subject: subject.trim().slice(0, 200),
      description: (description || "").trim().slice(0, 5000),
      category: safeCategory,
      status: "open",
      priority: "normal",
    };

    if (orderId) insertPayload.order_id = orderId;

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
        sender_id: user.id,
        sender_role: "user",
        message: description.trim().slice(0, 5000),
      });
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
