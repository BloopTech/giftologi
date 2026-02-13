import { NextResponse } from "next/server";
import { createAdminClient } from "../../utils/supabase/server";

/**
 * GET /api/gift-guides — list published gift guides (public)
 * Supports optional ?occasion=wedding&budget=under_50 filters
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const occasion = searchParams.get("occasion");
    const budget = searchParams.get("budget");

    const admin = createAdminClient();

    let query = admin
      .from("gift_guides")
      .select(
        "id, title, slug, description, cover_image, occasion, budget_range, sort_order, created_at"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (occasion) query = query.eq("occasion", occasion);
    if (budget) query = query.eq("budget_range", budget);

    const { data: guides, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get product count per guide
    const guideIds = (guides || []).map((g) => g.id);
    let itemCounts = {};

    if (guideIds.length) {
      const { data: counts } = await admin
        .from("gift_guide_items")
        .select("guide_id")
        .in("guide_id", guideIds);

      if (counts) {
        for (const item of counts) {
          itemCounts[item.guide_id] = (itemCounts[item.guide_id] || 0) + 1;
        }
      }
    }

    const result = (guides || []).map((g) => ({
      ...g,
      productCount: itemCounts[g.id] || 0,
    }));

    return NextResponse.json({ guides: result });
  } catch (err) {
    console.error("[api/gift-guides] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
