"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/app/components/Badge";
import { cx } from "@/app/components/utils";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const TABS = [
  { id: "payment", label: "Payment Summary" },
  { id: "items", label: "Order Items" },
  { id: "delivery", label: "Delivery & Fulfilment" },
  { id: "refunds", label: "Order Refunds" },
  { id: "audit", label: "Audit Trail" },
];

const DELIVERY_STEPS = [
  { id: "destination", label: "Destination" },
  { id: "logistics", label: "Logistics & Fees" },
  { id: "proof", label: "Proof & Actions" },
];

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatCurrencyGHS = (value) => {
  if (value === null || typeof value === "undefined") return "GHS —";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS —";
  return (
    "GHS " +
    num.toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const normalizeStatus = (value) => {
  if (!value) return "";
  return String(value).toLowerCase();
};

const isPaidStatus = (status) => {
  const value = normalizeStatus(status);
  return value === "paid" || value === "success";
};

const mapPaymentMethodLabel = (value) => {
  if (!value) return "—";
  const methodValue = String(value).toLowerCase();
  if (methodValue === "momo") return "MoMo";
  if (methodValue === "mtn_momo") return "MTN MoMo";
  if (methodValue === "telecel_cash") return "Telecel Cash";
  if (methodValue === "at_momo") return "AT MoMo";
  if (methodValue === "card") return "Card";
  if (methodValue === "bank") return "Bank Transfer";
  return methodValue.charAt(0).toUpperCase() + methodValue.slice(1);
};

const mapPaymentProviderLabel = (value) => {
  if (!value) return "Unrecorded";
  const providerValue = String(value).trim();
  if (!providerValue) return "Unrecorded";

  const normalized = providerValue.toLowerCase();
  if (normalized === "expresspay") return "ExpressPay";

  return providerValue.charAt(0).toUpperCase() + providerValue.slice(1);
};

const parseJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const pickPaymentValue = (source, keys) => {
  if (!source || typeof source !== "object") return null;

  for (const key of keys) {
    const value = source[key];
    if (value === null || typeof value === "undefined") continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return null;
};

const formatVariationLabel = (variation) => {
  if (!variation) return "Standard";

  if (typeof variation === "string") {
    const trimmed = variation.trim();
    return trimmed || "Standard";
  }

  if (typeof variation === "object") {
    if (variation.label) return String(variation.label);
    if (variation.name) return String(variation.name);

    const skipKeys = new Set(["id", "key", "sku", "stock_qty", "price", "label", "name"]);
    const parts = Object.entries(variation)
      .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${value}`);

    if (parts.length) return parts.join(", ");
  }

  return "Standard";
};

export default function TransactionDetailsContent({ transaction }) {
  const [activeTab, setActiveTab] = useState("payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({
    payment: null,
    allPayments: [],
    delivery: null,
    checkoutContext: null,
    items: [],
    productsById: {},
    auditEvents: [],
    refunds: [],
  });

  const order = transaction?.__raw?.order || null;
  const registry = transaction?.__raw?.registry || null;
  const buyer = transaction?.__raw?.buyer || null;

  const orderItems = useMemo(() => {
    const raw = transaction?.__raw?.items;
    return Array.isArray(raw) ? raw : [];
  }, [transaction]);

  const orderId = order?.id || transaction?.id || null;

  useEffect(() => {
    if (!orderId) return;

    let ignore = false;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseClient();

        const baseItems = orderItems;
        const productIds = Array.from(
          new Set(
            baseItems.map((item) => item.product_id).filter((value) => !!value)
          )
        );

        const paymentsQuery = supabase
          .from("order_payments")
          .select(
            "id, order_id, provider, method, amount, currency, provider_ref, status, created_at, meta"
          )
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });

        const deliveryQuery = supabase
          .from("order_delivery_details")
          .select(
            "id, order_id, courier_partner, tracking_id, inbound_shipping_fee, outbound_shipping_fee, gift_wrapping_fee, delivery_status, proof_of_delivery_url, delivery_confirmed_at, delivery_confirmed_by, delivery_attempts, failed_delivery_reason, failed_delivery_at, created_at, updated_at"
          )
          .eq("order_id", orderId)
          .maybeSingle();

        const checkoutContextQuery = supabase
          .from("checkout_context")
          .select("order_id, total_weight_kg, pieces, created_at")
          .eq("order_id", orderId)
          .maybeSingle();

        const productsQuery = productIds.length
          ? supabase
              .from("products")
              .select("id, name, product_code, price")
              .in("id", productIds)
          : Promise.resolve({ data: [], error: null });

        const auditQuery = supabase
          .from("admin_activity_log")
          .select("id, created_at, admin_name, action, details")
          .eq("entity", "orders")
          .eq("target_id", String(orderId))
          .order("created_at", { ascending: true });

        const refundsQuery = supabase
          .from("order_refunds")
          .select(
            "id, amount, status, reason, created_at, processed_at, processor_message"
          )
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });

        const [
          { data: paymentRows, error: paymentError },
          { data: deliveryRow, error: deliveryError },
          { data: checkoutContextRow, error: checkoutContextError },
          { data: productRows, error: productsError },
          { data: auditRows, error: auditError },
          { data: refundRows, error: refundsError },
        ] = await Promise.all([
          paymentsQuery,
          deliveryQuery,
          checkoutContextQuery,
          productsQuery,
          auditQuery,
          refundsQuery,
        ]);

        if (ignore) return;

        if (
          paymentError ||
          deliveryError ||
          checkoutContextError ||
          productsError ||
          auditError ||
          refundsError
        ) {
          const message =
            paymentError?.message ||
            deliveryError?.message ||
            checkoutContextError?.message ||
            productsError?.message ||
            auditError?.message ||
            refundsError?.message ||
            "Failed to load transaction details";
          setError(message);
        }

        const productsById = {};
        if (Array.isArray(productRows)) {
          for (const product of productRows) {
            if (!product?.id) continue;
            productsById[product.id] = product;
          }
        }

        const allPayments = Array.isArray(paymentRows) ? paymentRows : [];
        const primaryPayment = allPayments.length ? allPayments[0] : null;

        setDetails({
          payment: primaryPayment,
          allPayments,
          delivery: deliveryRow || null,
          checkoutContext: checkoutContextRow || null,
          items: baseItems,
          productsById,
          auditEvents: Array.isArray(auditRows) ? auditRows : [],
          refunds: Array.isArray(refundRows) ? refundRows : [],
        });
      } catch (err) {
        if (ignore) return;
        setError(err?.message || "Failed to load transaction details");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      ignore = true;
    };
  }, [orderId, orderItems]);

  const guestName = useMemo(() => {
    if (transaction?.guestName) return transaction.guestName;
    const parts = [];
    if (buyer?.firstname) parts.push(buyer.firstname);
    if (buyer?.lastname) parts.push(buyer.lastname);
    if (parts.length) return parts.join(" ");
    return buyer?.email || "Guest";
  }, [transaction, buyer]);

  const registryLabel = useMemo(() => {
    if (transaction?.registryCode) return transaction.registryCode;
    return registry?.registry_code || registry?.title || "—";
  }, [transaction, registry]);

  const registryCodeForLink = useMemo(() => {
    if (transaction?.registryCode) return transaction.registryCode;
    return registry?.registry_code || null;
  }, [transaction, registry]);

  const registryLinkHref = useMemo(() => {
    if (!registryCodeForLink) return null;
    const code = encodeURIComponent(registryCodeForLink);
    return `/dashboard/admin/registry_list?q=${code}&by=registry_code&page=1`;
  }, [registryCodeForLink]);

  const vendorName = useMemo(() => {
    return transaction?.vendorName || "—";
  }, [transaction]);

  const vendorLinkHref = useMemo(() => {
    if (!transaction?.vendorName) return null;
    const term = encodeURIComponent(transaction.vendorName);
    return `/dashboard/admin/vendor_requests?q=${term}&type=vendor&page=1`;
  }, [transaction]);

  const paymentSummary = useMemo(() => {
    const payment = details.payment;
    const paymentMeta = parseJsonObject(payment?.meta);
    const orderPaymentResponse = parseJsonObject(order?.payment_response);

    let amountValue = 0;
    if (typeof payment?.amount === "number") {
      amountValue = payment.amount;
    } else if (typeof order?.total_amount === "number") {
      amountValue = order.total_amount;
    } else if (typeof transaction?.amount === "number") {
      amountValue = transaction.amount;
    }

    const serviceFeeRate = 0.05;
    const serviceFeeValue = amountValue * serviceFeeRate;
    const netVendorValue = amountValue - serviceFeeValue;

    const methodSource =
      payment?.method ||
      pickPaymentValue(paymentMeta, ["method", "payment_method", "paymentMode", "payment_mode", "channel"]) ||
      transaction?.paymentMethodValue ||
      order?.payment_method ||
      pickPaymentValue(orderPaymentResponse, ["method", "payment_method", "paymentMode", "payment_mode", "channel"]);

    const providerSource =
      payment?.provider ||
      pickPaymentValue(paymentMeta, ["provider", "gateway", "payment_provider", "paymentProvider"]) ||
      transaction?.paymentProviderLabel ||
      pickPaymentValue(orderPaymentResponse, ["provider", "gateway", "payment_provider", "paymentProvider"]);

    const referenceSource =
      payment?.provider_ref ||
      pickPaymentValue(paymentMeta, ["provider_ref", "reference", "payment_reference", "transaction_id"]) ||
      transaction?.paymentReference ||
      order?.payment_reference ||
      pickPaymentValue(orderPaymentResponse, ["provider_ref", "reference", "payment_reference", "transaction_id"]);

    const statusSource =
      payment?.status ||
      order?.status ||
      transaction?.normalizedStatus ||
      "pending";
    const normalizedStatus = normalizeStatus(statusSource) || "pending";

    let statusLabel =
      normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
    let statusVariant = "neutral";
    if (normalizedStatus === "paid" || normalizedStatus === "success") {
      statusLabel = "Paid";
      statusVariant = "success";
    } else if (
      normalizedStatus === "failed" ||
      normalizedStatus === "cancelled"
    ) {
      statusVariant = "error";
    } else if (normalizedStatus === "pending") {
      statusVariant = "warning";
    }

    const transactionId =
      referenceSource ||
      (order?.id
        ? `TXN-${String(order.id).slice(0, 8).toUpperCase()}`
        : transaction?.orderCode || "—");

    return {
      transactionId,
      paymentMethodLabel: mapPaymentMethodLabel(methodSource),
      paymentProviderLabel: mapPaymentProviderLabel(providerSource),
      paymentStatusLabel: statusLabel,
      paymentStatusVariant: statusVariant,
      paymentDateLabel: formatDate(payment?.created_at || order?.created_at),
      amountPaidLabel: formatCurrencyGHS(amountValue),
      serviceFeeLabel: formatCurrencyGHS(serviceFeeValue),
      netVendorLabel: formatCurrencyGHS(netVendorValue),
    };
  }, [details.payment, order, transaction]);

  const itemsForDisplay = useMemo(() => {
    if (!Array.isArray(details.items) || !details.items.length) return [];

    return details.items.map((item, index) => {
      const product = details.productsById[item.product_id] || null;
      const name = product?.name || `Item ${index + 1}`;
      const sku = product?.product_code || "—";
      const qtyRaw = Number(item.quantity || 0);
      const quantity = Number.isFinite(qtyRaw) ? qtyRaw : null;

      let unitPriceValue = 0;
      if (typeof item.price === "number") {
        unitPriceValue = item.price;
      } else if (typeof product?.price === "number") {
        unitPriceValue = product.price;
      }

      const subtotalValue =
        Number.isFinite(qtyRaw) && Number.isFinite(unitPriceValue)
          ? unitPriceValue * qtyRaw
          : 0;

      const wrapFeeValue = Number(item?.gift_wrap_options?.fee || 0);
      const wrapLabel = item?.gift_wrap_options?.name
        ? `${item.gift_wrap_options.name}${
            Number.isFinite(wrapFeeValue) && wrapFeeValue > 0
              ? ` (${formatCurrencyGHS(wrapFeeValue)})`
              : ""
          }`
        : item.wrapping
        ? "Gift wrap selected"
        : "";

      return {
        id: item.id || String(index),
        name,
        sku,
        variationLabel: formatVariationLabel(item.variation),
        quantity,
        unitPriceLabel: formatCurrencyGHS(unitPriceValue),
        subtotalLabel: formatCurrencyGHS(subtotalValue),
        wrapping: !!item.wrapping,
        giftWrapLabel: wrapLabel,
        giftMessage: item.gift_message || "",
      };
    });
  }, [details.items, details.productsById]);

  const refundsForDisplay = useMemo(() => {
    if (!Array.isArray(details.refunds) || !details.refunds.length) return [];

    return details.refunds.map((refund, index) => {
      const id = refund.id || String(index);
      const createdAtLabel = formatDateTime(refund.created_at);
      const processedAtLabel = refund.processed_at
        ? formatDateTime(refund.processed_at)
        : "—";
      const amountLabel = formatCurrencyGHS(refund.amount);
      const rawStatus = refund.status || "pending";
      const normalized = String(rawStatus).toLowerCase();

      let statusLabel =
        normalized.charAt(0).toUpperCase() + normalized.slice(1);
      let statusVariant = "neutral";
      if (normalized === "approved" || normalized === "processed") {
        statusVariant = "success";
      } else if (
        normalized === "failed" ||
        normalized === "cancelled" ||
        normalized === "rejected"
      ) {
        statusVariant = "error";
      } else if (normalized === "pending") {
        statusVariant = "warning";
      }

      return {
        id,
        createdAtLabel,
        processedAtLabel,
        amountLabel,
        statusLabel,
        statusVariant,
        reason: refund.reason || "",
        processorMessage: refund.processor_message || "",
      };
    });
  }, [details.refunds]);

  const deliverySummary = useMemo(() => {
    const delivery = details.delivery || {};
    const checkoutContext = details.checkoutContext || {};
    const deliveryStatusSource =
      delivery.delivery_status || transaction?.deliveryStatus || order?.status;
    const normalized = normalizeStatus(deliveryStatusSource);

    let label = "Pending";
    if (normalized === "delivered") label = "Delivered";
    else if (normalized === "shipped") label = "Shipped";
    else if (normalized === "cancelled") label = "Cancelled";

    let variant = "neutral";
    if (normalized === "delivered" || normalized === "shipped") {
      variant = "success";
    } else if (normalized === "cancelled") {
      variant = "error";
    }

    const totalWeightKg = Number.isFinite(Number(checkoutContext.total_weight_kg))
      ? Number(checkoutContext.total_weight_kg)
      : null;
    const pieces = Number.isFinite(Number(checkoutContext.pieces))
      ? Number(checkoutContext.pieces)
      : null;
    const inboundFeeValue =
      delivery.inbound_shipping_fee ??
      order?.shipping_fee ??
      0;

    return {
      courierPartner: delivery.courier_partner || "—",
      trackingId: delivery.tracking_id || "—",
      inboundFeeLabel: formatCurrencyGHS(inboundFeeValue),
      outboundFeeLabel: formatCurrencyGHS(delivery.outbound_shipping_fee),
      giftWrappingFeeLabel: formatCurrencyGHS(delivery.gift_wrapping_fee),
      deliveryStatusLabel: label,
      deliveryStatusVariant: variant,
      proofUrl: delivery.proof_of_delivery_url || null,
      totalWeightKg,
      totalWeightKgLabel: totalWeightKg !== null ? `${totalWeightKg.toFixed(2)} kg` : "—",
      pieces,
      piecesLabel: pieces !== null ? `${pieces} piece${pieces === 1 ? "" : "s"}` : "—",
      confirmedAt: delivery.delivery_confirmed_at || null,
      confirmedBy: delivery.delivery_confirmed_by || null,
      attempts: delivery.delivery_attempts || 1,
      failedReason: delivery.failed_delivery_reason || null,
      failedAt: delivery.failed_delivery_at || null,
      rawStatus: normalized,
    };
  }, [details.delivery, details.checkoutContext, transaction, order]);

  const deliveryDestination = useMemo(() => {
    const fullName =
      [order?.buyer_firstname, order?.buyer_lastname]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      [buyer?.firstname, buyer?.lastname].filter(Boolean).join(" ").trim() ||
      transaction?.guestName ||
      "Guest";

    return {
      recipientName: fullName,
      recipientEmail: order?.buyer_email || buyer?.email || transaction?.email || "—",
      recipientPhone: order?.buyer_phone || buyer?.phone || "—",
      addressLine: order?.shipping_address || "—",
      cityRegion:
        [order?.shipping_city, order?.shipping_region].filter(Boolean).join(", ") ||
        "—",
      digitalAddress: order?.shipping_digital_address || "—",
    };
  }, [order, buyer, transaction]);

  const auditEntries = useMemo(() => {
    const entries = [];

    if (order?.created_at) {
      entries.push({
        title: "Order Created",
        by: guestName,
        at: order.created_at,
        description: "Order placed on platform",
      });
    }

    if (Array.isArray(details.allPayments)) {
      for (const payment of details.allPayments) {
        if (!isPaidStatus(payment.status)) continue;
        entries.push({
          title: "Payment Confirmed",
          by: payment.provider || "Payment Provider",
          at: payment.created_at,
          description: mapPaymentMethodLabel(payment.method),
        });
      }
    }

    if (Array.isArray(details.auditEvents)) {
      for (const row of details.auditEvents) {
        const action = String(row.action || "").toLowerCase();
        let title = row.action || "Admin Activity";
        if (action === "updated_order_status") {
          title = "Order Status Updated";
        } else if (action === "system_event") {
          title = "System Event";
        }

        entries.push({
          title,
          by: row.admin_name || "Admin",
          at: row.created_at,
          description: row.details || "",
        });
      }
    }

    const finalStatus = normalizeStatus(
      order?.status || transaction?.normalizedStatus
    );
    if (finalStatus === "delivered") {
      entries.push({
        title: "Order Delivered",
        by: "System",
        at: order?.updated_at || order?.created_at || null,
        description: "Delivery confirmed",
      });
    }

    const withDates = entries.filter((entry) => entry.at);
    const withoutDates = entries.filter((entry) => !entry.at);

    withDates.sort((a, b) => {
      const aTime = new Date(a.at).getTime();
      const bTime = new Date(b.at).getTime();
      return aTime - bTime;
    });

    return [...withDates, ...withoutDates];
  }, [details.allPayments, details.auditEvents, order, transaction, guestName]);

  return (
    <div className="mt-2">
      <div className="mb-4">
        <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "px-3 py-1.5 rounded-full cursor-pointer transition-colors",
                activeTab === tab.id
                  ? "bg-white text-[#0A0A0A] shadow-sm"
                  : "text-[#6A7282] hover:text-[#0A0A0A]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {activeTab === "payment" && (
        <PaymentSummarySection
          loading={loading}
          transaction={transaction}
          guestName={guestName}
          registryLabel={registryLabel}
          registryLinkHref={registryLinkHref}
          vendorName={vendorName}
          vendorLinkHref={vendorLinkHref}
          summary={paymentSummary}
        />
      )}

      {activeTab === "items" && (
        <OrderItemsSection loading={loading} items={itemsForDisplay} />
      )}

      {activeTab === "refunds" && (
        <OrderRefundsSection
          loading={loading}
          refunds={refundsForDisplay}
        />
      )}

      {activeTab === "delivery" && (
        <DeliverySection
          loading={loading}
          summary={deliverySummary}
          orderId={orderId}
          destination={deliveryDestination}
        />
      )}

      {activeTab === "audit" && (
        <AuditTrailSection loading={loading} entries={auditEntries} />
      )}
    </div>
  );
}

function OrderRefundsSection({ loading, refunds }) {
  return (
    <div className="space-y-3 text-xs text-[#0A0A0A]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[11px] font-medium text-[#717182]">
            Order Refunds
          </p>
          <p className="text-[11px] text-[#717182]">
            History of all refund requests raised against this order.
          </p>
        </div>
        <p className="text-[11px] text-[#0A0A0A]">
          {refunds.length} refund{refunds.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        {loading ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#717182]">
            Loading refunds...
          </div>
        ) : !refunds.length ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#717182]">
            No refunds have been initiated for this order yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Created
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium text-[#6A7282]">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                      {refund.createdAtLabel}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                      <Badge
                        variant={refund.statusVariant}
                        className="text-[11px]"
                      >
                        {refund.statusLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-[#0A0A0A]">
                      {refund.amountLabel}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#0A0A0A] max-w-xs">
                      <span className="line-clamp-2">
                        {refund.reason || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentSummarySection({
  loading,
  transaction,
  guestName,
  registryLabel,
  summary,
}) {
  return (
    <div className="space-y-4 text-xs text-[#0A0A0A]">
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-[#717182]">
          Payment Information
        </p>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-[#717182]">Transaction ID</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {summary.transactionId}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Registry</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {registryLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Guest</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {guestName}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Payment Provider</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {summary.paymentProviderLabel || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Payment Method</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {summary.paymentMethodLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Payment Status</p>
            <div className="mt-1">
              <Badge
                variant={summary.paymentStatusVariant}
                className="text-[11px]"
              >
                {summary.paymentStatusLabel}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Payment Date</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {summary.paymentDateLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-medium text-[#717182]">
          Amount Breakdown
        </p>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-[#717182]">Amount Paid</p>
            <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
              {summary.amountPaidLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">
              Platform Service Fee (5%)
            </p>
            <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
              {summary.serviceFeeLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Net Vendor Amount</p>
            <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
              {summary.netVendorLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderItemsSection({ loading, items }) {
  return (
    <div className="space-y-3 text-xs text-[#0A0A0A]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-[#717182]">Order Items</p>
        <p className="text-[11px] text-[#0A0A0A]">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        {loading ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#717182]">
            Loading items...
          </div>
        ) : !items.length ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#717182]">
            No items found for this order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Item Name
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    SKU
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Variation
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium text-[#6A7282]">
                    Quantity
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium text-[#6A7282]">
                    Unit Price
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-medium text-[#6A7282]">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.name}</span>
                        {item.giftMessage && (
                          <span className="text-[10px] text-[#6A7282]">
                            Gift message: {item.giftMessage}
                          </span>
                        )}
                        {item.giftWrapLabel ? (
                          <span className="text-[10px] text-[#6A7282]">
                            Gift wrap: {item.giftWrapLabel}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                      {item.sku}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                      {item.variationLabel}
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-[#0A0A0A]">
                      {item.quantity ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-[#0A0A0A]">
                      {item.unitPriceLabel}
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-[#0A0A0A]">
                      {item.subtotalLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliverySection({ loading, summary, orderId, destination }) {
  const [activeStep, setActiveStep] = useState("destination");
  const [failReason, setFailReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  const handleAction = async (actionName, extraData = {}) => {
    setActionLoading(actionName);
    setActionMsg(null);
    try {
      const { markDeliveryFailed, reattemptDelivery } = await import(
        "./action"
      );
      const fd = new FormData();
      fd.set("orderId", orderId);
      Object.entries(extraData).forEach(([k, v]) => fd.set(k, v));

      let result;
      if (actionName === "markFailed") {
        result = await markDeliveryFailed(null, fd);
      } else if (actionName === "reattempt") {
        result = await reattemptDelivery(null, fd);
      }
      setActionMsg({
        type: result?.data?.orderId ? "success" : "error",
        text: result?.message || "Done",
      });
    } catch (err) {
      setActionMsg({ type: "error", text: err.message || "Action failed" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 text-xs text-[#0A0A0A]">
      <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px]">
        {DELIVERY_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={cx(
              "px-3 py-1.5 rounded-full cursor-pointer transition-colors",
              activeStep === step.id
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#6A7282] hover:text-[#0A0A0A]"
            )}
          >
            {step.label}
          </button>
        ))}
      </div>

      {activeStep === "destination" && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-[#717182]">
            Recipient & Delivery Destination
          </p>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-[#717182]">Recipient</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {destination?.recipientName || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#717182]">Email</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {destination?.recipientEmail || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#717182]">Phone</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {destination?.recipientPhone || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#717182]">City / Region</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {destination?.cityRegion || "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-[#717182]">Street Address</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {destination?.addressLine || "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-[#717182]">Digital Address</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {destination?.digitalAddress || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeStep === "logistics" && (
        <>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[#717182]">
              Delivery Information
            </p>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-[#717182]">Courier Partner</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.courierPartner}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Tracking ID</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.trackingId}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Inbound Shipping Fee</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.inboundFeeLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Outbound Shipping Fee</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.outboundFeeLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Gift Wrapping Fee</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.giftWrappingFeeLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Delivery Status</p>
                <div className="mt-1">
                  <Badge
                    variant={summary.deliveryStatusVariant}
                    className="text-[11px]"
                  >
                    {summary.deliveryStatusLabel}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Total Weight</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.totalWeightKgLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#717182]">Pieces</p>
                <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                  {summary.piecesLabel}
                </p>
              </div>
              {summary.attempts > 1 && (
                <div>
                  <p className="text-[11px] text-[#717182]">Delivery Attempts</p>
                  <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                    {summary.attempts}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[#717182]">
              Delivery Confirmation
            </p>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              {summary.confirmedAt ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-[11px] text-[#0A0A0A]">
                    Confirmed by <span className="font-medium">{summary.confirmedBy || "—"}</span> on{" "}
                    {formatDateTime(summary.confirmedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-[#717182]">
                  Delivery has not been confirmed by the recipient yet.
                </p>
              )}
            </div>
          </div>

          {summary.failedAt && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-red-600">
                Failed Delivery
              </p>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
                <p className="text-[11px] text-red-700">
                  Failed at: {formatDateTime(summary.failedAt)}
                </p>
                {summary.failedReason && (
                  <p className="text-[11px] text-red-700">
                    Reason: {summary.failedReason}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeStep === "proof" && (
        <>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[#717182]">
              Proof of Delivery
            </p>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-[#717182]">
                {summary.proofUrl
                  ? "A proof of delivery file has been uploaded."
                  : "No proof of delivery uploaded yet."}
              </p>
              {summary.proofUrl && (
                <a
                  href={summary.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#3979D2] px-4 py-1.5 text-[11px] text-[#3979D2] hover:bg-[#3979D2] hover:text-white cursor-pointer"
                >
                  View File
                </a>
              )}
            </div>
          </div>

          {orderId && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#717182]">
                Delivery Actions
              </p>
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                {actionMsg && (
                  <div
                    className={cx(
                      "rounded-md px-3 py-2 text-[11px]",
                      actionMsg.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    )}
                  >
                    {actionMsg.text}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Failure reason (optional)"
                      value={failReason}
                      onChange={(e) => setFailReason(e.target.value)}
                      disabled={!!actionLoading}
                      className="rounded-full border border-[#D6D6D6] px-3 py-1.5 text-[11px] outline-none w-48"
                    />
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() =>
                        handleAction("markFailed", { reason: failReason })
                      }
                      className="inline-flex items-center justify-center rounded-full border border-red-400 px-4 py-1.5 text-[11px] text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading === "markFailed"
                        ? "Marking…"
                        : "Mark Failed"}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() => handleAction("reattempt")}
                    className="inline-flex items-center justify-center rounded-full border border-[#3979D2] px-4 py-1.5 text-[11px] text-[#3979D2] hover:bg-[#3979D2] hover:text-white disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading === "reattempt"
                      ? "Creating shipment…"
                      : "Re-attempt Delivery"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AuditTrailSection({ loading, entries }) {
  return (
    <div className="space-y-3 text-xs text-[#0A0A0A]">
      <p className="text-[11px] font-medium text-[#717182]">
        Transaction Audit Trail
      </p>
      <p className="text-[11px] text-[#717182]">
        Complete history of all transaction actions based on available data.
      </p>

      {!entries.length ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-[11px] text-[#717182]">
          No audit events available for this transaction yet.
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <ul className="space-y-3">
            {entries.map((entry, index) => (
              <li key={index} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#3979D2]" />
                <div>
                  <p className="text-xs font-medium text-[#0A0A0A]">
                    {entry.title}
                  </p>
                  <p className="text-[11px] text-[#717182]">
                    By: {entry.by} · {entry.at ? formatDateTime(entry.at) : "—"}
                  </p>
                  {entry.description && (
                    <p className="text-[11px] text-[#717182] mt-0.5">
                      {entry.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
