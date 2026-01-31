import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vendor_slug = searchParams.get("vendor_slug");
    const product_code = searchParams.get("product_code");
    const limitRaw = searchParams.get("limit");
    const limit = Math.min(12, Math.max(1, Number.parseInt(limitRaw || "4", 10) || 4));

    if (!vendor_slug || !product_code) {
      return NextResponse.json(
        { message: "vendor_slug and product_code are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("slug", vendor_slug)
      .maybeSingle();

    if (vendorError) {
      return NextResponse.json({ message: "Failed to load vendor" }, { status: 500 });
    }

    if (!vendor?.id) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    const { data: current, error: currentError } = await supabase
      .from("products")
      .select("id")
      .eq("vendor_id", vendor.id)
      .eq("product_code", product_code)
      .maybeSingle();

    if (currentError) {
      return NextResponse.json({ message: "Failed to load product" }, { status: 500 });
    }

    const query = supabase
      .from("products")
      .select(
        `
        id,
        product_code,
        name,
        price,
        images,
        stock_qty
      `
      )
      .eq("vendor_id", vendor.id)
      .eq("status", "approved")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (current?.id) {
      query.neq("id", current.id);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      return NextResponse.json({ message: "Failed to load related products" }, { status: 500 });
    }

    return NextResponse.json({ products: Array.isArray(products) ? products : [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in storefront related-products:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
