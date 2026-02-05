import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const VIEW_BUFFER = 200;
const LOOKBACK_DAYS = 45;

const PRODUCT_SELECT = `
  id,
  product_code,
  name,
  price,
  images,
  variations,
  description,
  stock_qty,
  category_id,
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

    const admin = createAdminClient();

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

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: views, error: viewsError } = await admin
      .from("product_page_views")
      .select("product_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(VIEW_BUFFER);

    if (viewsError) {
      return NextResponse.json(
        { message: "Failed to load recommended products" },
        { status: 500 }
      );
    }

    const counts = new Map();
    (Array.isArray(views) ? views : []).forEach((view) => {
      if (!view?.product_id) return;
      counts.set(view.product_id, (counts.get(view.product_id) || 0) + 1);
    });

    const orderedIds = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    let products = [];
    let has_more = false;
    if (orderedIds.length) {
      let productQuery = admin
        .from("products")
        .select(PRODUCT_SELECT)
        .in("id", orderedIds)
        .eq("status", "approved")
        .eq("active", true)
        .gt("stock_qty", 0);

      if (vendorId) {
        productQuery = productQuery.eq("vendor_id", vendorId);
      }

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

      const productMap = new Map(
        (Array.isArray(productRows) ? productRows : []).map((product) => [product.id, product])
      );

      const orderedProducts = orderedIds
        .map((id) => productMap.get(id))
        .filter(Boolean);

      const start = (page - 1) * limit;
      const end = start + limit;

      has_more = orderedProducts.length > end;
      products = orderedProducts.slice(start, end);
    }

    if (!products.length) {
      let fallbackQuery = admin
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "approved")
        .eq("active", true)
        .gt("stock_qty", 0)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, (page - 1) * limit + limit);

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
