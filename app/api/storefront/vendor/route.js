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

    const { data: vendor, error } = await supabase
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
        address_country,
        website,
        phone,
        email
      `
      )
      .eq("slug", vendor_slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: "Failed to load vendor" }, { status: 500 });
    }

    if (!vendor) {
      return NextResponse.json({ vendor: null }, { status: 200 });
    }

    return NextResponse.json({ vendor }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in storefront vendor:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
