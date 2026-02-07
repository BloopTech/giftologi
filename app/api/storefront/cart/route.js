import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import { unstable_cache } from "next/cache";

const normalizeVariations = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((variation) => variation && typeof variation === "object");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((variation) => variation && typeof variation === "object")
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildVariationKey = (variation, index) =>
  String(variation?.id || variation?.sku || index);

const findVariationByKey = (variations, key) => {
  if (!key) return null;
  return variations.find((variation, index) => buildVariationKey(variation, index) === key) || null;
};

const buildVariationPayload = (variation, key) => {
  if (!variation || typeof variation !== "object") return null;
  return {
    key,
    id: variation?.id ?? null,
    sku: variation?.sku ?? null,
    label: variation?.label ?? null,
    color: variation?.color ?? null,
    size: variation?.size ?? null,
    price: variation?.price ?? null,
  };
};

const fetchCartPayload = async (adminClient, cartId) => {
  if (!cartId) return null;
  const { data: items, error } = await adminClient
    .from("cart_items")
    .select(
      "id, cart_id, product_id, registry_item_id, quantity, price, total_price, variation, wrapping, gift_wrap_option_id, created_at, product:products(id, name, price, weight_kg, service_charge, stock_qty, images, product_code, vendor_id, vendor:vendors(id, slug, business_name, logo, logo_url))"
    )
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const normalizedItems = Array.isArray(items) ? items : [];
  const subtotal = normalizedItems.reduce(
    (sum, item) => sum + Number(item?.total_price || 0),
    0
  );

  return {
    items: normalizedItems,
    subtotal,
  };
};

const CART_CACHE_SECONDS = 30;

const getCachedCartPayload = unstable_cache(
  async (cartId) => {
    if (!cartId) return null;
    const adminClient = createAdminClient();
    return fetchCartPayload(adminClient, cartId);
  },
  ["cart-payload"],
  { revalidate: CART_CACHE_SECONDS }
);

const resolveCartOwner = async (supabase, guestBrowserId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    return { hostId: user.id, guestId: null };
  }

  if (guestBrowserId) {
    return { hostId: null, guestId: guestBrowserId };
  }

  return { hostId: null, guestId: null };
};

const resolveVendorId = async (adminClient, vendorId, vendorSlug) => {
  if (vendorId) return vendorId;
  if (!vendorSlug) return null;
  const { data: vendor } = await adminClient
    .from("vendors")
    .select("id")
    .eq("slug", vendorSlug)
    .maybeSingle();
  return vendor?.id || null;
};

