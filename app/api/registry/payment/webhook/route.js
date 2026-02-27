import { NextResponse } from "next/server";
import {
  createAdminClient,
} from "../../../../utils/supabase/server";
import { dispatchNotification } from "../../../../utils/notificationService";
import { logSecurityEvent, SecurityEvents } from "../../../../utils/securityLogger";
import {
  hasExpressPayAmountMismatch,
  resolveExpressPayMethod,
  mapExpressPayResultToOrderStatus,
  queryExpressPayTransaction,
  TERMINAL_ORDER_STATUSES,
} from "../../../../utils/payments/expresspay";

const WEBHOOK_SOURCE = "/api/registry/payment/webhook";
const PAYMENT_PROVIDER = "expresspay";

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

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
  adminClient,
  order,
  debugMeta,
  paymentResponseBase = null
) {
  if (!adminClient || !order?.id || !debugMeta) return;

  const mergedPaymentResponse = {
    ...asObject(paymentResponseBase ?? order.payment_response),
    webhook_debug: debugMeta,
  };

  const { error } = await adminClient
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

    // ExpressPay sends form-urlencoded data
    const formData = await request.formData();
    const orderIdFromWebhook = formData.get("order-id");
    const tokenFromWebhook = formData.get("token");
    const tokenSuffix = tokenFromWebhook
      ? String(tokenFromWebhook).slice(-6)
      : null;

    if (!orderIdFromWebhook && !tokenFromWebhook) {
      return NextResponse.json(
        { status: "ok", outcome: "ignored_missing_params" },
        { status: 200 }
      );
    }

    const adminClient = createAdminClient();

    // Find the order
    let order = null;

    if (orderIdFromWebhook) {
      const { data } = await adminClient
        .from("orders")
        .select(
          "id, order_code, status, registry_id, payment_token, payment_method, payment_reference, total_amount, currency, payment_response"
        )
        .eq("order_code", orderIdFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order && tokenFromWebhook) {
      const { data } = await adminClient
        .from("orders")
        .select(
          "id, order_code, status, registry_id, payment_token, payment_method, payment_reference, total_amount, currency, payment_response"
        )
        .eq("payment_token", tokenFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error("Registry webhook order not found:", {
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

    // Skip if already processed
    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      const terminalPaymentResponse = asObject(order.payment_response);
      let enrichedTerminalPaymentResponse = terminalPaymentResponse?.provider
        ? terminalPaymentResponse
        : { ...terminalPaymentResponse, provider: PAYMENT_PROVIDER };

      let terminalOutcome = "ignored_terminal_status";
      let terminalStage = "pre_query";
      let terminalPaymentReference = order.payment_reference || null;
      let terminalQueryToken = tokenFromWebhook || order.payment_token || null;

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
            resolveExpressPayMethod(terminalQueryData) ||
            order.payment_method ||
            null;
          terminalPaymentReference =
            terminalQueryData["transaction-id"] ||
            terminalQueryData.token ||
            terminalPaymentReference ||
            terminalQueryToken;

          const terminalPaymentResponsePayload = {
            ...terminalQueryData,
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

          const { error: terminalUpdateError } = await adminClient
            .from("orders")
            .update(terminalUpdatePayload)
            .eq("id", order.id);

          if (terminalUpdateError) {
            console.error(
              "Registry terminal reconciliation failed to update order:",
              terminalUpdateError
            );
          }

          if (terminalPaymentMethod && terminalPaymentReference) {
            const { error: terminalUpsertError } = await adminClient
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
                "Registry terminal reconciliation failed to upsert payment:",
                terminalUpsertError
              );
            }
          }

          terminalOutcome = "ignored_terminal_status_reconciled";
          terminalStage = "terminal_reconcile";
        } catch (terminalReconcileError) {
          console.error(
            "Registry terminal reconciliation query failed:",
            terminalReconcileError
          );
        }
      }

      await persistWebhookOutcome(
        adminClient,
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
      console.error("Registry webhook missing query token for order:", order.id);
      await persistWebhookOutcome(
        adminClient,
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

    const paymentResponsePayload = mismatchMeta
      ? { ...queryData, provider: PAYMENT_PROVIDER, ...mismatchMeta }
      : { ...queryData, provider: PAYMENT_PROVIDER };

    const updatePayload = {
      status: finalizedStatus,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payment_response: paymentResponsePayload,
      updated_at: new Date().toISOString(),
    };

    let paidTransitioned = false;
    if (finalizedStatus === "paid") {
      const { data: updatedOrder, error: updateError } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .neq("status", "paid")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Registry webhook order update failed:", updateError);
        await persistWebhookOutcome(
          adminClient,
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
      const { error: updateError } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id);

      if (updateError) {
        console.error("Registry webhook order update failed:", updateError);
      }
    }

    if (finalizedStatus !== "paid" || !paidTransitioned) {
      await persistWebhookOutcome(
        adminClient,
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

    if (paymentMethod) {
      const { error: paymentUpsertError } = await adminClient
        .from("order_payments")
        .upsert(
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
        console.error("Registry webhook payment upsert failed:", paymentUpsertError);
      }
    } else {
      console.warn(
        "Registry webhook skipped order_payments upsert because payment method is unavailable",
        { orderId: order.id, orderCode: order.order_code }
      );
    }

    // If payment was successful, update purchased quantity
    const { data: orderItems } = await adminClient
      .from("order_items")
      .select("registry_item_id, quantity")
      .eq("order_id", order.id);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (!item?.registry_item_id) continue;

        const { data: registryItem } = await adminClient
          .from("registry_items")
          .select("purchased_qty")
          .eq("id", item.registry_item_id)
          .maybeSingle();

        if (registryItem) {
          const newPurchasedQty =
            (registryItem.purchased_qty || 0) + item.quantity;

          await adminClient
            .from("registry_items")
            .update({
              purchased_qty: newPurchasedQty,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.registry_item_id);
        }
      }
    }

    try {
      if (order.registry_id) {
        const { data: registry } = await adminClient
          .from("registries")
          .select("id, registry_code, registry_owner_id, title")
          .eq("id", order.registry_id)
          .maybeSingle();

        if (registry?.registry_owner_id) {
          const { data: hostProfile } = await adminClient
            .from("profiles")
            .select("email, firstname")
            .eq("id", registry.registry_owner_id)
            .maybeSingle();

          const dashboardLink = registry.registry_code
            ? `/dashboard/h/registry/${registry.registry_code}`
            : "/dashboard/h/registry";

          await dispatchNotification({
            client: adminClient,
            recipientId: registry.registry_owner_id,
            recipientRole: "host",
            eventType: "registry_purchase",
            message: registry.title
              ? `New gift purchase for ${registry.title}.`
              : "You received a new registry purchase.",
            link: dashboardLink,
            data: {
              order_id: order.id,
              order_code: order.order_code || null,
              registry_id: registry.id,
              status: newStatus,
            },
            emailPayload: hostProfile?.email
              ? {
                  templateSlug: "host_purchase_alert",
                  to: hostProfile.email,
                  variables: {
                    host_name: hostProfile.firstname || "there",
                    buyer_name: "A gifter",
                    registry_title: registry.title || "your registry",
                    amount: "",
                    dashboard_url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}${dashboardLink}`,
                  },
                }
              : undefined,
          });
        }
      }
    } catch (error) {
      console.error(
        "Failed to send registry purchase notification:",
        error
      );
    }

    // ExpressPay expects HTTP 200 OK response
    await persistWebhookOutcome(
      adminClient,
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
    console.error("Payment webhook error:", error);
    // Still return 200 to acknowledge receipt
    return NextResponse.json(
      {
        status: "ok",
        outcome: "error",
        stage: "exception",
        message: error?.message || "Payment webhook error",
      },
      { status: 200 }
    );
  }
}
