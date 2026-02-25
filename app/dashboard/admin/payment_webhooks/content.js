"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const parseJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

export default function PaymentWebhooksContent() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          "id, order_code, status, payment_method, payment_reference, payment_response, created_at, updated_at"
        )
        .not("payment_response", "is", null)
        .order("updated_at", { ascending: false })
        .limit(250);

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to load webhook outcomes.");
      }

      const mapped = (data || [])
        .map((order) => {
          const paymentResponse = parseJsonObject(order.payment_response);
          const webhookDebug = parseJsonObject(paymentResponse?.webhook_debug);
          if (!webhookDebug) return null;

          const outcome = String(webhookDebug.outcome || "unknown");
          const stage = String(webhookDebug.stage || "—");
          const source = String(webhookDebug.source || "—");
          const orderStatus = String(
            webhookDebug.order_status || order.status || "unknown"
          );
          const receivedAt = webhookDebug.received_at || null;

          return {
            id: order.id,
            orderCode: order.order_code || "—",
            outcome,
            stage,
            source,
            orderStatus,
            paymentMethod: order.payment_method || "—",
            paymentReference:
              webhookDebug.payment_reference || order.payment_reference || "—",
            tokenSuffix: webhookDebug.token_suffix || "—",
            queryTokenSuffix: webhookDebug.query_token_suffix || "—",
            receivedAt,
            updatedAt: order.updated_at || null,
          };
        })
        .filter(Boolean);

      setRows(mapped);
    } catch (loadError) {
      setError(loadError?.message || "Failed to load webhook outcomes.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const outcomeCounts = useMemo(() => {
    return rows.reduce((acc, row) => {
      const key = row.outcome || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = String(search || "")
      .trim()
      .toLowerCase();

    if (!query) return rows;

    return rows.filter((row) => {
      return [
        row.orderCode,
        row.outcome,
        row.stage,
        row.orderStatus,
        row.paymentReference,
        row.source,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [rows, search]);

  return (
    <section className="flex flex-col space-y-4 w-full mb-8" aria-label="Payment webhook outcomes">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Payment Webhook Outcomes
          </h1>
          <p className="text-[#717182] text-xs/4 font-brasley-medium">
            Latest webhook outcome saved per order from ExpressPay callbacks.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRows}
          className="w-full md:w-auto rounded-full border border-primary bg-primary px-5 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-[#D6D6D6] rounded-xl p-3">
          <p className="text-[11px] text-[#717182]">Tracked orders</p>
          <p className="text-base font-medium text-[#0A0A0A]">{rows.length}</p>
        </div>
        <div className="bg-white border border-[#D6D6D6] rounded-xl p-3 md:col-span-2">
          <p className="text-[11px] text-[#717182] mb-2">Outcome distribution</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(outcomeCounts).length ? (
              Object.entries(outcomeCounts).map(([key, count]) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#374151]"
                >
                  {key}: {count}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[#717182]">No saved outcomes yet.</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D6D6D6] rounded-xl p-4">
        <div className="mb-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order, outcome, stage, status, or reference"
            className="w-full rounded-full border border-[#D6D6D6] px-4 py-2 text-xs text-[#0A0A0A] outline-none"
          />
        </div>

        {error ? (
          <p className="text-xs text-[#B91C1C]">{error}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Order</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Outcome</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Stage</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Order Status</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Method</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Reference</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Token Suffix</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-[#6B7280]">
                    Loading webhook outcomes...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-3 text-sm text-[#111827]">
                      <Link
                        href={`/dashboard/admin/transactions?focusId=${row.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {row.orderCode}
                      </Link>
                      <div className="text-xs text-[#6B7280]">{row.source}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#111827]">{row.outcome}</td>
                    <td className="px-3 py-3 text-xs text-[#111827]">{row.stage}</td>
                    <td className="px-3 py-3 text-xs text-[#111827]">{row.orderStatus}</td>
                    <td className="px-3 py-3 text-xs text-[#111827]">{row.paymentMethod}</td>
                    <td className="px-3 py-3 text-xs text-[#111827]">{row.paymentReference}</td>
                    <td className="px-3 py-3 text-xs text-[#111827]">
                      {row.tokenSuffix} / {row.queryTokenSuffix}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#111827]">
                      <div>{formatDateTime(row.receivedAt)}</div>
                      <div className="text-[#6B7280]">
                        Updated: {formatDateTime(row.updatedAt)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-[#6B7280]">
                    No webhook outcomes found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
