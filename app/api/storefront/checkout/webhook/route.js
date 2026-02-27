import { NextResponse } from "next/server";
import {
  createAdminClient,
} from "../../../../utils/supabase/server";
import { buildAramexTrackingUrl, createAramexShipment } from "../../../../utils/shipping/aramex";
import { computeShipmentWeight } from "../../../../utils/shipping/weights";
import { dispatchNotification } from "../../../../utils/notificationService";
import { logSecurityEvent, SecurityEvents } from "../../../../utils/securityLogger";
import {
  hasExpressPayAmountMismatch,
  resolveExpressPayMethod,
  mapExpressPayResultToOrderStatus,
  queryExpressPayTransaction,
  TERMINAL_ORDER_STATUSES,
} from "../../../../utils/payments/expresspay";

const WEBHOOK_SOURCE = "/api/storefront/checkout/webhook";
const PAYMENT_PROVIDER = "expresspay";

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const extractWebhookMethodHints = (formData) => {
  if (!formData || typeof formData.get !== "function") return {};

  const keys = [
    "payment-option-type",
    "payment_option_type",
    "payment-method",
    "payment_method",
    "method",
    "channel",
    "network",
    "type",
  ];

  return keys.reduce((acc, key) => {
    const value = formData.get(key);
    if (value === null || typeof value === "undefined") return acc;
    const text = String(value).trim();
    if (!text) return acc;
    acc[key] = text;
    return acc;
  }, {});
};

function buildWebhookDebug({
  outcome,
  stage = null,
  tokenSuffix = null,
  orderStatus = null,
  queryToken = null,
  paymentReference = null,
}) {
  return {
    source: WEBHOOK_SOURCE,
    outcome,
    stage,
    token_suffix: tokenSuffix,
    query_token_suffix: queryToken ? String(queryToken).slice(-6) : null,
    payment_reference: paymentReference || null,
    order_status: orderStatus,
    received_at: new Date().toISOString(),
  };
}

