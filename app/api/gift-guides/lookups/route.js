import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";

/**
 * GET /api/gift-guides/lookups — fetch occasion and budget range labels from DB
 */
export async function GET() {
  try {
    const admin = createAdminClient();

    const [occasionsRes, budgetRes] = await Promise.all([
      admin
        .from("gift_guide_occasions")
        .select("value, label, sort_order")
        .order("sort_order", { ascending: true }),
      admin
        .from("gift_guide_budget_ranges")
        .select("value, label, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    return NextResponse.json({
      occasions: occasionsRes.data || [],
      budgetRanges: budgetRes.data || [],
    });
  } catch (err) {
    console.error("[api/gift-guides/lookups] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
