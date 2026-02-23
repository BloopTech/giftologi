import { NextResponse } from "next/server";
import { createAdminClient } from "../../utils/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: settings, error } = await admin
      .from("content_contact_settings")
      .select("id, support_email, support_phone, office_address, business_hours, whatsapp_link")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to load contact settings." },
        { status: 500 },
      );
    }

    return NextResponse.json({ settings: settings || null });
  } catch (error) {
    console.error("[api/contact] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    const payload = {
      name: name.slice(0, 120),
      email: email.slice(0, 254),
      subject: subject.slice(0, 200) || null,
      message: message.slice(0, 5000),
      status: "new",
    };

    const { data: submission, error } = await admin
      .from("content_contact_submissions")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to send contact message." },
        { status: 500 },
      );
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("[api/contact] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
