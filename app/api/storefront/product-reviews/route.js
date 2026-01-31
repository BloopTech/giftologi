import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vendor_slug = searchParams.get("vendor_slug");
    const product_code = searchParams.get("product_code");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitRaw || "10", 10) || 10));

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
      return NextResponse.json({ reviews: [] }, { status: 200 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("vendor_id", vendor.id)
      .eq("product_code", product_code)
      .maybeSingle();

    if (productError) {
      return NextResponse.json({ message: "Failed to load product" }, { status: 500 });
    }

    if (!product?.id) {
      return NextResponse.json({ reviews: [] }, { status: 200 });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: reviews, error: reviewsError } = await supabase
      .from("product_reviews")
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        reviewer:profiles(firstname, lastname, image)
      `
      )
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (reviewsError) {
      return NextResponse.json({ message: "Failed to load reviews" }, { status: 500 });
    }

    return NextResponse.json({ reviews: Array.isArray(reviews) ? reviews : [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in storefront product-reviews:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
