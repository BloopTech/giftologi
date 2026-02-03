"use server";

import { createAdminClient, createClient } from "../../../utils/supabase/server";
import { randomBytes } from "crypto";

const EXPRESSPAY_SUBMIT_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/submit.php"
    : "https://sandbox.expresspaygh.com/api/submit.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

function generateOrderId() {
  return randomBytes(8).toString("hex");
}

export async function processStorefrontCheckout(prevState, formData) {
  try {
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
    const giftWrapOptionId = formData.get("giftWrapOptionId")?.trim() || null;

    const firstName = formData.get("firstName")?.trim();
    const lastName = formData.get("lastName")?.trim();
    const email = formData.get("email")?.trim();
    const phone = formData.get("phone")?.trim();
    const address = formData.get("address")?.trim();
    const city = formData.get("city")?.trim();
    const region = formData.get("region");
    const digitalAddress = formData.get("digitalAddress")?.trim();
    const notes = formData.get("notes")?.trim();

    // Validation
    if (!firstName || !lastName || !email || !phone || !address || !city) {
      return { success: false, error: "Please fill in all required fields." };
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

    if (cartMode && !user?.id) {
      return { success: false, error: "Please sign in to checkout your cart." };
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
    let orderDescription = "Purchase from Giftologi";

    if (cartMode) {
      if (guestBrowserId && user?.id) {
        await mergeGuestCartIntoHost(vendorId, user.id, guestBrowserId);
      }

      const { data: cart } = await adminClient
        .from("carts")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("host_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!cart?.id) {
        return { success: false, error: "Your cart is empty." };
      }

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
        .select("id, name, stock_qty, vendor_id, status, active")
        .in("id", productIds);

      const productMap = new Map((products || []).map((item) => [item.id, item]));

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
        if (!product || product.vendor_id !== vendorId || !product.active || product.status !== "approved") {
          return { success: false, error: "One or more items are unavailable." };
        }
        if ((product.stock_qty || 0) < (item.quantity || 0)) {
          return {
            success: false,
            error: `Only ${product.stock_qty} items available for ${product.name}.`,
          };
        }
        const itemTotal = Number(item.total_price || 0);
        computedSubtotal += itemTotal;
        const wrapOption = wrapOptionMap.get(item?.gift_wrap_option_id);
        const wrapFee = Number(wrapOption?.fee || 0);
        if (wrapFee) {
          giftWrapFee += wrapFee * (item.quantity || 0);
        }
        orderItemsPayload.push({
          order_id: null,
          product_id: item.product_id,
          vendor_id: vendorId,
          registry_item_id: item.registry_item_id ?? null,
          quantity: item.quantity,
          price: Number(item.price || 0),
          total_price: itemTotal,
          variation: item.variation ?? null,
          wrapping: item.wrapping ?? !!item.gift_wrap_option_id,
          gift_wrap_option_id: item.gift_wrap_option_id ?? null,
          created_at: new Date().toISOString(),
        });
      }

      orderDescription = `Purchase from Giftologi - ${cartItems.length} items`;

      await adminClient.from("cart_items").delete().eq("cart_id", cart.id);
      await adminClient.from("carts").delete().eq("id", cart.id);
    } else {
      // Verify product exists and has stock
      const { data: product, error: productError } = await adminClient
        .from("products")
        .select("id, name, price, stock_qty, vendor_id")
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
      const variationPrice = Number(selectedVariation?.price);
      const basePrice = Number(product.price);
      const unitPrice = Number.isFinite(variationPrice)
        ? variationPrice
        : Number.isFinite(basePrice)
        ? basePrice
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
      orderItemsPayload = [
        {
          order_id: null,
          product_id: productId,
          vendor_id: vendorId,
          quantity,
          price: unitPrice,
          total_price: Number.isFinite(computedSubtotal) ? computedSubtotal : subtotal,
          variation: selectedVariation,
          wrapping: !!giftWrapOptionId,
          gift_wrap_option_id: giftWrapOptionId || null,
          created_at: new Date().toISOString(),
        },
      ];
      orderDescription = `Purchase from Giftologi - ${product.name}`;
    }

    const computedTotal =
      computedSubtotal +
      (Number.isFinite(shippingFee) ? shippingFee : 0) +
      (Number.isFinite(giftWrapFee) ? giftWrapFee : 0);

    // Generate unique order code
    const orderId = generateOrderId();

    // Get the base URL for redirects
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://mygiftologi.com";
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
        order_type: "storefront",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return { success: false, error: "Failed to create order. Please try again." };
    }

    if (Number.isFinite(giftWrapFee)) {
      await adminClient.from("order_delivery_details").insert({
        order_id: order.id,
        gift_wrapping_fee: giftWrapFee,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Create order item
    const itemsToInsert = orderItemsPayload.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: orderItemError } = await adminClient
      .from("order_items")
      .insert(itemsToInsert);

    if (orderItemError) {
      console.error("Order item creation error:", orderItemError);
    }

    // Prepare ExpressPay request
    const expressPayParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      firstname: firstName,
      lastname: lastName,
      email: email,
      phonenumber: phone,
      username: email,
      currency: "GHS",
      amount: (Number.isFinite(computedTotal) ? computedTotal : total).toFixed(2),
      "order-id": orderId,
      "order-desc": orderDescription,
      "redirect-url": redirectUrl,
      "post-url": postUrl,
    });

    // Submit to ExpressPay
    const expressPayResponse = await fetch(EXPRESSPAY_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: expressPayParams.toString(),
    });

    const expressPayData = await expressPayResponse.json();

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

    // Store the token in the order
    await supabase
      .from("orders")
      .update({
        payment_token: expressPayData.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Return checkout URL
    const checkoutUrl =
      process.env.EXPRESSPAY_ENV === "live"
        ? `https://expresspaygh.com/api/checkout.php?token=${expressPayData.token}`
        : `https://sandbox.expresspaygh.com/api/checkout.php?token=${expressPayData.token}`;

    return {
      success: true,
      orderId: order.id,
      orderCode: orderId,
      token: expressPayData.token,
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
