import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const LOOKBACK_DAYS = 45;

const PRODUCT_SELECT = `
  id,
  product_code,
  name,
  price,
  service_charge,
  images,
  variations,
  description,
  stock_qty,
  category_id,
  avg_rating,
  review_count,
  sale_price,
  sale_starts_at,
  sale_ends_at,
  product_categories (category_id),
  vendor:vendors!inner(
    id,
    slug,
    business_name,
    verified,
    shop_status
  )
`;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const pageRaw = searchParams.get("page");
    const vendorSlug = searchParams.get("vendor_slug");
    const includeClosed = searchParams.get("include_closed") === "true";

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
    );

    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    // Resolve vendor slug to ID if provided
    let vendorId = null;
    if (vendorSlug) {
      const { data: vendor, error: vendorError } = await admin
        .from("vendors")
        .select("id")
        .eq("slug", vendorSlug)
        .maybeSingle();

      if (vendorError) {
        return NextResponse.json(
          { message: "Failed to load vendor" },
          { status: 500 }
        );
      }

      if (!vendor?.id) {
        return NextResponse.json({ products: [] }, { status: 200 });
      }

      vendorId = vendor.id;
    }

    // Get authenticated user ID (optional — anonymous gets global recommendations)
    let userId = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Anonymous — userId stays null
    }

    // Single DB function call — replaces multiple queries
    const { data: scored, error: scoreError } = await admin.rpc(
      "get_personalized_recommendations",
      {
        p_user_id: userId,
        p_vendor_id: vendorId,
        p_limit: limit + 1, // fetch one extra to check has_more
        p_offset: offset,
        p_lookback_days: LOOKBACK_DAYS,
      }
    );

    if (scoreError) {
      console.error("Recommendation scoring error:", scoreError);
      return NextResponse.json(
        { message: "Failed to load recommended products" },
        { status: 500 }
      );
    }

    const scoredIds = (Array.isArray(scored) ? scored : []).map((r) => r.product_id);
    let products = [];
    let has_more = false;

    if (scoredIds.length) {
      has_more = scoredIds.length > limit;
      const idsToFetch = scoredIds.slice(0, limit);

      let productQuery = admin
        .from("products")
        .select(PRODUCT_SELECT)
        .in("id", idsToFetch)
        .eq("status", "approved")
        .eq("active", true)
        .gt("stock_qty", 0);

      if (!includeClosed) {
        productQuery = productQuery.eq("vendor.shop_status", "active");
      }

      const { data: productRows, error: productError } = await productQuery;

      if (productError) {
        return NextResponse.json(
          { message: "Failed to load recommended products" },
          { status: 500 }
        );
      }

      // Maintain score-based ordering
      const productMap = new Map(
        (Array.isArray(productRows) ? productRows : []).map((p) => [p.id, p])
      );
      products = idsToFetch.map((id) => productMap.get(id)).filter(Boolean);
    }

    // Fallback: newest products if no recommendations available
    if (!products.length) {
      let fallbackQuery = admin
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "approved")
        .eq("active", true)
        .gt("stock_qty", 0)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit);

      if (vendorId) {
        fallbackQuery = fallbackQuery.eq("vendor_id", vendorId);
      }

      if (!includeClosed) {
        fallbackQuery = fallbackQuery.eq("vendor.shop_status", "active");
      }

      const { data: fallbackRows, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        return NextResponse.json(
          { message: "Failed to load recommended products" },
          { status: 500 }
        );
      }

      const rows = Array.isArray(fallbackRows) ? fallbackRows : [];
      has_more = rows.length > limit;
      products = rows.slice(0, limit);
    }

    return NextResponse.json(
      { products, has_more, page, limit },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in recommended products:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
