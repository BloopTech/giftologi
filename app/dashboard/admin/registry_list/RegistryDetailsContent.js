"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/app/components/Badge";
import { cx } from "@/app/components/utils";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const TABS = [
  { id: "info", label: "Registry Info" },
  { id: "items", label: "Registry Items" },
  { id: "guests", label: "Guest Activity" },
  { id: "audit", label: "Audit Trail" },
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
  if (Number.isNaN(num)) return "GHS —";
  return `GHS ${num.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
};

export default function RegistryDetailsContent({ registryRow }) {
  const [activeTab, setActiveTab] = useState("info");
  const [activity, setActivity] = useState({
    numberOfPurchases: null,
    lastPurchaseDate: null,
    mostPurchasedProductName: null,
    approvalDate: null,
    approvedBy: null,
    pageViews: null,
    loading: false,
    error: null,
  });

  const data = useMemo(() => {
    if (!registryRow) return {};
    const { __raw, registryName, hostName, hostEmail, eventType, status, eventDate, totalItems, purchasedItems, totalValue } =
      registryRow;
    const registry = __raw?.registry || null;
    const event = __raw?.event || null;
    const host = __raw?.host || null;

    return {
      registry,
      event,
      host,
      registryName,
      hostName,
      hostEmail,
      eventType,
      status,
      eventDate,
      totalItems,
      purchasedItems,
      totalValue,
    };
  }, [registryRow]);

  const {
    registry,
    event,
    host,
    registryName,
    hostName,
    hostEmail,
    eventType,
    status,
    eventDate,
    totalItems,
    purchasedItems,
    totalValue,
  } = data;

  const registryId = registry?.id;
  const registryCode = registry?.registry_code || "";
  const registryCreated = registry?.created_at;
  const registryUpdated = registry?.updated_at;
  const eventLocation = event?.location || "—";
  const registryUrl = registryCode
    ? `mygiftologi.com/registry/${registryCode}`
    : "—";

  const {
    numberOfPurchases,
    lastPurchaseDate,
    mostPurchasedProductName,
    approvalDate,
    approvedBy,
    pageViews,
    loading: activityLoading,
    error: activityError,
  } = activity;

  useEffect(() => {
    if (!registryId) return;

    let ignore = false;

    const fetchActivity = async () => {
      setActivity((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const supabase = createSupabaseClient();

        // 1) Load registry items and their products/vendors for this registry
        const {
          data: registryItems,
          error: registryItemsError,
        } = await supabase
          .from("registry_items")
          .select(
            `
            id,
            product:products(
              name,
              vendor:vendors(
                business_name
              )
            )
          `
          )
          .eq("registry_id", registryId);

        if (registryItemsError) throw registryItemsError;
        if (ignore) return;

        // Page views: dedupe by session_id when present, otherwise by profile_id/id
        const {
          data: viewRows,
          error: viewsError,
        } = await supabase
          .from("registry_page_views")
          .select("id, session_id, profile_id")
          .eq("registry_id", registryId);

        if (viewsError) throw viewsError;

        let pageViews = 0;
        if (Array.isArray(viewRows) && viewRows.length) {
          const keys = new Set();
          for (const row of viewRows) {
            const key = row.profile_id
              ? `p:${row.profile_id}`
              : row.session_id || `id:${row.id}`;
            keys.add(key);
          }
          pageViews = keys.size;
        }

        if (!registryItems || !registryItems.length) {
          setActivity({
            numberOfPurchases: 0,
            lastPurchaseDate: null,
            mostPurchasedProductName: null,
            approvalDate: null,
            approvedBy: null,
            pageViews,
            loading: false,
            error: null,
          });
          return;
        }

        const registryItemIds = registryItems
          .map((ri) => ri.id)
          .filter(Boolean);

        const productByRegistryItemId = new Map();
        for (const ri of registryItems) {
          if (!ri?.id) continue;
          const product = ri.product;
          const productName = product?.name || "";
          const vendorName = product?.vendor?.business_name || "";
          productByRegistryItemId.set(ri.id, { productName, vendorName });
        }

        // 2) Load order items for those registry items
        const {
          data: orderItems,
          error: orderItemsError,
        } = registryItemIds.length
          ? await supabase
              .from("order_items")
              .select("id, registry_item_id, quantity, order_id")
              .in("registry_item_id", registryItemIds)
          : { data: [], error: null };

        if (orderItemsError) throw orderItemsError;
        if (ignore) return;

        if (!orderItems || !orderItems.length) {
          setActivity({
            numberOfPurchases: 0,
            lastPurchaseDate: null,
            mostPurchasedProductName: null,
            approvalDate: null,
            approvedBy: null,
            pageViews,
            loading: false,
            error: null,
          });
          return;
        }

        const orderIds = Array.from(
          new Set(orderItems.map((oi) => oi.order_id).filter(Boolean))
        );

        // 3) Load payments for those orders and keep only "paid" ones
        const {
          data: payments,
          error: paymentsError,
        } = orderIds.length
          ? await supabase
              .from("order_payments")
              .select("order_id, status, created_at")
              .in("order_id", orderIds)
          : { data: [], error: null };

        if (paymentsError) throw paymentsError;
        if (ignore) return;

        const isPaidStatus = (status) => {
          if (!status) return false;
          const value = String(status).toLowerCase();
          return value === "paid" || value === "success";
        };

        const paidOrderDates = new Map();
        let globalFirstDate = null;
        let globalLastDate = null;

        if (Array.isArray(payments)) {
          for (const p of payments) {
            if (!p?.order_id) continue;
            if (!isPaidStatus(p.status)) continue;
            const createdAt = p.created_at
              ? new Date(p.created_at)
              : null;
            if (!createdAt || Number.isNaN(createdAt.getTime())) continue;

            const existing = paidOrderDates.get(p.order_id);
            if (!existing || createdAt < existing) {
              paidOrderDates.set(p.order_id, createdAt);
            }

            if (!globalFirstDate || createdAt < globalFirstDate) {
              globalFirstDate = createdAt;
            }
            if (!globalLastDate || createdAt > globalLastDate) {
              globalLastDate = createdAt;
            }
          }
        }

        const paidOrderIds = new Set(paidOrderDates.keys());
        if (!paidOrderIds.size) {
          setActivity({
            numberOfPurchases: 0,
            lastPurchaseDate: null,
            mostPurchasedProductName: null,
            approvalDate: null,
            approvedBy: null,
            pageViews,
            loading: false,
            error: null,
          });
          return;
        }

        // 4) Compute most purchased product over paid orders only
        const productTotals = new Map();
        for (const oi of orderItems) {
          if (!paidOrderIds.has(oi.order_id)) continue;
          const registryItemId = oi.registry_item_id;
          if (!registryItemId) continue;
          const info = productByRegistryItemId.get(registryItemId);
          const productName = info?.productName || "";
          const vendorName = info?.vendorName || "";
          const key = `${productName}||${vendorName}`;
          const prev = productTotals.get(key) || 0;
          const qty = Number(oi.quantity || 0);
          productTotals.set(
            key,
            prev + (Number.isFinite(qty) ? qty : 0)
          );
        }

        let mostPurchasedProductName = null;
        if (productTotals.size) {
          let bestKey = null;
          let bestQty = -1;
          for (const [key, qty] of productTotals.entries()) {
            if (qty > bestQty) {
              bestQty = qty;
              bestKey = key;
            }
          }
          if (bestKey) {
            const [productName, vendorName] = bestKey.split("||");
            mostPurchasedProductName = vendorName
              ? `${productName} by ${vendorName}`
              : productName;
          }
        }

        setActivity({
          numberOfPurchases: paidOrderIds.size,
          lastPurchaseDate: globalLastDate
            ? globalLastDate.toISOString()
            : null,
          mostPurchasedProductName,
          approvalDate: globalFirstDate
            ? globalFirstDate.toISOString()
            : null,
          approvedBy: hostName || null,
          pageViews,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (ignore) return;
        setActivity({
          numberOfPurchases: null,
          lastPurchaseDate: null,
          mostPurchasedProductName: null,
          approvalDate: null,
          approvedBy: null,
          pageViews: null,
          loading: false,
          error: err?.message || "Failed to load guest activity",
        });
      }
    };

    fetchActivity();

    return () => {
      ignore = true;
    };
  }, [registryId, hostName]);

  return (
    <div className="mt-2">
      {/* Segmented control */}
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

      {activeTab === "info" && (
        <InfoSection
          registryName={registryName}
          hostName={hostName}
          hostEmail={hostEmail}
          eventType={eventType}
          eventDate={eventDate}
          eventLocation={eventLocation}
          registryUrl={registryUrl}
          registryCreated={registryCreated}
          registryUpdated={registryUpdated}
          status={status}
        />
      )}

      {activeTab === "items" && (
        <ItemsSection
          registryId={registryId}
          totalItems={totalItems}
          purchasedItems={purchasedItems}
        />
      )}

      {activeTab === "guests" && (
        <GuestActivitySection
          purchasedItems={purchasedItems}
          totalValue={totalValue}
          numberOfPurchases={numberOfPurchases}
          lastPurchaseDate={lastPurchaseDate}
          mostPurchasedProductName={mostPurchasedProductName}
          loading={activityLoading}
          error={activityError}
        />
      )}

      {activeTab === "audit" && (
        <AuditTrailSection
          registry={registry}
          event={event}
          hostName={hostName || host?.firstname || host?.email}
          approvalDate={approvalDate}
          approvedBy={approvedBy}
        />
      )}
    </div>
  );
}

function InfoSection({
  registryName,
  hostName,
  hostEmail,
  eventType,
  eventDate,
  eventLocation,
  registryUrl,
  registryCreated,
  registryUpdated,
  status,
}) {
  return (
    <div className="space-y-4 text-xs text-[#0A0A0A]">
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-[#717182]">
          Basic Information
        </p>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-[#717182]">Registry Title</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {registryName || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#717182]">Event Type</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {eventType || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#717182]">Event Date</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {formatDate(eventDate)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#717182]">Event Location</p>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                {eventLocation || "—"}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-[#717182]">Registry URL</p>
                <p className="mt-1 text-xs text-[#286AD4] break-all">
                  {registryUrl}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#717182]">Privacy</span>
                <Badge variant={status === "Flagged" ? "error" : "success"}>
                  Public
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-medium text-[#717182]">
          Host Information
        </p>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-[#717182]">Host Name</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {hostName || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Contact Email</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {hostEmail || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Registry Created</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {formatDateTime(registryCreated)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#717182]">Last Updated</p>
            <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
              {formatDateTime(registryUpdated)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemsSection({ registryId, totalItems, purchasedItems }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!registryId) return;

    let ignore = false;

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseClient();
        const { data, error: itemsError } = await supabase
          .from("registry_items")
          .select(
            `
            id,
            quantity_needed,
            purchased_qty,
            priority,
            product:products(
              name,
              vendor:vendors(
                business_name
              )
            )
          `
          )
          .eq("registry_id", registryId);

        if (itemsError) throw itemsError;
        if (!ignore) {
          setItems(data || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Failed to load registry items");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchItems();
    return () => {
      ignore = true;
    };
  }, [registryId]);

  const summaryLabel = useMemo(() => {
    if (typeof totalItems === "number" && typeof purchasedItems === "number") {
      return `${purchasedItems} of ${totalItems} items purchased`;
    }
    return "Item summary not available";
  }, [totalItems, purchasedItems]);

  const priorityVariant = (priority) => {
    const value = String(priority || "").toLowerCase();
    if (value === "high") return "error";
    if (value === "medium") return "warning";
    if (value === "low") return "neutral";
    return "neutral";
  };

  return (
    <div className="space-y-3 text-xs text-[#0A0A0A]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-[#717182]">Registry Items</p>
        <p className="text-[11px] text-[#0A0A0A]">{summaryLabel}</p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        {loading ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#717182]">
            Loading items...
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-[11px] text-red-600">
            {error}
          </div>
        ) : !items.length ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#717182]">
            No items found for this registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Qty Desired
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Qty Purchased
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-[#6A7282]">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item, index) => {
                  const productName = item.product?.name;
                  const vendorName = item.product?.vendor?.business_name;
                  const label = productName || `Item ${index + 1}`;

                  return (
                    <tr key={item.id || index}>
                      <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                        <div className="flex flex-col">
                          <span className="font-medium">{label}</span>
                          {(vendorName || null) && (
                            <span className="text-[10px] text-[#6A7282]">
                              {vendorName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                        {item.quantity_needed ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                        {item.purchased_qty ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[#0A0A0A]">
                        {item.priority ? (
                          <Badge
                            variant={priorityVariant(item.priority)}
                            className="text-[10px]"
                          >
                            {String(item.priority)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function GuestActivitySection({
  purchasedItems,
  totalValue,
  numberOfPurchases,
  lastPurchaseDate,
  mostPurchasedProductName,
  pageViews,
  loading,
  error,
}) {
  const purchasesCount =
    typeof numberOfPurchases === "number"
      ? numberOfPurchases
      : typeof purchasedItems === "number"
      ? purchasedItems
      : 0;

  const lastPurchaseLabel = lastPurchaseDate
    ? formatDateTime(lastPurchaseDate)
    : "—";
  const mostViewedLabel = mostPurchasedProductName || "—";

  const pageViewsCount =
    typeof pageViews === "number" && pageViews >= 0 ? pageViews : 0;

  return (
    <div className="space-y-4 text-xs text-[#0A0A0A]">
      <div>
        <p className="text-[11px] font-medium text-[#717182]">
          Guest Activity Snapshot
        </p>
        <p className="mt-1 text-[11px] text-[#717182]">
          High-level engagement metrics for this registry.
        </p>
        {loading && (
          <p className="mt-1 text-[11px] text-[#717182]">
            Loading activity metrics...
          </p>
        )}
        {error && !loading && (
          <p className="mt-1 text-[11px] text-red-600">{error}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] text-[#717182]">Page Visits</p>
          <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
            {pageViewsCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] text-[#717182]">Number of Purchases</p>
          <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
            {purchasesCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] text-[#717182]">Most Viewed Product</p>
          <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
            {mostViewedLabel}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-[11px] text-[#717182]">Last Purchase Date</p>
          <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
            {lastPurchaseLabel}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p className="text-[11px] text-[#717182]">Total Purchase Value</p>
        <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">
          {formatCurrencyGHS(totalValue)}
        </p>
      </div>
    </div>
  );
}

function AuditTrailSection({
  registry,
  event,
  hostName,
  approvalDate,
  approvedBy,
}) {
  const entries = [];

  if (registry?.created_at) {
    entries.push({
      title: "Registry Created",
      by: hostName || "—",
      at: registry.created_at,
    });
  }

  if (approvalDate) {
    entries.push({
      title: "Registry Approved",
      by: approvedBy || hostName || "—",
      at: approvalDate,
    });
  }

  return (
    <div className="space-y-3 text-xs text-[#0A0A0A]">
      <p className="text-[11px] font-medium text-[#717182]">Audit Trail</p>
      <p className="text-[11px] text-[#717182]">
        All administrative actions on this registry based on available
        timestamps.
      </p>

      {!entries.length ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-[11px] text-[#717182]">
          No audit events available for this registry yet.
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
                    By: {entry.by} · {formatDate(entry.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
