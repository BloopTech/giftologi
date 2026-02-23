import { NextResponse } from "next/server";
import { createAdminClient } from "../../utils/supabase/server";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: faqs, error } = await admin
      .from("content_faqs")
      .select("id, question, answer, category, sort_order, visibility, updated_at")
      .eq("visibility", "public")
      .order("sort_order", { ascending: true })
      .order("question", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load FAQs." }, { status: 500 });
    }

    return NextResponse.json({ faqs: faqs || [] });
  } catch (error) {
    console.error("[api/faqs] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
