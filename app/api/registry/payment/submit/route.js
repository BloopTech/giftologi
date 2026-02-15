import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "../../../../utils/supabase/server";
import { evaluatePromoCode, roundCurrency } from "../../../../utils/promos";
import { computeShipmentWeight } from "../../../../utils/shipping/weights";
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

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      registryId,
      registryItemId,
      productId,
      quantity = 1,
      amount,
      currency = "GHS",
      gifterInfo,
      message,
      guestBrowserId,
      deviceFingerprint,
      shippingRegionId,
      promoCode,
    } = body;

    if (!registryId || !registryItemId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const buyerId = user?.id || null;

    // Verify registry and item exist
    const { data: registryItem, error: itemError } = await supabase
      .from("registry_items")
      .select(
        `
        id,
        quantity_needed,
        purchased_qty,
        registry:registries(
          id,
          title,
          registry_code
        ),
        product:products(
          id,
          name,
          price,
          weight_kg,
          service_charge,
          vendor_id,
          category_id,
          is_shippable,
          product_type
        )
      `
      )
      .eq("id", registryItemId)
      .eq("registry_id", registryId)
      .single();

    if (itemError || !registryItem) {
      return NextResponse.json(
        { error: "Registry item not found" },
        { status: 404 }
      );
    }

    let shippingRegion = null;
    if (shippingRegionId) {
      const { data: zoneById } = await supabaseAdmin
        .from("shipping_zones")
        .select("id, name, fee")
        .eq("id", shippingRegionId)
        .maybeSingle();
      shippingRegion = zoneById;

      if (!shippingRegion) {
        const { data: zoneByName } = await supabaseAdmin
          .from("shipping_zones")
          .select("id, name, fee")
          .eq("name", shippingRegionId)
          .maybeSingle();
        shippingRegion = zoneByName;
      }
    }

    const shippingFee = Number(shippingRegion?.fee) || 0;
    const basePrice = Number(registryItem?.product?.price);
    const serviceCharge = Number(registryItem?.product?.service_charge || 0);
    const unitPrice = Number.isFinite(basePrice)
      ? basePrice + serviceCharge
      : serviceCharge;
    const safeUnitPrice = Number.isFinite(unitPrice)
      ? unitPrice
      : Number(amount);
    let computedSubtotal = Number.isFinite(safeUnitPrice)
      ? safeUnitPrice * quantity
      : Number(amount);
    let giftWrapFee = 0;
    let promoSummary = null;
    const totalPieces = Number(quantity || 0);
    const totalWeight = computeShipmentWeight([
      {
        quantity,
        weight_kg: registryItem?.product?.weight_kg,
      },
    ]);
    const shippingRegionName =
      shippingRegion?.name || shippingRegionId || null;

    const { data: productCategories } = await supabaseAdmin
      .from("product_categories")
      .select("category_id")
      .eq("product_id", registryItem?.product?.id);
    const categoryIds = [
      ...(productCategories || []).map((entry) => entry?.category_id),
      registryItem?.product?.category_id,
    ].filter(Boolean);

    if (promoCode) {
      const promoResult = await evaluatePromoCode({
        adminClient: supabaseAdmin,
        code: promoCode,
        vendorId: registryItem?.product?.vendor_id || null,
        userId: buyerId,
        guestBrowserId,
        deviceFingerprint: deviceFingerprint || null,
        items: [
          {
            itemId: registryItemId,
            productId: registryItem?.product?.id,
            vendorId: registryItem?.product?.vendor_id || null,
            categoryIds,
            subtotal: computedSubtotal,
            giftWrapFee,
            quantity,
            isShippable: registryItem?.product?.is_shippable !== false,
            productType: registryItem?.product?.product_type || "physical",
          },
        ],
      });

      if (!promoResult.valid) {
        return NextResponse.json(
          { error: promoResult.error || "Promo code is invalid." },
          { status: 400 }
        );
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

      computedSubtotal = roundCurrency(discountedSubtotal);
      giftWrapFee = roundCurrency(discountedGiftWrapFee);
    }

    const computedTotal = computedSubtotal + shippingFee + giftWrapFee;
    const totalAmount = Number.isFinite(computedTotal)
      ? computedTotal
      : Number(amount);

    // Check if item is still available
    const remaining =
      (registryItem.quantity_needed || 0) - (registryItem.purchased_qty || 0);
    if (remaining < quantity) {
      return NextResponse.json(
        { error: "Requested quantity exceeds available quantity" },
        { status: 400 }
      );
    }

    // Generate unique order code
    const orderId = generateOrderId();

    // Get the base URL for redirects
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    const redirectUrl = `${origin}/api/registry/payment/callback`;
    const postUrl = `${origin}/api/registry/payment/webhook`;

    // Create pending order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_code: orderId,
        registry_id: registryId,
        buyer_id: buyerId,
        guest_browser_id: buyerId ? null : guestBrowserId || null,
        device_fingerprint: deviceFingerprint || null,
        status: "pending",
        total_amount: totalAmount,
        currency,
        shipping_region: shippingRegionName,
        shipping_fee: shippingFee,
        gifter_firstname: gifterInfo?.firstName || null,
        gifter_lastname: gifterInfo?.lastName || null,
        gifter_email: gifterInfo?.email || null,
        gifter_phone: gifterInfo?.phone || null,
        gifter_anonymous: gifterInfo?.stayAnonymous || false,
        gifter_message: message || null,
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
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("checkout_context").insert({
      order_id: order.id,
      total_weight_kg: Number.isFinite(totalWeight) ? totalWeight : 0,
      pieces: Number.isFinite(totalPieces) ? totalPieces : 0,
      created_at: new Date().toISOString(),
    });

    // Create order item
    const adjustedUnitPrice = Number(quantity || 1)
      ? computedSubtotal / Number(quantity || 1)
      : Number.isFinite(safeUnitPrice)
      ? safeUnitPrice
      : 0;
    const { error: orderItemError } = await supabaseAdmin.from("order_items").insert({
      order_id: order.id,
      registry_item_id: registryItemId,
      product_id: productId,
      quantity,
      price: roundCurrency(adjustedUnitPrice),
      total_price: roundCurrency(computedSubtotal),
      gift_message: message || null,
      created_at: new Date().toISOString(),
    });

    if (orderItemError) {
      console.error("Order item creation error:", orderItemError);
    }

    // Prepare ExpressPay request
    const expressPayParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      firstname: gifterInfo?.firstName || "Guest",
      lastname: gifterInfo?.lastName || "Gifter",
      email: gifterInfo?.email || `guest-${orderId}@giftologi.com`,
      phonenumber: gifterInfo?.phone || "",
      username: gifterInfo?.email || `guest-${orderId}@giftologi.com`,
      currency,
      amount: totalAmount.toFixed(2),
      "order-id": orderId,
      "order-desc": `Gift purchase for ${registryItem.registry?.title || "Registry"}`,
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
      await supabaseAdmin
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      return NextResponse.json(
        {
          error: "Payment initialization failed",
          details: expressPayData.message || "Unknown error",
        },
        { status: 400 }
      );
    }

    if (promoSummary?.id) {
      await supabaseAdmin.from("promo_redemptions").insert({
        promo_id: promoSummary.id,
        order_id: order.id,
        user_id: buyerId,
        guest_browser_id: buyerId ? null : guestBrowserId || null,
        device_fingerprint: deviceFingerprint || null,
        amount: promoSummary.discount || 0,
        meta: {
          code: promoSummary.code,
          percent_off: promoSummary.percent,
        },
        created_at: new Date().toISOString(),
      });

      await supabaseAdmin
        .from("promo_codes")
        .update({
          usage_count: (promoSummary.usageCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", promoSummary.id);
    }

    // Store the token in the order
    await supabaseAdmin
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

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderCode: orderId,
      token: expressPayData.token,
      checkoutUrl,
    });
  } catch (error) {
    console.error("Payment submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
