"use server";

import { createAdminClient, createClient } from "../../../utils/supabase/server";
import { evaluatePromoCode, roundCurrency } from "../../../utils/promos";
import { calculateAramexRate } from "../../../utils/shipping/aramex";
import { computeShipmentWeight } from "../../../utils/shipping/weights";
import {
  createExpressPaySdkClient,
  resolveExpressPayCheckoutUrl,
} from "../../../utils/payments/expresspay";
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

export async function processStorefrontCheckout(prevState, formData) {
  try {
    const expressPaySdk = createExpressPaySdkClient();
    const vendorId = formData.get("vendorId");
    const vendorSlug = formData.get("vendorSlug");
    const productId = formData.get("productId");
    const quantity = parseInt(formData.get("quantity") || "1", 10);
    const subtotal = parseFloat(formData.get("subtotal") || "0");
    const shippingFee = parseFloat(formData.get("shippingFee") || "0");
    const shippingRegion = formData.get("shippingRegion");
    const total = parseFloat(formData.get("total") || "0");
    const variantKey = formData.get("variantKey")?.trim();
    const variationRaw = formData.get("variation")?.trim();
    const cartMode = formData.get("cartMode") === "1";
    const guestBrowserId = formData.get("guestBrowserId")?.trim() || null;
    const deviceFingerprint = formData.get("deviceFingerprint")?.trim() || null;
    const giftWrapOptionId = formData.get("giftWrapOptionId")?.trim() || null;
    const promoCode = formData.get("promoCode")?.trim() || "";
    const registryId = formData.get("registryId")?.trim() || null;
    const giftMessage = formData.get("giftMessage")?.trim() || null;

    const firstName = formData.get("firstName")?.trim();
    const lastName = formData.get("lastName")?.trim();
    const email = formData.get("email")?.trim();
    const phone = formData.get("phone")?.trim();
    const address = formData.get("address")?.trim();
    const city = formData.get("city")?.trim();
    const region = formData.get("region");
    const digitalAddress = formData.get("digitalAddress")?.trim();
    const notes = formData.get("notes")?.trim();
    const hasShippableItems = formData.get("hasShippableItems") !== "0";

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return { success: false, error: "Please fill in all required fields." };
    }
    if (hasShippableItems && (!address || !city)) {
      return { success: false, error: "Shipping address is required for shippable items." };
    }

    if (!vendorId || (!cartMode && !productId) || !total) {
      return { success: false, error: "Invalid order data." };
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const parseVariationPayload = (raw) => {
      if (!raw || typeof raw !== "string") return null;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch {
        return null;
      }
    };

    if (cartMode && !user?.id && !guestBrowserId) {
      return { success: false, error: "Unable to identify your cart. Please try again." };
    }

    const mergeGuestCartIntoHost = async (vendorIdValue, hostId, guestId) => {
      if (!vendorIdValue || !hostId || !guestId) return;

      const [{ data: hostCart }, { data: guestCart }] = await Promise.all([
        adminClient
          .from("carts")
          .select("id")
          .eq("vendor_id", vendorIdValue)
          .eq("host_id", hostId)
          .eq("status", "active")
          .maybeSingle(),
        adminClient
          .from("carts")
          .select("id")
          .eq("vendor_id", vendorIdValue)
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

    let orderItemsPayload = [];
    let computedSubtotal = 0;
    let giftWrapFee = 0;
    let promoItems = [];
    let orderDescription = "Purchase from Giftologi";
    let promoSummary = null;
    let cartIdForCleanup = null;
    let totalPieces = 0;
    let totalWeight = 0;

    if (cartMode) {
      if (!registryId && guestBrowserId && user?.id) {
        await mergeGuestCartIntoHost(vendorId, user.id, guestBrowserId);
      }

      // Registry carts keyed by registry_id; storefront carts by vendor_id
      let cartQuery = adminClient
        .from("carts")
        .select("id")
        .eq("status", "active");

      if (registryId) {
        cartQuery = cartQuery.eq("registry_id", registryId);
      } else {
        cartQuery = cartQuery.eq("vendor_id", vendorId);
      }

      if (user?.id) {
        cartQuery = cartQuery.eq("host_id", user.id);
      } else {
        cartQuery = cartQuery.eq("guest_browser_id", guestBrowserId);
      }

      const { data: cart } = await cartQuery.maybeSingle();

      if (!cart?.id) {
        return { success: false, error: "Your cart is empty." };
      }

      cartIdForCleanup = cart.id;

      const { data: cartItems } = await adminClient
        .from("cart_items")
        .select(
          "id, product_id, quantity, price, total_price, variation, registry_item_id, wrapping, gift_wrap_option_id"
        )
        .eq("cart_id", cart.id);

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return { success: false, error: "Your cart is empty." };
      }

      const productIds = cartItems.map((item) => item.product_id).filter(Boolean);
      const { data: products } = await adminClient
        .from("products")
        .select(
          "id, name, price, service_charge, stock_qty, variations, vendor_id, status, active, category_id, weight_kg, sale_price, sale_starts_at, sale_ends_at, is_shippable, product_type"
        )
        .in("id", productIds);

      const productMap = new Map((products || []).map((item) => [item.id, item]));
      const weightItems = [];

      // Fetch vendor commission rates for payout snapshots
      const cartVendorIds = Array.from(new Set((products || []).map((p) => p.vendor_id).filter(Boolean)));
      const vendorCommissionMap = new Map();
      if (cartVendorIds.length) {
        const { data: cartVendors } = await adminClient
          .from("vendors")
          .select("id, commission_rate")
          .in("id", cartVendorIds);
        (cartVendors || []).forEach((v) => vendorCommissionMap.set(v.id, v.commission_rate));
      }

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

      const giftWrapOptionIds = Array.from(
        new Set(
          cartItems
            .map((item) => item?.gift_wrap_option_id)
            .filter(Boolean)
        )
      );
      const { data: wrapOptions } = giftWrapOptionIds.length
        ? await adminClient
            .from("gift_wrap_options")
            .select("id, fee")
            .in("id", giftWrapOptionIds)
        : { data: [] };
      const wrapOptionMap = new Map(
        (wrapOptions || []).map((option) => [option.id, option])
      );

      for (const item of cartItems) {
        const product = productMap.get(item.product_id);
        if (!product || (!registryId && product.vendor_id !== vendorId) || !product.active || product.status !== "approved") {
          return { success: false, error: "One or more items are unavailable." };
        }
        if ((product.stock_qty || 0) < (item.quantity || 0)) {
          return {
            success: false,
            error: `Only ${product.stock_qty} items available for ${product.name}.`,
          };
        }
        // Validate variation-specific stock for cart items
        const cartItemVariation = item.variation;
        if (cartItemVariation && typeof cartItemVariation === "object" && Array.isArray(product.variations)) {
          const varKey = cartItemVariation.key || cartItemVariation.sku || cartItemVariation.label;
          if (varKey) {
            const matchedVar = product.variations.find((v, idx) => {
              const vKey = String(v?.id || v?.sku || v?.label || idx);
              return vKey === String(varKey);
            });
            if (matchedVar && typeof matchedVar.stock_qty === "number" && matchedVar.stock_qty < (item.quantity || 0)) {
              return {
                success: false,
                error: `Only ${matchedVar.stock_qty} items available for ${product.name} (${matchedVar.label || "variation"}).`,
              };
            }
          }
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
          vendorId: product.vendor_id || vendorId,
          categoryIds,
          subtotal: itemTotal,
          giftWrapFee: wrapFee * (item.quantity || 0),
          quantity: item.quantity || 1,
          isShippable: product.is_shippable !== false,
          productType: product.product_type || "physical",
        });
        const cartServiceCharge = Number(product.service_charge || 0);
        const cartUnitPrice = Number(item.price || 0);
        const cartOriginalPrice = Math.max(0, cartUnitPrice - cartServiceCharge);
        const cartItemVendorId = product.vendor_id || vendorId;
        orderItemsPayload.push({
          order_id: null,
          product_id: item.product_id,
          vendor_id: cartItemVendorId,
          registry_item_id: item.registry_item_id ?? null,
          quantity: item.quantity,
          price: cartUnitPrice,
          total_price: itemTotal,
          original_price: cartOriginalPrice,
          service_charge_snapshot: cartServiceCharge,
          commission_rate_snapshot: vendorCommissionMap.get(cartItemVendorId) ?? null,
          variation: item.variation ?? null,
          wrapping: item.wrapping ?? !!item.gift_wrap_option_id,
          gift_wrap_option_id: item.gift_wrap_option_id ?? null,
          created_at: new Date().toISOString(),
          cart_item_id: item.id,
        });
      }

      totalWeight = computeShipmentWeight(weightItems);
      orderDescription = `Purchase from Giftologi - ${cartItems.length} items`;
    } else {
      // Verify product exists and has stock
      const { data: product, error: productError } = await adminClient
        .from("products")
        .select(
          "id, name, price, service_charge, stock_qty, variations, vendor_id, category_id, weight_kg, sale_price, sale_starts_at, sale_ends_at, is_shippable, product_type"
        )
        .eq("id", productId)
        .eq("vendor_id", vendorId)
        .eq("status", "approved")
        .eq("active", true)
        .single();

      if (productError || !product) {
        return { success: false, error: "Product not found or unavailable." };
      }

      if (product.stock_qty < quantity) {
        return {
          success: false,
          error: `Only ${product.stock_qty} items available in stock.`,
        };
      }

      const selectedVariation = parseVariationPayload(variationRaw);

      // Validate variation-specific stock
      if (selectedVariation && Array.isArray(product.variations)) {
        const varKey = selectedVariation.key || selectedVariation.sku || selectedVariation.label;
        if (varKey) {
          const matchedVar = product.variations.find((v, idx) => {
            const vKey = String(v?.id || v?.sku || v?.label || idx);
            return vKey === String(varKey);
          });
          if (matchedVar && typeof matchedVar.stock_qty === "number" && matchedVar.stock_qty < quantity) {
            return {
              success: false,
              error: `Only ${matchedVar.stock_qty} items available for ${matchedVar.label || "this variation"}.`,
            };
          }
        }
      }
      const variationPrice = Number(selectedVariation?.price);
      const basePrice = Number(product.price);
      const serviceCharge = Number(product.service_charge || 0);
      const baseWithCharge = Number.isFinite(basePrice)
        ? basePrice + serviceCharge
        : serviceCharge;

      // Apply sale price if active
      let effectiveBaseWithCharge = baseWithCharge;
      const rawSalePrice = Number(product.sale_price);
      if (Number.isFinite(rawSalePrice) && rawSalePrice > 0) {
        const now = Date.now();
        const sStarts = product.sale_starts_at ? new Date(product.sale_starts_at).getTime() : null;
        const sEnds = product.sale_ends_at ? new Date(product.sale_ends_at).getTime() : null;
        const saleActive =
          (!sStarts || !Number.isNaN(sStarts) && now >= sStarts) &&
          (!sEnds || !Number.isNaN(sEnds) && now <= sEnds);
        if (saleActive) {
          effectiveBaseWithCharge = rawSalePrice + serviceCharge;
        }
      }

      const unitPrice = Number.isFinite(variationPrice)
        ? variationPrice + serviceCharge
        : Number.isFinite(effectiveBaseWithCharge)
        ? effectiveBaseWithCharge
        : 0;
      computedSubtotal = unitPrice * quantity;
      if (giftWrapOptionId) {
        const { data: wrapOption, error: wrapError } = await adminClient
          .from("gift_wrap_options")
          .select("id, fee, active")
          .eq("id", giftWrapOptionId)
          .eq("active", true)
          .maybeSingle();

        if (wrapError) {
          return { success: false, error: "Failed to load gift wrap option." };
        }

        if (!wrapOption) {
          return { success: false, error: "Selected gift wrap option is invalid." };
        }

        giftWrapFee = Number(wrapOption.fee || 0) * quantity;
      }
      const { data: productCategories } = await adminClient
        .from("product_categories")
        .select("category_id")
        .eq("product_id", productId);
      const categoryIds = [
        ...(productCategories || []).map((entry) => entry?.category_id),
        product.category_id,
      ].filter(Boolean);
      promoItems = [
        {
          itemId: productId,
          productId,
          vendorId: product.vendor_id || vendorId,
          categoryIds,
          subtotal: computedSubtotal,
          giftWrapFee,
          quantity,
          isShippable: product.is_shippable !== false,
          productType: product.product_type || "physical",
        },
      ];
      // Fetch vendor commission rate for payout snapshot
      const { data: directVendor } = await adminClient
        .from("vendors")
        .select("id, commission_rate")
        .eq("id", vendorId)
        .single();
      const directOriginalPrice = Math.max(0, unitPrice - serviceCharge);
      orderItemsPayload = [
        {
          order_id: null,
          product_id: productId,
          vendor_id: vendorId,
          quantity,
          price: unitPrice,
          total_price: Number.isFinite(computedSubtotal) ? computedSubtotal : subtotal,
          original_price: directOriginalPrice,
          service_charge_snapshot: serviceCharge,
          commission_rate_snapshot: directVendor?.commission_rate ?? null,
          variation: selectedVariation,
          wrapping: !!giftWrapOptionId,
          gift_wrap_option_id: giftWrapOptionId || null,
          created_at: new Date().toISOString(),
          cart_item_id: productId,
        },
      ];
      totalPieces = Number(quantity || 0);
      totalWeight = computeShipmentWeight([
        { quantity, weight_kg: product.weight_kg ?? null },
      ]);
      orderDescription = `Purchase from Giftologi - ${product.name}`;
    }

    if (promoCode) {
      const promoResult = await evaluatePromoCode({
        adminClient,
        code: promoCode,
        vendorId,
        userId: user?.id || null,
        guestBrowserId,
        deviceFingerprint,
        items: promoItems,
      });

      if (!promoResult.valid) {
        return { success: false, error: promoResult.error };
      }

      const { promo, discount, discountedSubtotal, discountedGiftWrapFee } =
        promoResult;
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
        if (!promoItem?.eligible) {
          return item;
        }
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

    if (cartIdForCleanup) {
      await adminClient.from("cart_items").delete().eq("cart_id", cartIdForCleanup);
      await adminClient.from("carts").delete().eq("id", cartIdForCleanup);
    }

    const computedTotal =
      computedSubtotal +
      (Number.isFinite(shippingFee) ? shippingFee : 0) +
      (Number.isFinite(giftWrapFee) ? giftWrapFee : 0);

    // Generate unique order code
    const orderId = generateOrderId();

    // Get the base URL for redirects
    const origin = await resolveAppOrigin();
    const redirectUrl = `${origin}/storefront/${vendorSlug}/checkout/callback`;
    const postUrl = `${origin}/api/storefront/checkout/webhook`;

    // Create order in database
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
        shipping_fee: shippingFee,
        delivery_notes: notes,
        order_type: registryId ? "registry" : "storefront",
        registry_id: registryId || null,
        gift_message: giftMessage || null,
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
      console.error("Order creation error:", orderError);
      return { success: false, error: "Failed to create order. Please try again." };
    }

    if (Number.isFinite(giftWrapFee) || Number.isFinite(shippingFee)) {
      await adminClient.from("order_delivery_details").insert({
        order_id: order.id,
        gift_wrapping_fee: Number.isFinite(giftWrapFee) ? giftWrapFee : 0,
        outbound_shipping_fee: Number.isFinite(shippingFee) ? shippingFee : 0,
        courier_partner: Number.isFinite(shippingFee) ? "aramex" : null,
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

    // Create order item
    const itemsToInsert = orderItemsPayload.map(({ cart_item_id, ...item }) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: orderItemError } = await adminClient
      .from("order_items")
      .insert(itemsToInsert);

    if (orderItemError) {
      console.error("Order item creation error:", orderItemError);
    }

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
      // Update order status to failed
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

    // Store the token in the order
    await supabase
      .from("orders")
      .update({
        payment_token: expressPayData.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const checkoutUrl =
      resolveExpressPayCheckoutUrl(expressPayData) ||
      `/storefront/${vendorSlug}/checkout/callback?order-id=${encodeURIComponent(orderId)}`;

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
    console.error("Checkout error:", error);
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
  ["aramex-rate-quote"],
  { revalidate: RATE_CACHE_SECONDS }
);

export async function getAramexRateQuote({ origin, destination, shipment, reference } = {}) {
  try {
    if (!origin || !destination) {
      return { success: false, error: "origin and destination are required" };
    }

    const result = await getCachedRateQuote({
      origin,
      destination,
      shipment,
      reference,
    });

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
    console.error("Aramex rate lookup error:", error);
    return {
      success: false,
      error: error?.message || "Internal server error",
    };
  }
}
