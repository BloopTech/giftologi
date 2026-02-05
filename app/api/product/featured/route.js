import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

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
    const from = (page - 1) * limit;
    const to = from + limit;

    const supabase = await createClient();
    let vendorId = null;

    if (vendorSlug) {
      const { data: vendor, error: vendorError } = await supabase
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

    let query = supabase
      .from("featured_products")
      .select(
        `
        product:products!inner(
          id,
          product_code,
          name,
          price,
          images,
          variations,
          description,
          stock_qty,
          status,
          active,
          category_id,
          product_categories (category_id),
          vendor:vendors!inner(
            id,
            slug,
            business_name,
            verified,
            shop_status
          )
        )
      `
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (vendorId) {
      query = query.eq("product.vendor_id", vendorId);
    }

    if (!includeClosed) {
      query = query.eq("product.vendor.shop_status", "active");
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { message: "Failed to load featured products" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped = rows
      .map((row) => row?.product)
      .filter(Boolean)
      .filter((product) => product?.status === "approved" && product?.active === true)
      .filter((product) => (product?.stock_qty ?? 0) > 0);

    const has_more = rows.length > limit;
    const products = mapped.slice(0, limit);

    return NextResponse.json(
      { products, has_more, page, limit },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in featured products:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
