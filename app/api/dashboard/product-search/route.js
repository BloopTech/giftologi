import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const vendorId = searchParams.get("vendor_id") || null;
    const productType = searchParams.get("product_type") || null;
    const shippable = searchParams.get("is_shippable") || null;
    const rawCategoryIds = searchParams.get("category_ids") || "";
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      50
    );

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // If category IDs provided, resolve matching product IDs first
    const categoryIds = rawCategoryIds
      ? rawCategoryIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let allowedProductIds = null;
    if (categoryIds.length > 0) {
      // Products that have a row in product_categories matching any selected category
      const { data: pcRows } = await supabase
        .from("product_categories")
        .select("product_id")
        .in("category_id", categoryIds);

      // Also include products whose own category_id matches
      const { data: directRows } = await supabase
        .from("products")
        .select("id")
        .in("category_id", categoryIds);

      const idSet = new Set([
        ...(pcRows || []).map((r) => r.product_id),
        ...(directRows || []).map((r) => r.id),
      ]);

      allowedProductIds = Array.from(idSet);
      if (allowedProductIds.length === 0) {
        return NextResponse.json({ products: [] }, { status: 200 });
      }
    }

    let query = supabase
      .from("products")
      .select(
        "id, name, product_code, images, vendor_id, status, active, is_shippable, product_type, vendor:vendors!Products_vendor_id_fkey(id, business_name)"
      )
      .eq("status", "approved")
      .eq("active", true)
      .limit(limit);

    if (allowedProductIds) {
      query = query.in("id", allowedProductIds);
    }

    if (vendorId) {
      query = query.eq("vendor_id", vendorId);
    }

    if (productType && productType !== "any") {
      query = query.eq("product_type", productType);
    }

    if (shippable === "shippable") {
      query = query.eq("is_shippable", true);
    } else if (shippable === "non_shippable") {
      query = query.eq("is_shippable", false);
    }

    if (q) {
      query = query.ilike("name", `%${q}%`);
    } else {
      query = query.order("name", { ascending: true });
    }

    const { data: products, error } = await query;

    if (error) {
      console.error("Product search error:", error);
      return NextResponse.json(
        { message: "Failed to search products" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { products: Array.isArray(products) ? products : [] },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in product search:", err);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
