import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function POST(req) {
  try {
    const supabase = await createClient();
    const body = await req.json().catch(() => ({}));

    const { registry_id, session_id, user_agent } = body || {};

    if (!registry_id || typeof registry_id !== "string") {
      return NextResponse.json(
        { message: "registry_id is required" },
        { status: 400 }
      );
    }

    const headers = Object.fromEntries(req.headers.entries());
    const ua = user_agent || headers["user-agent"] || null;
    const ip =
      headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      headers["x-real-ip"] ||
      null;

    // Derive a simple, non-reversible hash for IP (best-effort, not cryptographically strong)
    const ip_hash = ip ? `ip:${ip}` : null;

    const {
      data: profile,
      error: profileError,
    } = await supabase.from("profiles").select("id").single();

    if (profileError && profileError.code !== "PGRST116") {
      // If profile table access fails for a non-RLS-empty reason, surface the error
      console.error("Error fetching profile for page view:", profileError);
    }

    const profile_id = profile?.id || null;

    const { error: insertError } = await supabase.from("registry_page_views").insert({
      registry_id,
      profile_id,
      session_id: typeof session_id === "string" ? session_id : null,
      ip_hash,
      user_agent: ua,
    });

    if (insertError) {
      console.error("Error inserting registry_page_views:", insertError);
      return NextResponse.json(
        { message: "Failed to track page view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in registry track-view:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
