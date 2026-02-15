import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import { evaluatePromoCode, roundCurrency } from "@/app/utils/promos";

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
    const body = await request.json();
    const {
      code,
      vendorId,
      cartMode,
      productId,
      quantity = 1,
      unitPrice,
      giftWrapOptionId,
      guestBrowserId,
      deviceFingerprint,
    } = body || {};

    const trimmedCode = typeof code === "string" ? code.trim() : "";
    if (!trimmedCode) {
      return NextResponse.json(
        { valid: false, error: "Enter a promo code." },
        { status: 400 }
      );
    }

    if (!vendorId) {
      return NextResponse.json(
        { valid: false, error: "Vendor is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || null;
    const promoItems = [];

    if (cartMode) {
      if (!userId && !guestBrowserId) {
        return NextResponse.json(
          { valid: false, error: "Cart owner not found." },
          { status: 401 }
        );
      }

      let cartQuery = adminClient
        .from("carts")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("status", "active");

      cartQuery = userId
        ? cartQuery.eq("host_id", userId)
        : cartQuery.eq("guest_browser_id", guestBrowserId);

      const { data: cart } = await cartQuery.maybeSingle();

      if (!cart?.id) {
        return NextResponse.json(
          { valid: false, error: "Your cart is empty." },
          { status: 404 }
        );
      }

      const { data: cartItems } = await adminClient
        .from("cart_items")
        .select("id, product_id, quantity, total_price, gift_wrap_option_id")
        .eq("cart_id", cart.id);

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return NextResponse.json(
          { valid: false, error: "Your cart is empty." },
          { status: 404 }
        );
      }

      const productIds = cartItems.map((item) => item.product_id).filter(Boolean);
      const [{ data: products }, { data: productCategories }] =
        await Promise.all([
          adminClient
            .from("products")
            .select("id, category_id, vendor_id, is_shippable, product_type")
            .in("id", productIds),
          adminClient
            .from("product_categories")
            .select("product_id, category_id")
            .in("product_id", productIds),
        ]);

      const productMap = new Map((products || []).map((row) => [row.id, row]));
      const categoryMap = buildCategoryMap(productCategories || []);

      const wrapOptionIds = Array.from(
        new Set(
          cartItems
            .map((item) => item?.gift_wrap_option_id)
            .filter(Boolean)
        )
      );

      const { data: wrapOptions } = wrapOptionIds.length
        ? await adminClient
            .from("gift_wrap_options")
            .select("id, fee")
            .in("id", wrapOptionIds)
        : { data: [] };

      const wrapMap = new Map(
        (wrapOptions || []).map((option) => [option.id, option])
      );

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
          vendorId: product?.vendor_id || vendorId,
          categoryIds,
          subtotal: Number(item?.total_price || 0),
          giftWrapFee: roundCurrency(wrapFee * quantityValue),
          quantity: quantityValue,
          isShippable: product?.is_shippable !== false,
          productType: product?.product_type || "physical",
        });
      });
    } else {
      if (!productId) {
        return NextResponse.json(
          { valid: false, error: "Product is required." },
          { status: 400 }
        );
      }

      const { data: product } = await adminClient
        .from("products")
        .select("id, category_id, vendor_id, is_shippable, product_type")
        .eq("id", productId)
        .eq("vendor_id", vendorId)
        .maybeSingle();

      if (!product?.id) {
        return NextResponse.json(
          { valid: false, error: "Product not found." },
          { status: 404 }
        );
      }

      const { data: productCategories } = await adminClient
        .from("product_categories")
        .select("category_id")
        .eq("product_id", productId);

      let giftWrapFee = 0;
      if (giftWrapOptionId) {
        const { data: wrapOption } = await adminClient
          .from("gift_wrap_options")
          .select("fee, active")
          .eq("id", giftWrapOptionId)
          .eq("active", true)
          .maybeSingle();
        giftWrapFee = Number(wrapOption?.fee || 0) * Number(quantity || 1);
      }

      const normalizedUnit = Number(unitPrice || 0);
      const subtotal = roundCurrency(normalizedUnit * Number(quantity || 1));
      const categoryIds = [
        ...(productCategories || []).map((entry) => entry?.category_id),
        product.category_id,
      ].filter(Boolean);

      promoItems.push({
        itemId: productId,
        productId,
        vendorId: product.vendor_id || vendorId,
        categoryIds,
        subtotal,
        giftWrapFee: roundCurrency(giftWrapFee),
        quantity: Number(quantity || 1),
        isShippable: product.is_shippable !== false,
        productType: product.product_type || "physical",
      });
    }

    const promoResult = await evaluatePromoCode({
      adminClient,
      code: trimmedCode,
      vendorId,
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

    const { promo, discount, discountedSubtotal, discountedGiftWrapFee } =
      promoResult;

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
      },
      discountedSubtotal,
      discountedGiftWrapFee,
    });
  } catch (error) {
    console.error("Promo validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to validate promo code." },
      { status: 500 }
    );
  }
}
