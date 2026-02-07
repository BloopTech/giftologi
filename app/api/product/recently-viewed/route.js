import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const VIEW_BUFFER = 60;

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
    const sessionId = searchParams.get("session_id");
    const vendorSlug = searchParams.get("vendor_slug");
    const includeClosed = searchParams.get("include_closed") === "true";

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
    );

    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);

    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const profileId = user?.id || null;
    const effectiveSessionId = typeof sessionId === "string" ? sessionId : null;

    if (!effectiveSessionId && !profileId) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

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

    let viewsQuery = admin
      .from("product_page_views")
      .select("product_id, created_at")
      .order("created_at", { ascending: false })
      .limit(VIEW_BUFFER);

    if (effectiveSessionId) {
      viewsQuery = viewsQuery.eq("session_id", effectiveSessionId);
    } else if (profileId) {
      viewsQuery = viewsQuery.eq("profile_id", profileId);
    }

    const { data: views, error: viewsError } = await viewsQuery;

    if (viewsError) {
      return NextResponse.json(
        { message: "Failed to load recently viewed products" },
        { status: 500 }
      );
    }

    const orderedIds = [];
    const seen = new Set();
    (Array.isArray(views) ? views : []).forEach((view) => {
      if (!view?.product_id || seen.has(view.product_id)) return;
      seen.add(view.product_id);
      orderedIds.push(view.product_id);
    });

    if (!orderedIds.length) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

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

    const { data: products, error: productsError } = await productQuery;

    if (productsError) {
      return NextResponse.json(
        { message: "Failed to load recently viewed products" },
        { status: 500 }
      );
    }

    const productMap = new Map(
      (Array.isArray(products) ? products : []).map((product) => [product.id, product])
    );

    const orderedProducts = orderedIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      ;

    const start = (page - 1) * limit;
    const end = start + limit;
    const has_more = orderedProducts.length > end;
    const paged = orderedProducts.slice(start, end);

    return NextResponse.json(
      { products: paged, has_more, page, limit },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in recently viewed products:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
