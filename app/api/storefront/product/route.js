import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vendor_slug = searchParams.get("vendor_slug");
    const product_code = searchParams.get("product_code");

    if (!vendor_slug || !product_code) {
      return NextResponse.json(
        { message: "vendor_slug and product_code are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select(
        `
        id,
        business_name,
        description,
        logo,
        logo_url,
        slug,
        shop_status,
        category,
        verified,
        address_city,
        address_state,
        address_country,
        address_street,
        digital_address,
        phone,
        email
      `
      )
      .eq("slug", vendor_slug)
      .maybeSingle();

    if (vendorError) {
      return NextResponse.json({ message: "Failed to load vendor" }, { status: 500 });
    }

    if (!vendor?.id) {
      return NextResponse.json({ vendor: null, product: null }, { status: 200 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        id,
        product_code,
        name,
        price,
        weight_kg,
        service_charge,
        variations,
        images,
        description,
        stock_qty,
        status,
        category_id,
        category:categories(id, name, slug)
      `
      )
      .eq("vendor_id", vendor.id)
      .eq("product_code", product_code)
      .eq("status", "approved")
      .eq("active", true)
      .maybeSingle();

    if (productError) {
      return NextResponse.json({ message: "Failed to load product" }, { status: 500 });
    }

    return NextResponse.json({ vendor, product }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in storefront product:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
