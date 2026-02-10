import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const url = new URL(request.url);
    const guestBrowserId = url.searchParams.get("guestBrowserId");

    const adminClient = createAdminClient();
    let cartQuery = adminClient.from("carts").select("id");

    if (user) {
      cartQuery = cartQuery.eq("host_id", user.id);
    } else if (guestBrowserId) {
      cartQuery = cartQuery.eq("guest_browser_id", guestBrowserId);
    } else {
      return NextResponse.json({ items: [] });
    }

    // Only active, non-registry carts
    cartQuery = cartQuery.eq("status", "active").is("registry_id", null);

    const { data: carts } = await cartQuery;
    if (!carts?.length) return NextResponse.json({ items: [] });

    const cartIds = carts.map((c) => c.id);
    const { data: items, error: itemsError } = await adminClient
      .from("cart_items")
      .select("id, product_id, cart_id, product:products(vendor_id, vendor:vendors(slug))")
      .in("cart_id", cartIds);

    if (itemsError) {
      console.error("Failed to fetch cart items:", itemsError);
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({
      items: (items || []).map((i) => ({
        cartItemId: i.id,
        productId: i.product_id,
        cartId: i.cart_id,
        vendorSlug: i.product?.vendor?.slug || null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch cart product ids:", error);
    return NextResponse.json({ items: [] });
  }
}
