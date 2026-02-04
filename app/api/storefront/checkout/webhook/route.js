import { NextResponse } from "next/server";
import {
  createAdminClient,
  createClient,
} from "../../../../utils/supabase/server";
import {
  buildAramexTrackingUrl,
  createAramexShipment,
} from "../../../../utils/shipping/aramex";
import {
  createNotification,
  fetchVendorNotificationPreferences,
} from "../../../../utils/notifications";

const EXPRESSPAY_QUERY_URL =
  process.env.EXPRESSPAY_ENV === "live"
    ? "https://expresspaygh.com/api/query.php"
    : "https://sandbox.expresspaygh.com/api/query.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

export async function POST(request) {
  try {
    const body = await request.formData();
    const token = body.get("token");
    const orderIdFromWebhook = body.get("order-id");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    // Find order by token or order code
    let order = null;
    
    if (token) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, status")
        .eq("payment_token", token)
        .single();
      order = data;
    }

    if (!order && orderIdFromWebhook) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, status")
        .eq("order_code", orderIdFromWebhook)
        .single();
      order = data;
    }

    if (!order) {
      console.error("Order not found for token:", token);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Query ExpressPay for payment status
    const queryParams = new URLSearchParams({
      "merchant-id": EXPRESSPAY_MERCHANT_ID,
      "api-key": EXPRESSPAY_API_KEY,
      token: token,
    });

    const queryResponse = await fetch(EXPRESSPAY_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: queryParams.toString(),
    });

    const queryData = await queryResponse.json();

    // Determine order status based on ExpressPay response
    let newStatus = order.status;
    let paymentReference = null;

    if (queryData.result === 1) {
      newStatus = "paid";
      paymentReference = queryData["transaction-id"] || queryData.token;
    } else if (queryData.result === 2) {
      newStatus = "declined";
    } else if (queryData.result === 3) {
      newStatus = "failed";
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        payment_reference: paymentReference,
        payment_response: queryData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
    }

    // If payment successful, update product stock and create payment record
    if (newStatus === "paid") {
      // Get order items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity, registry_item_id, vendor_id")
        .eq("order_id", order.id);

      // Update stock for each product + registry purchased quantities
      if (orderItems) {
        for (const item of orderItems) {
          // Get current stock and decrement
          const { data: product } = await supabase
            .from("products")
            .select("stock_qty")
            .eq("id", item.product_id)
            .single();

          if (product) {
            const newStock = Math.max(0, (product.stock_qty || 0) - item.quantity);
            await supabase
              .from("products")
              .update({ stock_qty: newStock, updated_at: new Date().toISOString() })
              .eq("id", item.product_id);
          }

          if (item.registry_item_id) {
            const { data: registryItem } = await supabase
              .from("registry_items")
              .select("purchased_qty")
              .eq("id", item.registry_item_id)
              .single();

            if (registryItem) {
              const newPurchasedQty =
                (registryItem.purchased_qty || 0) + (item.quantity || 0);

              await supabase
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
            .select("id, profiles_id, business_name")
            .in("id", vendorIds);

          for (const vendor of vendorRows || []) {
            if (!vendor?.profiles_id) continue;
            const { data: preferences } =
              await fetchVendorNotificationPreferences({
                client: admin,
                vendorId: vendor.id,
              });
            if (!preferences?.new_orders) continue;

            await createNotification({
              client: admin,
              userId: vendor.profiles_id,
              type: "new_order",
              message: `New order received${
                vendor.business_name ? ` for ${vendor.business_name}` : ""
              }.`,
              link: "/dashboard/v/orders",
              data: {
                order_id: order.id,
                order_code: order.order_code || null,
                vendor_id: vendor.id,
              },
            });
          }
        }
      } catch (error) {
        console.error("Failed to notify vendors:", error);
      }

      // Create payment record
      await supabase.from("order_payments").insert({
        order_id: order.id,
        amount: queryData.amount || 0,
        currency: queryData.currency || "GHS",
        payment_method: "expresspay",
        payment_reference: paymentReference,
        status: "completed",
        created_at: new Date().toISOString(),
      });

      try {
        const vendorId = orderItems?.find((item) => item?.vendor_id)?.vendor_id;
        const totalPieces = orderItems?.reduce(
          (sum, item) => sum + (Number(item?.quantity) || 0),
          0
        );

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
                  weight: Math.max(1, totalPieces || 1),
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
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