async function persistWebhookOutcome(
  admin,
  order,
  debugMeta,
  paymentResponseBase = null
) {
  if (!admin || !order?.id || !debugMeta) return;

  const mergedPaymentResponse = {
    ...asObject(paymentResponseBase ?? order.payment_response),
    webhook_debug: debugMeta,
  };

  const { error } = await admin
    .from("orders")
    .update({
      payment_response: mergedPaymentResponse,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (!error) {
    order.payment_response = mergedPaymentResponse;
  }
}

export async function POST(request) {
  try {
    logSecurityEvent(SecurityEvents.WEBHOOK_RECEIVED, {
      route: WEBHOOK_SOURCE,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    const body = await request.formData();
    const tokenFromWebhook = body.get("token");
    const orderIdFromWebhook = body.get("order-id");
    const webhookMethodHints = extractWebhookMethodHints(body);
    const tokenSuffix = tokenFromWebhook
      ? String(tokenFromWebhook).slice(-6)
      : null;

    if (!tokenFromWebhook && !orderIdFromWebhook) {
      return NextResponse.json(
        { status: "ok", outcome: "ignored_missing_params" },
        { status: 200 }
      );
    }

    const admin = createAdminClient();

    // Find order by token or order code
    let order = null;

    if (tokenFromWebhook) {
      const { data } = await admin
        .from("orders")
        .select(
          "id, order_code, status, payment_token, payment_method, payment_reference, total_amount, currency, payment_response"
        )
        .eq("payment_token", tokenFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order && orderIdFromWebhook) {
      const { data } = await admin
        .from("orders")
        .select(
          "id, order_code, status, payment_token, payment_method, payment_reference, total_amount, currency, payment_response"
        )
        .eq("order_code", orderIdFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error("Storefront webhook order not found:", {
        orderId: orderIdFromWebhook,
      });
      return NextResponse.json(
        {
          status: "ok",
          outcome: "ignored_order_not_found",
          orderCode: orderIdFromWebhook || null,
          tokenSuffix,
        },
        { status: 200 }
      );
    }

    // Skip if already in terminal state
    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      const terminalPaymentResponse = asObject(order.payment_response);
      let enrichedTerminalPaymentResponse = terminalPaymentResponse?.provider
        ? terminalPaymentResponse
        : { ...terminalPaymentResponse, provider: PAYMENT_PROVIDER };

      let terminalOutcome = "ignored_terminal_status";
      let terminalStage = "pre_query";
      let terminalPaymentReference = order.payment_reference || null;
      let terminalQueryToken = tokenFromWebhook || order.payment_token || null;

      // Safe reconciliation path: terminal "paid" orders may still be missing
      // payment method/provider metadata or order_payments rows.
      if (
        order.status === "paid" &&
        terminalQueryToken &&
        (!order.payment_method || !terminalPaymentResponse?.provider)
      ) {
        try {
          const terminalQueryData = await queryExpressPayTransaction(
            terminalQueryToken
          );
          const terminalPaymentMethod =
            resolveExpressPayMethod({
              ...terminalQueryData,
              ...webhookMethodHints,
            }) ||
            order.payment_method ||
            null;
          terminalPaymentReference =
            terminalQueryData["transaction-id"] ||
            terminalQueryData.token ||
            terminalPaymentReference ||
            terminalQueryToken;

          const terminalPaymentResponsePayload = {
            ...terminalQueryData,
            ...webhookMethodHints,
            provider: PAYMENT_PROVIDER,
          };
          enrichedTerminalPaymentResponse = terminalPaymentResponsePayload;

          const terminalUpdatePayload = {
            payment_reference: terminalPaymentReference,
            payment_response: terminalPaymentResponsePayload,
            updated_at: new Date().toISOString(),
          };

          if (terminalPaymentMethod) {
            terminalUpdatePayload.payment_method = terminalPaymentMethod;
          }

          const { error: terminalUpdateError } = await admin
            .from("orders")
            .update(terminalUpdatePayload)
            .eq("id", order.id);

          if (terminalUpdateError) {
            console.error(
              "Terminal reconciliation failed to update order payment fields:",
              terminalUpdateError
            );
          }

          if (terminalPaymentMethod && terminalPaymentReference) {
            const { error: terminalUpsertError } = await admin
              .from("order_payments")
              .upsert(
                {
                  order_id: order.id,
                  provider: PAYMENT_PROVIDER,
                  method: terminalPaymentMethod,
                  amount: terminalQueryData.amount || 0,
                  currency: terminalQueryData.currency || "GHS",
                  provider_ref: terminalPaymentReference,
                  status: "completed",
                  meta: terminalPaymentResponsePayload,
                  created_at: new Date().toISOString(),
                },
                {
                  onConflict: "order_id,provider,provider_ref",
                  ignoreDuplicates: true,
                }
              );

            if (terminalUpsertError) {
              console.error(
                "Terminal reconciliation failed to upsert order payment:",
                terminalUpsertError
              );
            }
          }

          terminalOutcome = "ignored_terminal_status_reconciled";
          terminalStage = "terminal_reconcile";
          terminalQueryToken = terminalQueryToken || null;
        } catch (terminalReconcileError) {
          console.error(
            "Terminal reconciliation query failed:",
            terminalReconcileError
          );
        }
      }

      await persistWebhookOutcome(
        admin,
        order,
        buildWebhookDebug({
          outcome: terminalOutcome,
          stage: terminalStage,
          tokenSuffix,
          orderStatus: order.status,
          queryToken: terminalQueryToken,
          paymentReference: terminalPaymentReference,
        }),
        enrichedTerminalPaymentResponse
      );

      return NextResponse.json(
        {
          status: "ok",
          outcome: terminalOutcome,
          orderId: order.id,
          orderStatus: order.status,
        },
        { status: 200 }
      );
    }

    const queryToken = tokenFromWebhook || order.payment_token;
    if (!queryToken) {
      console.error("Storefront webhook missing query token for order:", order.id);
      await persistWebhookOutcome(
        admin,
        order,
        buildWebhookDebug({
          outcome: "ignored_missing_query_token",
          stage: "pre_query",
          tokenSuffix,
          orderStatus: order.status,
        })
      );

      return NextResponse.json(
        {
          status: "ok",
          outcome: "ignored_missing_query_token",
          orderId: order.id,
        },
        { status: 200 }
      );
    }

    const queryData = await queryExpressPayTransaction(queryToken);
    const paymentMethod =
      resolveExpressPayMethod({ ...queryData, ...webhookMethodHints }) ||
      order?.payment_method ||
      null;

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

    const paymentResponsePayload = mismatchMeta
      ? {
          ...queryData,
          ...webhookMethodHints,
          provider: PAYMENT_PROVIDER,
          ...mismatchMeta,
        }
      : { ...queryData, ...webhookMethodHints, provider: PAYMENT_PROVIDER };

    const updatePayload = {
      status: finalizedStatus,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payment_response: paymentResponsePayload,
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
        await persistWebhookOutcome(
          admin,
          order,
          buildWebhookDebug({
            outcome: "error",
            stage: "order_update_paid",
            tokenSuffix,
            orderStatus: finalizedStatus,
            queryToken,
            paymentReference,
          }),
          updatePayload.payment_response
        );

        return NextResponse.json(
          {
            status: "ok",
            outcome: "error",
            stage: "order_update_paid",
            orderId: order.id,
          },
          { status: 200 }
        );
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
      await persistWebhookOutcome(
        admin,
        order,
        buildWebhookDebug({
          outcome: "updated_non_paid",
          stage: "finalized",
          tokenSuffix,
          orderStatus: finalizedStatus,
          queryToken,
          paymentReference,
        }),
        updatePayload.payment_response
      );

      return NextResponse.json(
        {
          status: "ok",
          outcome: "updated_non_paid",
          orderId: order.id,
          orderStatus: finalizedStatus,
        },
        { status: 200 }
      );
    }

    // Persist payment record early so admin/payment reports are complete even
    // when subsequent fulfillment side-effects fail.
    if (paymentMethod) {
      const { error: paymentUpsertError } = await admin.from("order_payments").upsert(
        {
          order_id: order.id,
          provider: PAYMENT_PROVIDER,
          method: paymentMethod,
          amount: queryData.amount || 0,
          currency: queryData.currency || "GHS",
          provider_ref: paymentReference,
          status: "completed",
          meta: paymentResponsePayload,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "order_id,provider,provider_ref",
          ignoreDuplicates: true,
        }
      );

      if (paymentUpsertError) {
        console.error("Failed to upsert order payment record:", paymentUpsertError);
      }
    } else {
      console.warn("Skipping order_payments upsert because payment method is unavailable", {
        orderId: order.id,
        orderCode: order.order_code,
      });
    }

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

    await persistWebhookOutcome(
      admin,
      order,
      buildWebhookDebug({
        outcome: "paid_transitioned",
        stage: "finalized",
        tokenSuffix,
        orderStatus: finalizedStatus,
        queryToken,
        paymentReference,
      }),
      updatePayload.payment_response
    );

    return NextResponse.json(
      {
        status: "ok",
        outcome: "paid_transitioned",
        orderId: order.id,
        orderStatus: finalizedStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        status: "ok",
        outcome: "error",
        stage: "exception",
        message: error?.message || "Webhook error",
      },
      { status: 200 }
    );
  }
}
