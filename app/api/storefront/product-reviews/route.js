import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import {
  createNotification,
  fetchVendorNotificationPreferences,
} from "@/app/utils/notifications";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vendor_slug = searchParams.get("vendor_slug");
    const product_code = searchParams.get("product_code");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(limitRaw || "10", 10) || 10)
    );

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

    return NextResponse.json(
      { reviews: Array.isArray(reviews) ? reviews : [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in storefront product-reviews:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const vendor_slug = body?.vendor_slug;
    const product_code = body?.product_code;
    const ratingValue = Number(body?.rating);
    const commentRaw = typeof body?.comment === "string" ? body.comment.trim() : "";
    const comment = commentRaw ? commentRaw : null;

    if (!vendor_slug || !product_code) {
      return NextResponse.json(
        { message: "vendor_slug and product_code are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json(
        { message: "Rating must be between 1 and 5." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to leave a review." },
        { status: 401 }
      );
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, profiles_id")
      .eq("slug", vendor_slug)
      .maybeSingle();

    if (vendorError) {
      return NextResponse.json({ message: "Failed to load vendor" }, { status: 500 });
    }

    if (!vendor?.id) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name")
      .eq("vendor_id", vendor.id)
      .eq("product_code", product_code)
      .maybeSingle();

    if (productError) {
      return NextResponse.json({ message: "Failed to load product" }, { status: 500 });
    }

    if (!product?.id) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const { data: review, error: reviewError } = await supabase
      .from("product_reviews")
      .insert({
        product_id: product.id,
        reviewer_id: user.id,
        rating: ratingValue,
        comment,
        created_at: nowIso,
      })
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        reviewer:profiles(firstname, lastname, image)
      `
      )
      .single();

    if (reviewError) {
      return NextResponse.json({ message: "Failed to save review" }, { status: 500 });
    }

    try {
      if (vendor?.profiles_id) {
        const { data: preferences } =
          await fetchVendorNotificationPreferences({
            client: supabase,
            vendorId: vendor.id,
          });

        if (preferences?.product_reviews) {
          await createNotification({
            client: supabase,
            userId: vendor.profiles_id,
            type: "product_review",
            message: product?.name
              ? `New review for ${product.name}.`
              : "You received a new product review.",
            link: "/dashboard/v/products",
            data: {
              review_id: review?.id,
              product_id: product.id,
              vendor_id: vendor.id,
              rating: ratingValue,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to notify vendor about review", error);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in product-reviews POST:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
