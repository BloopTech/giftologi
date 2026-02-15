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
    let cartQuery = adminClient.from("carts").select("id, vendor_id");

    if (user) {
      cartQuery = cartQuery.eq("host_id", user.id);
    } else if (guestBrowserId) {
      cartQuery = cartQuery.eq("guest_browser_id", guestBrowserId);
    } else {
      return NextResponse.json({ vendors: [] });
    }

    cartQuery = cartQuery.eq("status", "active").is("registry_id", null);

    const { data: carts, error: cartError } = await cartQuery;
    if (cartError || !carts?.length) {
      return NextResponse.json({ vendors: [] });
    }

    const cartIds = carts.map((c) => c.id);

    const { data: items, error: itemsError } = await adminClient
      .from("cart_items")
      .select(
        "id, product_id, cart_id, quantity, price, total_price, variation, product:products(id, name, price, service_charge, images, product_code, stock_qty, weight_kg, product_type, is_shippable, vendor_id, vendor:vendors(id, slug, business_name, logo_url))"
      )
      .in("cart_id", cartIds)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("Failed to fetch cart details:", itemsError);
      return NextResponse.json({ vendors: [] });
    }

    // Group items by vendor
    const vendorMap = new Map();
    for (const item of items || []) {
      const vendor = item.product?.vendor;
      if (!vendor) continue;
      const key = vendor.slug;
      if (!vendorMap.has(key)) {
        vendorMap.set(key, {
          vendor: {
            id: vendor.id,
            slug: vendor.slug,
            name: vendor.business_name,
            logo: vendor.logo_url,
          },
          items: [],
          subtotal: 0,
        });
      }
      const group = vendorMap.get(key);
      const image =
        Array.isArray(item.product?.images) && item.product.images.length > 0
          ? item.product.images[0]
          : null;
      const itemData = {
        cartItemId: item.id,
        productId: item.product_id,
        cartId: item.cart_id,
        name: item.product?.name,
        image,
        price: Number(item.price || item.product?.price || 0),
        quantity: item.quantity,
        totalPrice: Number(item.total_price || 0),
        variation: item.variation,
        stock: item.product?.stock_qty,
        weight_kg: item.product?.weight_kg ?? null,
        product_type: item.product?.product_type || "physical",
        is_shippable: item.product?.is_shippable !== false,
      };
      group.items.push(itemData);
      group.subtotal += itemData.totalPrice;
    }

    return NextResponse.json({
      vendors: Array.from(vendorMap.values()),
    });
  } catch (error) {
    console.error("Failed to fetch cart details:", error);
    return NextResponse.json({ vendors: [] });
  }
}
