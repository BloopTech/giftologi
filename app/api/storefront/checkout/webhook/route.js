import { NextResponse } from "next/server";
import {
  createAdminClient,
} from "../../../../utils/supabase/server";
import { buildAramexTrackingUrl, createAramexShipment } from "../../../../utils/shipping/aramex";
import { computeShipmentWeight } from "../../../../utils/shipping/weights";
import { dispatchNotification } from "../../../../utils/notificationService";
import {
  hasExpressPayAmountMismatch,
  resolveExpressPayMethod,
  mapExpressPayResultToOrderStatus,
  queryExpressPayTransaction,
  TERMINAL_ORDER_STATUSES,
} from "../../../../utils/payments/expresspay";

export async function POST(request) {
  try {
    const body = await request.formData();
    const tokenFromWebhook = body.get("token");
    const orderIdFromWebhook = body.get("order-id");

    if (!tokenFromWebhook && !orderIdFromWebhook) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const admin = createAdminClient();

    // Find order by token or order code
    let order = null;

    if (tokenFromWebhook) {
      const { data } = await admin
        .from("orders")
        .select(
          "id, order_code, status, payment_token, payment_method, total_amount, currency"
        )
        .eq("payment_token", tokenFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order && orderIdFromWebhook) {
      const { data } = await admin
        .from("orders")
        .select(
          "id, order_code, status, payment_token, payment_method, total_amount, currency"
        )
        .eq("order_code", orderIdFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error("Storefront webhook order not found:", {
        orderId: orderIdFromWebhook,
      });
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Skip if already in terminal state
    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const queryToken = tokenFromWebhook || order.payment_token;
    if (!queryToken) {
      console.error("Storefront webhook missing query token for order:", order.id);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const queryData = await queryExpressPayTransaction(queryToken);
    const paymentMethod =
      resolveExpressPayMethod(queryData) || order?.payment_method || null;

    const newStatus = mapExpressPayResultToOrderStatus(
      queryData.result,
      order.status,
      queryData["result-text"]
    );
    const paymentReference =
      queryData["transaction-id"] || queryData.token || queryToken || null;
    let finalizedStatus = newStatus;
    let mismatchMeta = null;

    if (newStatus === "paid") {
      const hasAmountMismatch = hasExpressPayAmountMismatch({
        expectedAmount: order.total_amount,
        expectedCurrency: order.currency,
        receivedAmount: queryData.amount,
        receivedCurrency: queryData.currency,
      });

      if (hasAmountMismatch) {
        finalizedStatus = "pending";
        mismatchMeta = {
          amount_mismatch: true,
          expected_amount: order.total_amount,
          expected_currency: order.currency,
          received_amount: queryData.amount,
          received_currency: queryData.currency,
        };
      }
    }

    const updatePayload = {
      status: finalizedStatus,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payment_response: mismatchMeta
        ? { ...queryData, ...mismatchMeta }
        : queryData,
      updated_at: new Date().toISOString(),
    };

    let paidTransitioned = false;

    if (finalizedStatus === "paid") {
      const { data: updatedOrder, error: updateError } = await admin
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .neq("status", "paid")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Failed to update order:", updateError);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      paidTransitioned = Boolean(updatedOrder?.id);
    } else {
      const { error: updateError } = await admin
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      }
    }

    if (finalizedStatus !== "paid" || !paidTransitioned) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Persist payment record early so admin/payment reports are complete even
    // when subsequent fulfillment side-effects fail.
    await admin.from("order_payments").upsert(
      {
        order_id: order.id,
        provider: "expresspay",
        method: paymentMethod,
        amount: queryData.amount || 0,
        currency: queryData.currency || "GHS",
        provider_ref: paymentReference,
        status: "completed",
        meta: queryData,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "order_id,provider,provider_ref",
        ignoreDuplicates: true,
      }
    );

    // If payment successful, update product stock and create payment record
    // Get order items
    const { data: orderItems } = await admin
      .from("order_items")
      .select("product_id, quantity, registry_item_id, vendor_id, variation")
      .eq("order_id", order.id);

    // Update stock for each product + registry purchased quantities
    if (orderItems) {
      for (const item of orderItems) {
        // Get current stock and variations, then decrement
        const { data: product } = await admin
          .from("products")
          .select("stock_qty, variations")
          .eq("id", item.product_id)
          .maybeSingle();

        if (product) {
          const nowIso = new Date().toISOString();
          const newStock = Math.max(0, (product.stock_qty || 0) - item.quantity);
          const updateProductPayload = { stock_qty: newStock, updated_at: nowIso };

          // Also decrement variation stock_qty if a variation was purchased
          const itemVariation = item.variation;
          if (itemVariation && typeof itemVariation === "object" && Array.isArray(product.variations)) {
            const varKey = itemVariation.key || itemVariation.sku || itemVariation.label;
            if (varKey) {
              const updatedVariations = product.variations.map((v, idx) => {
                const vKey = String(v?.id || v?.sku || v?.label || idx);
                if (vKey === String(varKey) && typeof v?.stock_qty === "number") {
                  return { ...v, stock_qty: Math.max(0, v.stock_qty - item.quantity) };
                }
                return v;
              });
              updateProductPayload.variations = updatedVariations;
            }
          }

          await admin
            .from("products")
            .update(updateProductPayload)
            .eq("id", item.product_id);
        }

        if (item.registry_item_id) {
          const { data: registryItem } = await admin
            .from("registry_items")
            .select("purchased_qty")
            .eq("id", item.registry_item_id)
            .maybeSingle();

          if (registryItem) {
            const newPurchasedQty =
              (registryItem.purchased_qty || 0) + (item.quantity || 0);

            await admin
              .from("registry_items")
              .update({
                purchased_qty: newPurchasedQty,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.registry_item_id);
          }
        }
      }
    }

    // Notify vendors about the new order
    try {
      const vendorIds = Array.from(
        new Set(orderItems?.map((item) => item?.vendor_id).filter(Boolean))
      );

      if (vendorIds.length) {
        const { data: vendorRows } = await admin
          .from("vendors")
          .select("id, profiles_id, business_name, email")
          .in("id", vendorIds);

        for (const vendor of vendorRows || []) {
          if (!vendor?.profiles_id) continue;

          await dispatchNotification({
            client: admin,
            recipientId: vendor.profiles_id,
            recipientRole: "vendor",
            eventType: "new_order",
            message: `New order received${
              vendor.business_name ? ` for ${vendor.business_name}` : ""
            }.`,
            link: "/dashboard/v/orders",
            data: {
              order_id: order.id,
              order_code: order.order_code || null,
              vendor_id: vendor.id,
            },
            vendorId: vendor.id,
            emailPayload: vendor.email
              ? {
                  templateSlug: "vendor_new_order",
                  to: vendor.email,
                  variables: {
                    vendor_name: vendor.business_name || "Vendor",
                    amount: String(queryData.amount || ""),
                    order_reference: order.order_code || "",
                    dashboard_url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/dashboard/v/orders`,
                  },
                }
              : undefined,
          });
        }
      }
    } catch (error) {
      console.error("Failed to notify vendors:", error);
    }

    try {
      const vendorId = orderItems?.find((item) => item?.vendor_id)?.vendor_id;
      const { data: checkoutContext } = await admin
        .from("checkout_context")
        .select("total_weight_kg, pieces")
        .eq("order_id", order.id)
        .maybeSingle();
      const fallbackPieces = orderItems?.reduce(
        (sum, item) => sum + (Number(item?.quantity) || 0),
        0
      );
      const totalPieces = Number.isFinite(Number(checkoutContext?.pieces))
        ? Number(checkoutContext.pieces)
        : fallbackPieces;
      let totalWeight = Number(checkoutContext?.total_weight_kg);

      if (!Number.isFinite(totalWeight)) {
        const productIds = Array.from(
          new Set(orderItems?.map((item) => item?.product_id).filter(Boolean))
        );
        const { data: productRows } = productIds.length
          ? await admin
              .from("products")
              .select("id, weight_kg")
              .in("id", productIds)
          : { data: [] };
        const productWeightMap = new Map(
          (productRows || []).map((row) => [row.id, row.weight_kg])
        );
        totalWeight = computeShipmentWeight(
          (orderItems || []).map((item) => ({
            quantity: item?.quantity,
            weight_kg: productWeightMap.get(item?.product_id),
          }))
        );
      }

      if (vendorId) {
        const { data: existingShipment } = await admin
          .from("order_shipments")
          .select("id")
          .eq("order_id", order.id)
          .eq("provider", "aramex")
          .maybeSingle();

        if (!existingShipment?.id) {
          const { data: orderDetails } = await admin
            .from("orders")
            .select(
              "order_code, buyer_firstname, buyer_lastname, buyer_email, buyer_phone, shipping_address, shipping_city, shipping_region, shipping_digital_address, shipping_fee, total_amount"
            )
            .eq("id", order.id)
            .single();
          const { data: vendor } = await admin
            .from("vendors")
            .select(
              "business_name, phone, email, address_street, digital_address, address_city, address_state, address_country"
            )
            .eq("id", vendorId)
            .single();

          if (orderDetails && vendor) {
            const consigneeName = [
              orderDetails.buyer_firstname,
              orderDetails.buyer_lastname,
            ]
              .filter(Boolean)
              .join(" ")
              .trim();
            const shipmentResult = await createAramexShipment({
              shipper: {
                name: vendor.business_name || "Giftologi Vendor",
                company: vendor.business_name || "",
                phone: vendor.phone || "",
                email: vendor.email || "",
                address: vendor.address_street || "",
                address2: vendor.digital_address || "",
                city: vendor.address_city || "",
                state: vendor.address_state || "",
                postalCode: "",
                countryCode: vendor.address_country || "GH",
              },
              consignee: {
                name: consigneeName || "Recipient",
                company: "",
                phone: orderDetails.buyer_phone || "",
                email: orderDetails.buyer_email || "",
                address: orderDetails.shipping_address || "",
                address2: orderDetails.shipping_digital_address || "",
                city: orderDetails.shipping_city || "",
                state: orderDetails.shipping_region || "",
                postalCode: "",
                countryCode: vendor.address_country || "GH",
              },
              shipment: {
                weight: Math.max(1, totalWeight || totalPieces || 1),
                numberOfPieces: Math.max(1, totalPieces || 1),
                goodsValue: Number(orderDetails.total_amount || 0),
                currency: "GHS",
                description: `Order ${orderDetails.order_code}`,
                originCountryCode: vendor.address_country || "GH",
              },
              reference: orderDetails.order_code,
            });

            if (!shipmentResult.hasErrors && shipmentResult.shipmentNumber) {
              const trackingUrl = buildAramexTrackingUrl(
                shipmentResult.shipmentNumber
              );
              await admin.from("order_shipments").insert({
                order_id: order.id,
                provider: "aramex",
                status: "created",
                tracking_number: shipmentResult.shipmentNumber,
                tracking_url: trackingUrl,
                label_url: shipmentResult.labelUrl || null,
                shipment_reference: orderDetails.order_code,
                cost: orderDetails.shipping_fee || null,
                currency: "GHS",
                metadata: { source: "expresspay_webhook" },
                last_status_at: new Date().toISOString(),
              });

              await admin
                .from("order_delivery_details")
                .update({
                  courier_partner: "aramex",
                  tracking_id: shipmentResult.shipmentNumber,
                  delivery_status: "created",
                  updated_at: new Date().toISOString(),
                })
                .eq("order_id", order.id);
            } else if (shipmentResult.hasErrors) {
              console.error(
                "Aramex shipment error:",
                shipmentResult.message || shipmentResult.raw
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Aramex auto-shipment error:", error);
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
