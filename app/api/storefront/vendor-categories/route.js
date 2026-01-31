import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vendor_slug = searchParams.get("vendor_slug");

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
      return NextResponse.json({ categories: [] }, { status: 200 });
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("category_id")
      .eq("vendor_id", vendor.id)
      .eq("status", "approved")
      .eq("active", true);

    if (productsError) {
      return NextResponse.json({ message: "Failed to load categories" }, { status: 500 });
    }

    const categoryIds = [...new Set((products || []).map((p) => p.category_id).filter(Boolean))];

    if (categoryIds.length === 0) {
      return NextResponse.json({ categories: [] }, { status: 200 });
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .in("id", categoryIds)
      .order("name");

    if (categoriesError) {
      return NextResponse.json({ message: "Failed to load categories" }, { status: 500 });
    }

    return NextResponse.json({ categories: categories || [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in storefront vendor-categories:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
