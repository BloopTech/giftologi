import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/server";
import {
  hasExpressPayAmountMismatch,
  mapOrderStatusToPaymentStatus,
  mapExpressPayResultToOrderStatus,
  queryExpressPayTransaction,
  resolveExpressPayMethod,
  TERMINAL_ORDER_STATUSES,
} from "../../../../utils/payments/expresspay";

const PAYMENT_PROVIDER = "expresspay";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order-id");
    const token = searchParams.get("token");

    if (!orderId && !token) {
      return NextResponse.redirect(
        new URL("/payment-error?reason=missing_params", request.url)
      );
    }

    const adminClient = createAdminClient();

    // Find the order
    let order = null;
    let orderError = null;

    if (orderId) {
      const { data, error } = await adminClient
        .from("orders")
        .select(
          `
          id,
          order_code,
          registry_id,
          status,
          payment_token,
          payment_reference,
          payment_method,
          payment_response,
          total_amount,
          currency,
          registry:registries(
            registry_code
          )
        `
        )
        .eq("order_code", orderId)
        .maybeSingle();

      order = data;
      orderError = error;
    }

    if (!order && token) {
      const { data, error } = await adminClient
        .from("orders")
        .select(
          `
          id,
          order_code,
          registry_id,
          status,
          payment_token,
          payment_reference,
          payment_method,
          payment_response,
          total_amount,
          currency,
          registry:registries(
            registry_code
          )
        `
        )
        .eq("payment_token", token)
        .maybeSingle();

      order = data;
      orderError = error;
    }

    if (orderError || !order) {
      return NextResponse.redirect(
        new URL("/payment-error?reason=order_not_found", request.url)
      );
    }

    const orderCode = order.order_code || order.id;
    const registryCode = order.registry?.registry_code;
    const baseUrl = registryCode ? `/find-/registry/${registryCode}` : "/";

    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      if (
        order.status === "paid" &&
        (token || order.payment_token) &&
        (!order.payment_method || !order?.payment_response?.provider)
      ) {
        try {
          const terminalQueryToken = token || order.payment_token;
          const terminalQueryData = await queryExpressPayTransaction(
            terminalQueryToken
          );
          const terminalPaymentMethod =
            resolveExpressPayMethod(terminalQueryData) ||
            order?.payment_method ||
            null;
          const terminalPaymentReference =
            terminalQueryData["transaction-id"] ||
            terminalQueryData.token ||
            order.payment_reference ||
            terminalQueryToken;
          const terminalPaymentResponsePayload = {
            ...terminalQueryData,
            provider: PAYMENT_PROVIDER,
          };

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
              "Registry callback terminal reconciliation failed to update order:",
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
                  status: mapOrderStatusToPaymentStatus("paid"),
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
                "Registry callback terminal reconciliation failed to upsert payment:",
                terminalUpsertError
              );
            }
          }
        } catch (terminalReconcileError) {
          console.error(
            "Registry callback terminal reconciliation query failed:",
            terminalReconcileError
          );
        }
      }

      if (order.status === "paid") {
        return NextResponse.redirect(
          new URL(`${baseUrl}?payment=success&order=${orderCode}`, request.url)
        );
      }

      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=failed&order=${orderCode}`, request.url)
      );
    }

    const queryToken = token || order.payment_token;
    if (!queryToken) {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=pending&order=${orderCode}`, request.url)
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

    // Update order status (idempotent)
    const { data: updatedOrder } = await adminClient
      .from("orders")
      .update({
        status: finalizedStatus,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_response: paymentResponsePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle();

    // If payment was successful, update purchased quantity
    if (finalizedStatus === "paid" && updatedOrder?.id) {
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
              status: mapOrderStatusToPaymentStatus(finalizedStatus),
              meta: paymentResponsePayload,
              created_at: new Date().toISOString(),
            },
            {
              onConflict: "order_id,provider,provider_ref",
              ignoreDuplicates: true,
            }
          );

        if (paymentUpsertError) {
          console.error("Registry callback payment upsert failed:", paymentUpsertError);
        }
      } else {
        console.warn(
          "Registry callback skipped order_payments upsert because payment method is unavailable",
          { orderId: order.id, orderCode: order.order_code }
        );
      }

      // Get order items
      const { data: orderItems } = await adminClient
        .from("order_items")
        .select("registry_item_id, quantity")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (!item?.registry_item_id) continue;

          // Get current purchased qty
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
    }

    // Redirect based on status
    if (finalizedStatus === "paid") {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=success&order=${orderCode}`, request.url)
      );
    } else if (finalizedStatus === "pending") {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=pending&order=${orderCode}`, request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`${baseUrl}?payment=failed&order=${orderCode}`, request.url)
      );
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      new URL("/payment-error?reason=server_error", request.url)
    );
  }
}
