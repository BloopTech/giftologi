import { NextResponse } from "next/server";
import {
  createAdminClient,
} from "../../../../utils/supabase/server";
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
    // ExpressPay sends form-urlencoded data
    const formData = await request.formData();
    const orderIdFromWebhook = formData.get("order-id");
    const tokenFromWebhook = formData.get("token");

    if (!orderIdFromWebhook && !tokenFromWebhook) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const adminClient = createAdminClient();

    // Find the order
    let order = null;

    if (orderIdFromWebhook) {
      const { data } = await adminClient
        .from("orders")
        .select(
          "id, order_code, status, registry_id, payment_token, payment_method, total_amount, currency"
        )
        .eq("order_code", orderIdFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order && tokenFromWebhook) {
      const { data } = await adminClient
        .from("orders")
        .select(
          "id, order_code, status, registry_id, payment_token, payment_method, total_amount, currency"
        )
        .eq("payment_token", tokenFromWebhook)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error("Registry webhook order not found:", {
        orderId: orderIdFromWebhook,
      });
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Skip if already processed
    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const queryToken = tokenFromWebhook || order.payment_token;
    if (!queryToken) {
      console.error("Registry webhook missing query token for order:", order.id);
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
      const { data: updatedOrder, error: updateError } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .neq("status", "paid")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Registry webhook order update failed:", updateError);
        return NextResponse.json({ status: "ok" }, { status: 200 });
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
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    await adminClient.from("order_payments").upsert(
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
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Payment webhook error:", error);
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
