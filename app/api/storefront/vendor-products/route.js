import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const vendor_slug = searchParams.get("vendor_slug");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(limitRaw || "12", 10) || 12));

    if (!vendor_slug) {
      return NextResponse.json({ message: "vendor_slug is required" }, { status: 400 });
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

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(
        `
        id,
        product_code,
        name,
        price,
        images,
        description,
        stock_qty,
        status,
        category_id,
        product_categories (category_id)
      `
      )
      .eq("vendor_id", vendor.id)
      .eq("status", "approved")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (productsError) {
      return NextResponse.json(
        { message: "Failed to load products" },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: Array.isArray(products) ? products : [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in storefront vendor-products:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
