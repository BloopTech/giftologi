import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";

/**
 * GET /api/gift-guides/[slug] — get a single guide with its products
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const admin = createAdminClient();

    const { data: guide, error: guideError } = await admin
      .from("gift_guides")
      .select(
        "id, title, slug, description, cover_image, occasion, budget_range, sort_order, is_published, created_at"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (guideError || !guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Fetch guide items with product details
    const { data: items } = await admin
      .from("gift_guide_items")
      .select(
        `
        id,
        sort_order,
        editor_note,
        product:products(
          id,
          name,
          price,
          sale_price,
          sale_starts_at,
          sale_ends_at,
          images,
          stock_qty,
          avg_rating,
          review_count,
          service_charge,
          product_type,
          vendor:vendors(id, slug, business_name, verified, logo_url)
        )
      `
      )
      .eq("guide_id", guide.id)
      .order("sort_order", { ascending: true });

    // Filter out items where product was deleted
    const validItems = (items || []).filter((i) => i.product);

    return NextResponse.json({
      guide,
      items: validItems,
    });
  } catch (err) {
    console.error("[api/gift-guides/slug] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
