import { NextResponse } from "next/server";
import { createAdminClient } from "../../utils/supabase/server";

/**
 * GET /api/treats — list active treat products (product_type = 'treat')
 * Supports ?page=1&limit=20&sort=newest&q=search&category=uuid
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") || "newest";
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("category") || "";

    const admin = createAdminClient();
    const offset = (page - 1) * limit;

    let query = admin
      .from("products")
      .select(
        `
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
        description,
        category_id,
        vendor:vendors!inner(id, slug, business_name, verified, logo_url)
      `,
        { count: "exact" }
      )
      .eq("product_type", "treat")
      .eq("status", "active")
      .eq("active", true);

    if (q.trim()) {
      query = query.ilike("name", `%${q.trim()}%`);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // Sorting
    switch (sort) {
      case "price_low":
        query = query.order("price", { ascending: true });
        break;
      case "price_high":
        query = query.order("price", { ascending: false });
        break;
      case "best_rated":
        query = query.order("avg_rating", { ascending: false, nullsFirst: false });
        break;
      case "popular":
        query = query.order("review_count", { ascending: false, nullsFirst: false });
        break;
      case "name_asc":
        query = query.order("name", { ascending: true });
        break;
      case "name_desc":
        query = query.order("name", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      products: products || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error("[api/treats] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
