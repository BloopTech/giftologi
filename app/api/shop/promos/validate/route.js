import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import { evaluatePromoCode, roundCurrency } from "@/app/utils/promos";
import { rateLimit, getClientIp } from "@/app/utils/rateLimit";
import { logSecurityEvent, SecurityEvents } from "@/app/utils/securityLogger";

const shopPromoLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

const buildCategoryMap = (rows = []) => {
  const map = new Map();
  rows.forEach((entry) => {
    if (!entry?.product_id || !entry?.category_id) return;
    const list = map.get(entry.product_id) || [];
    list.push(entry.category_id);
    map.set(entry.product_id, list);
  });
  return map;
};

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = shopPromoLimiter.check(ip);
    if (!allowed) {
      logSecurityEvent(SecurityEvents.RATE_LIMITED, { ip, route: "/api/shop/promos/validate" });
      return NextResponse.json(
        { valid: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { code, guestBrowserId, deviceFingerprint } = body || {};

    const trimmedCode = typeof code === "string" ? code.trim() : "";
    if (!trimmedCode) {
      return NextResponse.json(
        { valid: false, error: "Enter a promo code." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || null;

    if (!userId && !guestBrowserId) {
      return NextResponse.json(
        { valid: false, error: "Cart owner not found." },
        { status: 401 }
      );
    }

    // Fetch ALL active non-registry carts
    let cartQuery = adminClient
      .from("carts")
      .select("id, vendor_id")
      .eq("status", "active")
      .is("registry_id", null);

    cartQuery = userId
      ? cartQuery.eq("host_id", userId)
      : cartQuery.eq("guest_browser_id", guestBrowserId);

    const { data: carts } = await cartQuery;

    if (!carts?.length) {
      return NextResponse.json(
        { valid: false, error: "Your cart is empty." },
        { status: 404 }
      );
    }

    const cartIds = carts.map((c) => c.id);

    const { data: cartItems } = await adminClient
      .from("cart_items")
      .select("id, cart_id, product_id, quantity, total_price, gift_wrap_option_id")
      .in("cart_id", cartIds);

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { valid: false, error: "Your cart is empty." },
        { status: 404 }
      );
    }

    const productIds = cartItems.map((item) => item.product_id).filter(Boolean);
    const [{ data: products }, { data: productCategories }] = await Promise.all([
      adminClient.from("products").select("id, category_id, vendor_id, is_shippable, product_type").in("id", productIds),
      adminClient.from("product_categories").select("product_id, category_id").in("product_id", productIds),
    ]);

    const productMap = new Map((products || []).map((row) => [row.id, row]));
    const categoryMap = buildCategoryMap(productCategories || []);

    const wrapOptionIds = Array.from(
      new Set(cartItems.map((item) => item?.gift_wrap_option_id).filter(Boolean))
    );
    const { data: wrapOptions } = wrapOptionIds.length
      ? await adminClient.from("gift_wrap_options").select("id, fee").in("id", wrapOptionIds)
      : { data: [] };
    const wrapMap = new Map((wrapOptions || []).map((option) => [option.id, option]));

    const promoItems = [];
    cartItems.forEach((item) => {
      const product = productMap.get(item.product_id);
      const categoryIds = [
        ...(categoryMap.get(item.product_id) || []),
        product?.category_id,
      ].filter(Boolean);
      const quantityValue = Number(item?.quantity || 1);
      const wrapFee = Number(wrapMap.get(item?.gift_wrap_option_id)?.fee || 0);
      promoItems.push({
        itemId: item.id,
        productId: item.product_id,
        vendorId: product?.vendor_id || null,
        categoryIds,
        subtotal: Number(item?.total_price || 0),
        giftWrapFee: roundCurrency(wrapFee * quantityValue),
        quantity: quantityValue,
        isShippable: product?.is_shippable !== false,
        productType: product?.product_type || "physical",
      });
    });

    // Use first vendor for promo scope (promos are typically global or vendor-scoped)
    const firstVendorId = productMap.get(cartItems[0]?.product_id)?.vendor_id || null;

    const promoResult = await evaluatePromoCode({
      adminClient,
      code: trimmedCode,
      vendorId: firstVendorId,
      userId,
      guestBrowserId: userId ? null : guestBrowserId || null,
      deviceFingerprint: deviceFingerprint || null,
      items: promoItems,
    });

    if (!promoResult.valid) {
      return NextResponse.json(
        { valid: false, error: promoResult.error || "Promo code is invalid." },
        { status: 400 }
      );
    }

    const { promo, discount, discountedSubtotal, discountedGiftWrapFee } = promoResult;

    return NextResponse.json({
      valid: true,
      promo: {
        id: promo?.id || null,
        code: promo?.code || trimmedCode,
        scope: promo?.scope || null,
        percent_off: promo?.percent_off || 0,
      },
      discount: {
        totalDiscount: discount?.totalDiscount || 0,
        percentOff: discount?.percentOff || promo?.percent_off || 0,
        eligibleSubtotal: discount?.eligibleSubtotal || 0,
        productDiscountTotal: discount?.productDiscountTotal || 0,
        giftWrapDiscountTotal: discount?.giftWrapDiscountTotal || 0,
        items: discount?.items || [],
      },
      discountedSubtotal,
      discountedGiftWrapFee,
    });
  } catch (error) {
    console.error("Shop promo validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to validate promo code." },
      { status: 500 }
    );
  }
}
