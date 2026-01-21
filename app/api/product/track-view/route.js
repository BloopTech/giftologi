import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function POST(req) {
  try {
    const supabase = await createClient();
    const body = (await req.json().catch(() => ({}))) || {};

    const { product_id, session_id, user_agent } = body;

    if (!product_id || typeof product_id !== "string") {
      return NextResponse.json(
        { message: "product_id is required" },
        { status: 400 }
      );
    }

    const headers = Object.fromEntries(req.headers.entries());
    const ua = user_agent || headers["user-agent"] || null;
    const ip =
      headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      headers["x-real-ip"] ||
      null;

    const ip_hash = ip ? `ip:${ip}` : null;

    const {
      data: profile,
      error: profileError,
    } = await supabase.from("profiles").select("id").single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile for product page view:", profileError);
    }

    const profile_id = profile?.id || null;

    const { error: insertError } = await supabase
      .from("product_page_views")
      .upsert(
        {
          product_id,
          profile_id,
          session_id: typeof session_id === "string" ? session_id : null,
          ip_hash,
          user_agent: ua,
        },
        {
          onConflict: "product_id,session_id",
          ignoreDuplicates: true,
        }
      );

    if (insertError) {
      console.error("Error inserting product_page_views:", insertError);
      return NextResponse.json(
        { message: "Failed to track product view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in product track-view:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
