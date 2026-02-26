"use server";

import { createAdminClient, createClient } from "../../utils/supabase/server";
import { evaluatePromoCode, roundCurrency } from "../../utils/promos";
import { calculateAramexRate } from "../../utils/shipping/aramex";
import { computeShipmentWeight } from "../../utils/shipping/weights";
import {
  createExpressPaySdkClient,
  resolveExpressPayCheckoutUrl,
} from "../../utils/payments/expresspay";
import { randomBytes } from "crypto";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";

function generateOrderId() {
  return randomBytes(8).toString("hex");
}

async function resolveAppOrigin() {
  const fallbackOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.CRON_BASE_URL ||
    "https://mygiftologi.com";

  const isLocalHost = (value) =>
    /(^|:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(
      String(value || "")
    );

  try {
    const headerStore = await headers();
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = forwardedHost || headerStore.get("host");
    if (host) {
      const protocol =
        headerStore.get("x-forwarded-proto") ||
        (isLocalHost(host) ? "http" : "https");

      return `${protocol}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // Ignore header resolution issues and fall back to env config.
  }

  return String(fallbackOrigin).replace(/\/$/, "");
}

export async function processShopCheckout(prevState, formData) {
  try {
    const expressPaySdk = createExpressPaySdkClient();
    const subtotal = parseFloat(formData.get("subtotal") || "0");
    const shippingFee = parseFloat(formData.get("shippingFee") || "0");
    const shippingRegion = formData.get("shippingRegion");
    const total = parseFloat(formData.get("total") || "0");
    const guestBrowserId = formData.get("guestBrowserId")?.trim() || null;
    const deviceFingerprint = formData.get("deviceFingerprint")?.trim() || null;
    const promoCode = formData.get("promoCode")?.trim() || "";

    const firstName = formData.get("firstName")?.trim();
    const lastName = formData.get("lastName")?.trim();
    const email = formData.get("email")?.trim();
    const phone = formData.get("phone")?.trim();
    const address = formData.get("address")?.trim();
    const city = formData.get("city")?.trim();
    const region = formData.get("region");
    const digitalAddress = formData.get("digitalAddress")?.trim();
    const notes = formData.get("notes")?.trim();

    if (!firstName || !lastName || !email || !phone) {
      return { success: false, error: "Please fill in all required contact fields." };
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id && !guestBrowserId) {
      return { success: false, error: "Unable to identify your cart. Please try again." };
    }

    // Fetch ALL active non-registry carts for this user
    let cartQuery = adminClient
      .from("carts")
      .select("id, vendor_id")
      .eq("status", "active")
      .is("registry_id", null);

    if (user?.id) {
      cartQuery = cartQuery.eq("host_id", user.id);
    } else {
      cartQuery = cartQuery.eq("guest_browser_id", guestBrowserId);
    }

    const { data: carts, error: cartError } = await cartQuery;

    if (cartError || !carts?.length) {
      return { success: false, error: "Your cart is empty." };
    }

    const cartIds = carts.map((c) => c.id);

    // Fetch ALL cart items across all carts
    const { data: cartItems, error: itemsError } = await adminClient
      .from("cart_items")
      .select(
        "id, cart_id, product_id, quantity, price, total_price, variation, registry_item_id, wrapping, gift_wrap_option_id"
      )
      .in("cart_id", cartIds);

    if (itemsError || !Array.isArray(cartItems) || cartItems.length === 0) {
      return { success: false, error: "Your cart is empty." };
    }

    // Fetch all products referenced by cart items
    const productIds = cartItems.map((item) => item.product_id).filter(Boolean);
    const { data: products } = await adminClient
      .from("products")
      .select("id, name, price, service_charge, stock_qty, vendor_id, status, active, category_id, weight_kg, product_type, is_shippable")
      .in("id", productIds);

    const productMap = new Map((products || []).map((p) => [p.id, p]));

    // Fetch vendors to check verification status and commission rates for payout snapshots
    const vendorIds = Array.from(new Set((products || []).map((p) => p.vendor_id).filter(Boolean)));
    const { data: vendorRows } = vendorIds.length
      ? await adminClient.from("vendors").select("id, verified, commission_rate").in("id", vendorIds)
      : { data: [] };
    const vendorMap = new Map((vendorRows || []).map((v) => [v.id, v]));

    // Fetch product categories for promo evaluation
    const { data: productCategories } = await adminClient
      .from("product_categories")
      .select("product_id, category_id")
      .in("product_id", productIds);

    const productCategoryMap = new Map();
    (productCategories || []).forEach((entry) => {
      if (!entry?.product_id || !entry?.category_id) return;
      const list = productCategoryMap.get(entry.product_id) || [];
      list.push(entry.category_id);
      productCategoryMap.set(entry.product_id, list);
    });

    // Fetch gift wrap options if any items have them
    const giftWrapOptionIds = Array.from(
      new Set(cartItems.map((item) => item?.gift_wrap_option_id).filter(Boolean))
    );
    const { data: wrapOptions } = giftWrapOptionIds.length
      ? await adminClient.from("gift_wrap_options").select("id, fee").in("id", giftWrapOptionIds)
      : { data: [] };
    const wrapOptionMap = new Map((wrapOptions || []).map((o) => [o.id, o]));

    let orderItemsPayload = [];
    let computedSubtotal = 0;
    let giftWrapFee = 0;
    let promoItems = [];
    let totalPieces = 0;
    const weightItems = [];

    for (const item of cartItems) {
      const product = productMap.get(item.product_id);
      if (!product || !product.active || product.status !== "approved") {
        return {
          success: false,
          error: `"${product?.name || "A product"}" is no longer available.`,
        };
      }
      const productVendor = vendorMap.get(product.vendor_id);
      if (!productVendor || !productVendor.verified) {
        return {
          success: false,
          error: `"${product.name}" is from a vendor that is no longer available.`,
        };
      }
      if ((product.stock_qty || 0) < (item.quantity || 0)) {
        return {
          success: false,
          error: `Only ${product.stock_qty} items available for "${product.name}".`,
        };
      }

      const itemTotal = Number(item.total_price || 0);
      computedSubtotal += itemTotal;

      const wrapOption = wrapOptionMap.get(item?.gift_wrap_option_id);
      const wrapFee = Number(wrapOption?.fee || 0);
      if (wrapFee) {
        giftWrapFee += wrapFee * (item.quantity || 0);
      }

      const categoryIds = [
        ...(productCategoryMap.get(item.product_id) || []),
        product.category_id,
      ].filter(Boolean);

      totalPieces += Number(item.quantity || 0);
      if (product.is_shippable !== false) {
        weightItems.push({
          quantity: item.quantity || 0,
          weight_kg: product.weight_kg ?? null,
        });
      }

      promoItems.push({
        itemId: item.id,
        productId: item.product_id,
        vendorId: product.vendor_id || null,
        categoryIds,
        subtotal: itemTotal,
        giftWrapFee: wrapFee * (item.quantity || 0),
        quantity: item.quantity || 1,
        isShippable: product.is_shippable !== false,
        productType: product.product_type || "physical",
      });

      const shopServiceCharge = Number(product.service_charge || 0);
      const shopUnitPrice = Number(item.price || 0);
      const shopOriginalPrice = Math.max(0, shopUnitPrice - shopServiceCharge);
      const shopVendor = vendorMap.get(product.vendor_id);
      orderItemsPayload.push({
        order_id: null,
        product_id: item.product_id,
        vendor_id: product.vendor_id,
        registry_item_id: item.registry_item_id ?? null,
        quantity: item.quantity,
        price: shopUnitPrice,
        total_price: itemTotal,
        original_price: shopOriginalPrice,
        service_charge_snapshot: shopServiceCharge,
        commission_rate_snapshot: shopVendor?.commission_rate ?? null,
        variation: item.variation ?? null,
        wrapping: item.wrapping ?? !!item.gift_wrap_option_id,
        gift_wrap_option_id: item.gift_wrap_option_id ?? null,
        created_at: new Date().toISOString(),
        cart_item_id: item.id,
      });
    }

    const totalWeight = computeShipmentWeight(weightItems);

    // Detect whether any items require shipping
    const hasShippableItems = orderItemsPayload.some((item) => {
      const p = productMap.get(item.product_id);
      return p?.is_shippable !== false;
    });

    // Shippable orders require shipping address
    if (hasShippableItems && (!address || !city)) {
      return { success: false, error: "Please provide a shipping address for shippable products." };
    }

    // Promo code evaluation (use first vendor for promo scope — promos are global anyway)
    let promoSummary = null;
    if (promoCode) {
      const firstVendorId = orderItemsPayload[0]?.vendor_id || null;
      const promoResult = await evaluatePromoCode({
        adminClient,
        code: promoCode,
        vendorId: firstVendorId,
        userId: user?.id || null,
        guestBrowserId,
        deviceFingerprint,
        items: promoItems,
      });

      if (!promoResult.valid) {
        return { success: false, error: promoResult.error };
      }

      const { promo, discount, discountedSubtotal, discountedGiftWrapFee } = promoResult;
      promoSummary = {
        id: promo?.id || null,
        code: promo?.code || promoCode,
        scope: promo?.scope || null,
        percent: promo?.percent_off || 0,
        discount: discount?.totalDiscount || 0,
        usageCount: promo?.usage_count || 0,
      };

      const promoItemsById = new Map(
        (discount?.items || []).map((item) => [item.itemId, item])
      );
      orderItemsPayload = orderItemsPayload.map((item) => {
        const promoItem = promoItemsById.get(item.cart_item_id);
        if (!promoItem?.eligible) return item;
        const safeQuantity = Number(item.quantity || 1);
        const discountedLine = Number(promoItem.discountedSubtotal || 0);
        const nextUnitPrice = safeQuantity
          ? discountedLine / safeQuantity
          : Number(item.price || 0);
        return {
          ...item,
          price: roundCurrency(nextUnitPrice),
          total_price: roundCurrency(discountedLine),
        };
      });

      computedSubtotal = roundCurrency(discountedSubtotal);
      giftWrapFee = roundCurrency(discountedGiftWrapFee);
    }

    // Clean up all carts
    for (const cartId of cartIds) {
      await adminClient.from("cart_items").delete().eq("cart_id", cartId);
      await adminClient.from("carts").delete().eq("id", cartId);
    }

    const effectiveShippingFee = !hasShippableItems ? 0 : (Number.isFinite(shippingFee) ? shippingFee : 0);
    const computedTotal =
      computedSubtotal +
      effectiveShippingFee +
      (Number.isFinite(giftWrapFee) ? giftWrapFee : 0);

    const orderId = generateOrderId();
    const origin = await resolveAppOrigin();
    const redirectUrl = `${origin}/shop/checkout/callback`;
    const postUrl = `${origin}/api/storefront/checkout/webhook`;

    // Create order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        order_code: orderId,
        status: "pending",
        total_amount: Number.isFinite(computedTotal) ? computedTotal : total,
        currency: "GHS",
        buyer_id: user?.id || null,
        buyer_firstname: firstName,
        buyer_lastname: lastName,
        buyer_email: email,
        buyer_phone: phone,
        shipping_address: address,
        shipping_city: city,
        shipping_region: shippingRegion,
        shipping_digital_address: digitalAddress,
        shipping_fee: effectiveShippingFee,
        delivery_notes: notes,
        order_type: "storefront",
        registry_id: null,
        guest_browser_id: !user?.id ? guestBrowserId : null,
        device_fingerprint: deviceFingerprint || null,
        promo_id: promoSummary?.id || null,
        promo_code: promoSummary?.code || null,
        promo_scope: promoSummary?.scope || null,
        promo_percent: promoSummary?.percent || null,
        promo_discount: promoSummary?.discount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Shop checkout order creation error:", orderError);
      return { success: false, error: "Failed to create order. Please try again." };
    }

    if (Number.isFinite(giftWrapFee) || effectiveShippingFee > 0) {
      await adminClient.from("order_delivery_details").insert({
        order_id: order.id,
        gift_wrapping_fee: Number.isFinite(giftWrapFee) ? giftWrapFee : 0,
        outbound_shipping_fee: effectiveShippingFee,
        courier_partner: effectiveShippingFee > 0 ? "aramex" : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await adminClient.from("checkout_context").insert({
      order_id: order.id,
      total_weight_kg: Number.isFinite(totalWeight) ? totalWeight : 0,
      pieces: Number.isFinite(totalPieces) ? totalPieces : 0,
      created_at: new Date().toISOString(),
    });

    const itemsToInsert = orderItemsPayload.map(({ cart_item_id, ...item }) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: orderItemError } = await adminClient
      .from("order_items")
      .insert(itemsToInsert);

    if (orderItemError) {
      console.error("Shop checkout order item creation error:", orderItemError);
    }

    const orderDescription = `Giftologi Shop - ${cartItems.length} item${cartItems.length > 1 ? "s" : ""}`;
    const expressPayData = await expressPaySdk.submit({
      firstName,
      lastName,
      email,
      phone,
      username: email,
      currency: "GHS",
      amount: (Number.isFinite(computedTotal) ? computedTotal : total).toFixed(2),
      orderId,
      orderDescription,
      redirectUrl,
      postUrl,
    });

    if (expressPayData.status !== 1) {
      await supabase
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      return {
        success: false,
        error: expressPayData.message || "Payment initialization failed. Please try again.",
      };
    }

    if (promoSummary?.id) {
      await adminClient.from("promo_redemptions").insert({
        promo_id: promoSummary.id,
        order_id: order.id,
        user_id: user?.id || null,
        guest_browser_id: user?.id ? null : guestBrowserId || null,
        device_fingerprint: deviceFingerprint || null,
        amount: promoSummary.discount || 0,
        meta: {
          code: promoSummary.code,
          percent_off: promoSummary.percent,
        },
        created_at: new Date().toISOString(),
      });

      await adminClient
        .from("promo_codes")
        .update({
          usage_count: (promoSummary.usageCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", promoSummary.id);
    }

    await supabase
      .from("orders")
      .update({
        payment_token: expressPayData.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const checkoutUrl =
      resolveExpressPayCheckoutUrl(expressPayData) ||
      `/shop/checkout/callback?order-id=${encodeURIComponent(orderId)}`;

    return {
      success: true,
      orderId: order.id,
      orderCode: orderId,
      token: expressPayData.token,
      payableAmount: Number(
        (Number.isFinite(computedTotal) ? computedTotal : total).toFixed(2)
      ),
      currency: "GHS",
      checkoutUrl,
    };
  } catch (error) {
    console.error("Shop checkout error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

const RATE_CACHE_SECONDS = 60;

const getCachedRateQuote = unstable_cache(
  async ({ origin, destination, shipment, reference }) =>
    calculateAramexRate({ origin, destination, shipment, reference }),
  ["shop-aramex-rate-quote"],
  { revalidate: RATE_CACHE_SECONDS }
);

export async function getShopAramexRateQuote({ origin, destination, shipment, reference } = {}) {
  try {
    if (!origin || !destination) {
      return { success: false, error: "origin and destination are required" };
    }

    const result = await getCachedRateQuote({ origin, destination, shipment, reference });

    if (result.hasErrors || !Number.isFinite(result.totalAmount || 0)) {
      return {
        success: false,
        error: "Aramex rate lookup failed",
        details: result.message || "No rate returned",
      };
    }

    return {
      success: true,
      amount: result.totalAmount,
      currency: result.currency || "GHS",
      message: result.message || null,
    };
  } catch (error) {
    console.error("Shop Aramex rate lookup error:", error);
    return {
      success: false,
      error: error?.message || "Internal server error",
    };
  }
}