const mergeGuestCartIntoHost = async (adminClient, vendorId, hostId, guestId) => {
  if (!vendorId || !hostId || !guestId) return;

  const [{ data: hostCart }, { data: guestCart }] = await Promise.all([
    adminClient
      .from("carts")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("host_id", hostId)
      .eq("status", "active")
      .maybeSingle(),
    adminClient
      .from("carts")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("guest_browser_id", guestId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!guestCart?.id) return;

  if (!hostCart?.id) {
    await adminClient
      .from("carts")
      .update({ host_id: hostId, guest_browser_id: null, updated_at: new Date().toISOString() })
      .eq("id", guestCart.id);
    return;
  }

  if (hostCart.id === guestCart.id) return;

  const { data: guestItems } = await adminClient
    .from("cart_items")
    .select(
      "id, product_id, quantity, price, variation, registry_item_id, wrapping, gift_wrap_option_id"
    )
    .eq("cart_id", guestCart.id);

  if (Array.isArray(guestItems) && guestItems.length > 0) {
    for (const item of guestItems) {
      let itemQuery = adminClient
        .from("cart_items")
        .select("id, quantity, registry_item_id, wrapping, gift_wrap_option_id")
        .eq("cart_id", hostCart.id)
        .eq("product_id", item.product_id);

      const variationKey = item?.variation?.key;
      if (variationKey) {
        itemQuery = itemQuery.eq("variation->>key", variationKey);
      } else {
        itemQuery = itemQuery.is("variation", null);
      }

      if (item?.gift_wrap_option_id) {
        itemQuery = itemQuery.eq("gift_wrap_option_id", item.gift_wrap_option_id);
      } else {
        itemQuery = itemQuery.is("gift_wrap_option_id", null);
      }

      const { data: existingItem } = await itemQuery.maybeSingle();
      const nextQuantity = (existingItem?.quantity || 0) + (item.quantity || 0);
      const unitPrice = Number(item.price || 0);

      if (existingItem?.id) {
        await adminClient
          .from("cart_items")
          .update({
            quantity: nextQuantity,
            total_price: unitPrice * nextQuantity,
            registry_item_id:
              existingItem.registry_item_id ?? item.registry_item_id ?? null,
            wrapping: existingItem.wrapping ?? item.wrapping ?? false,
            gift_wrap_option_id:
              existingItem.gift_wrap_option_id ??
              item.gift_wrap_option_id ??
              null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id);
      } else {
        await adminClient.from("cart_items").insert({
          cart_id: hostCart.id,
          product_id: item.product_id,
          registry_item_id: item.registry_item_id ?? null,
          quantity: item.quantity || 1,
          price: unitPrice,
          total_price: unitPrice * (item.quantity || 1),
          variation: item.variation ?? null,
          wrapping: item.wrapping ?? false,
          gift_wrap_option_id: item.gift_wrap_option_id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  await adminClient.from("cart_items").delete().eq("cart_id", guestCart.id);
  await adminClient.from("carts").delete().eq("id", guestCart.id);
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendor_id");
    const vendorSlug = searchParams.get("vendor_slug");
    const registryId = searchParams.get("registry_id");
    const guestBrowserId = searchParams.get("guest_browser_id");

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const owner = await resolveCartOwner(supabase, guestBrowserId);
    if (!owner.hostId && !owner.guestId) {
      return NextResponse.json({ message: "Owner not found" }, { status: 401 });
    }

    // Registry carts are keyed by registry_id; storefront carts by vendor_id
    let cartQuery = adminClient
      .from("carts")
      .select("id, vendor_id, host_id, guest_browser_id, registry_id, status, currency")
      .eq("status", "active");

    if (registryId) {
      cartQuery = cartQuery.eq("registry_id", registryId);
    } else {
      const resolvedVendorId = await resolveVendorId(adminClient, vendorId, vendorSlug);
      if (!resolvedVendorId) {
        return NextResponse.json({ cart: null, items: [], subtotal: 0 }, { status: 200 });
      }
      if (owner.hostId && guestBrowserId) {
        await mergeGuestCartIntoHost(adminClient, resolvedVendorId, owner.hostId, guestBrowserId);
      }
      cartQuery = cartQuery.eq("vendor_id", resolvedVendorId);
    }

    if (owner.hostId) {
      cartQuery = cartQuery.eq("host_id", owner.hostId);
    } else {
      cartQuery = cartQuery.eq("guest_browser_id", owner.guestId);
    }

    const { data: cart } = await cartQuery.maybeSingle();

    if (!cart?.id) {
      return NextResponse.json({ cart: null, items: [], subtotal: 0 }, { status: 200 });
    }

    const payload = await getCachedCartPayload(cart.id);

    return NextResponse.json(
      {
        cart,
        items: payload?.items || [],
        subtotal: payload?.subtotal || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load cart:", error);
    return NextResponse.json({ message: "Failed to load cart" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      vendorId,
      vendorSlug,
      productId,
      registryItemId,
      registryId,
      quantity = 1,
      variationKey,
      variation,
      guestBrowserId,
    } = body || {};

    if (!productId) {
      return NextResponse.json({ message: "productId is required" }, { status: 400 });
    }

    const safeQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const owner = await resolveCartOwner(supabase, guestBrowserId);
    if (!owner.hostId && !owner.guestId) {
      return NextResponse.json({ message: "Owner not found" }, { status: 401 });
    }

    // For registry carts we still resolve the vendor to validate the product,
    // but the cart itself is keyed by registry_id (not vendor_id) so items from
    // multiple vendors can live in one cart.
    const resolvedVendorId = await resolveVendorId(adminClient, vendorId, vendorSlug);
    if (!resolvedVendorId) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    if (!registryId && owner.hostId && guestBrowserId) {
      await mergeGuestCartIntoHost(adminClient, resolvedVendorId, owner.hostId, guestBrowserId);
    }

    let productQuery = adminClient
      .from("products")
      .select(
        "id, vendor_id, price, service_charge, stock_qty, variations, status, active"
      )
      .eq("id", productId)
      .eq("status", "approved")
      .eq("active", true);

    // For non-registry carts, validate product belongs to the vendor
    if (!registryId) {
      productQuery = productQuery.eq("vendor_id", resolvedVendorId);
    }

    const { data: product, error: productError } = await productQuery.single();

    if (productError || !product) {
      return NextResponse.json({ message: "Product not available" }, { status: 404 });
    }

    if (product.stock_qty < safeQuantity) {
      return NextResponse.json(
        { message: `Only ${product.stock_qty} items available.` },
        { status: 400 }
      );
    }

    const variations = normalizeVariations(product.variations);
    const matchedVariation = findVariationByKey(variations, variationKey);
    const variationPayload = matchedVariation
      ? buildVariationPayload(matchedVariation, variationKey)
      : buildVariationPayload(variation, variationKey);

    const variationPrice = Number(matchedVariation?.price);
    const serviceCharge = Number(product.service_charge || 0);
    const basePrice = Number(product.price);
    const baseWithCharge = Number.isFinite(basePrice)
      ? basePrice + serviceCharge
      : serviceCharge;
    const unitPrice = Number.isFinite(variationPrice)
      ? variationPrice + serviceCharge
      : Number.isFinite(baseWithCharge)
      ? baseWithCharge
      : 0;

    // Registry carts are keyed by registry_id; storefront carts by vendor_id
    let cartQuery = adminClient
      .from("carts")
      .select("id")
      .eq("status", "active");

    if (registryId) {
      cartQuery = cartQuery.eq("registry_id", registryId);
    } else {
      cartQuery = cartQuery.eq("vendor_id", resolvedVendorId);
    }

    if (owner.hostId) {
      cartQuery = cartQuery.eq("host_id", owner.hostId);
    } else {
      cartQuery = cartQuery.eq("guest_browser_id", owner.guestId);
    }

    let { data: cart } = await cartQuery.maybeSingle();

    if (!cart?.id) {
      const { data: createdCart, error: cartError } = await adminClient
        .from("carts")
        .insert({
          vendor_id: registryId ? null : resolvedVendorId,
          host_id: owner.hostId,
          guest_browser_id: owner.guestId,
          registry_id: registryId || null,
          status: "active",
          currency: "GHS",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (cartError) {
        return NextResponse.json({ message: cartError.message }, { status: 500 });
      }

      cart = createdCart;
    }

    let itemQuery = adminClient
      .from("cart_items")
      .select("id, quantity, registry_item_id")
      .eq("cart_id", cart.id)
      .eq("product_id", productId);

    if (variationKey) {
      itemQuery = itemQuery.eq("variation->>key", variationKey);
    } else {
      itemQuery = itemQuery.is("variation", null);
    }

    const { data: existingItem } = await itemQuery.maybeSingle();

    if (existingItem?.id) {
      const nextQuantity = existingItem.quantity + safeQuantity;
      const { error: updateError } = await adminClient
        .from("cart_items")
        .update({
          quantity: nextQuantity,
          price: unitPrice,
          total_price: unitPrice * nextQuantity,
          variation: variationPayload,
          registry_item_id:
            existingItem.registry_item_id ?? registryItemId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      if (updateError) {
        return NextResponse.json({ message: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await adminClient.from("cart_items").insert({
        cart_id: cart.id,
        product_id: productId,
        registry_item_id: registryItemId ?? null,
        quantity: safeQuantity,
        price: unitPrice,
        total_price: unitPrice * safeQuantity,
        variation: variationPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        return NextResponse.json({ message: insertError.message }, { status: 500 });
      }
    }

    await adminClient
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cart.id);

    const payload = await fetchCartPayload(adminClient, cart.id);

    return NextResponse.json(
      {
        cart,
        items: payload?.items || [],
        subtotal: payload?.subtotal || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update cart:", error);
    return NextResponse.json({ message: "Failed to update cart" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { cartItemId, quantity = 1, wrapping, giftWrapOptionId } = body || {};

    if (!cartItemId) {
      return NextResponse.json({ message: "cartItemId is required" }, { status: 400 });
    }

    const nextQuantity = Math.max(0, Number.parseInt(quantity, 10) || 0);
    const adminClient = createAdminClient();

    if (nextQuantity === 0) {
      const { error: deleteError } = await adminClient
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (deleteError) {
        return NextResponse.json({ message: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { data: item, error: itemError } = await adminClient
      .from("cart_items")
      .select("id, price, wrapping")
      .eq("id", cartItemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ message: "Cart item not found" }, { status: 404 });
    }

    const nextWrapping =
      typeof wrapping === "boolean"
        ? wrapping
        : giftWrapOptionId
        ? true
        : item.wrapping;
    const updatePayload = {
      quantity: nextQuantity,
      total_price: Number(item.price || 0) * nextQuantity,
      updated_at: new Date().toISOString(),
      wrapping: nextWrapping,
    };

    if (typeof giftWrapOptionId !== "undefined") {
      updatePayload.gift_wrap_option_id = giftWrapOptionId || null;
    }

    const { error: updateError } = await adminClient
      .from("cart_items")
      .update(updatePayload)
      .eq("id", cartItemId);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to update cart item:", error);
    return NextResponse.json({ message: "Failed to update cart item" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { cartItemId, cartId } = body || {};
    const adminClient = createAdminClient();

    if (cartItemId) {
      const { error: deleteError } = await adminClient
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (deleteError) {
        return NextResponse.json({ message: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (cartId) {
      const { error: clearError } = await adminClient
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId);

      if (clearError) {
        return NextResponse.json({ message: clearError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ message: "Nothing to delete" }, { status: 400 });
  } catch (error) {
    console.error("Failed to delete cart item:", error);
    return NextResponse.json({ message: "Failed to delete cart item" }, { status: 500 });
  }
}
