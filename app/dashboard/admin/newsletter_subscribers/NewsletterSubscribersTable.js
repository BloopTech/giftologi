"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/app/components/Badge";
import { toast } from "sonner";
import { useNewsletterSubscribersContext } from "./context";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusVariant = (status) => {
  if (status === "subscribed") return "success";
  if (status === "unsubscribed") return "warning";
  return "neutral";
};

export default function NewsletterSubscribersTable() {
  const {
    rows,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    searchTerm,
    statusFilter,
    sourceFilter,
    fromDate,
    toDate,
    refresh,
  } = useNewsletterSubscribersContext() || {};

  const [exportingCsv, setExportingCsv] = React.useState(false);
  const [actionSubscriberId, setActionSubscriberId] = React.useState("");

  const safeRows = Array.isArray(rows) ? rows : [];
  const safePage = Number(page) || 1;
  const safePageSize = Number(pageSize) || 10;
  const safeTotal = Number(total) || 0;

  const pageCount = safeTotal > 0 ? Math.ceil(safeTotal / safePageSize) : 1;
  const pageStart = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const pageEnd =
    safeTotal === 0 ? 0 : Math.min(safeTotal, safePage * safePageSize);

  const canPrevious = safePage > 1;
  const canNext = safePage < pageCount;

  const buildQueryParams = React.useCallback(() => {
    const params = new URLSearchParams();

    params.set("status", statusFilter || "all");
    params.set("source", sourceFilter || "all");
    if (searchTerm) params.set("q", searchTerm);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    return params;
  }, [statusFilter, sourceFilter, searchTerm, fromDate, toDate]);

  const downloadCsv = React.useCallback(async () => {
    setExportingCsv(true);
    try {
      const params = buildQueryParams();
      params.set("format", "csv");

      const response = await fetch(
        `/api/admin/newsletter-subscribers?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to export CSV");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const fallback = `newsletter_subscribers_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      anchor.href = objectUrl;
      anchor.download = filenameMatch?.[1] || fallback;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("CSV exported successfully");
    } catch (exportError) {
      toast.error(exportError?.message || "Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  }, [buildQueryParams]);

  const toggleSubscriptionStatus = React.useCallback(
    async (subscriber) => {
      const currentStatus = String(subscriber?.status || "").toLowerCase();
      const nextStatus =
        currentStatus === "subscribed" ? "unsubscribed" : "subscribed";

      setActionSubscriberId(String(subscriber?.id || ""));
      try {
        const response = await fetch("/api/admin/newsletter-subscribers", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: subscriber?.id,
            status: nextStatus,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to update subscriber status");
        }

        toast.success(
          nextStatus === "subscribed"
            ? "Subscriber re-subscribed"
            : "Subscriber unsubscribed",
        );
        refresh?.();
      } catch (updateError) {
        toast.error(updateError?.message || "Failed to update subscriber status");
      } finally {
        setActionSubscriberId("");
      }
    },
    [refresh],
  );

  return (
    <div className="mt-4 overflow-x-auto border border-[#D6D6D6] rounded-xl bg-white">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium text-[#0A0A0A]">Subscribers</h2>
          <p className="text-[11px] text-[#717182]">{safeTotal} records found</p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={exportingCsv}
          className="rounded-full border border-primary bg-primary px-4 py-1.5 text-[11px] text-white hover:bg-white hover:text-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exportingCsv ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-[#F9FAFB]">
            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide">
              Email
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide">
              Source
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide">
              Subscribed At
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide">
              Last Subscribed At
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide">
              Unsubscribed At
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-medium text-[#6A7282] tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#717182]">
                Loading subscribers...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-xs text-red-600">
                {error}
              </td>
            </tr>
          ) : safeRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#717182]">
                No subscribers found matching your filters.
              </td>
            </tr>
          ) : (
            safeRows.map((row) => {
              const status = String(row?.status || "").toLowerCase();
              return (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-xs text-[#0A0A0A]">{row.email || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#0A0A0A]">
                    <Badge variant={getStatusVariant(status)} className="text-[11px]">
                      {status || "unknown"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#0A0A0A]">{row.source || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#6A7282]">
                    {formatDate(row.subscribed_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6A7282]">
                    {formatDate(row.last_subscribed_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6A7282]">
                    {formatDate(row.unsubscribed_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSubscriptionStatus(row)}
                      disabled={actionSubscriberId === row.id}
                      className={`rounded-full px-3 py-1 text-[11px] border cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                        status === "subscribed"
                          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {actionSubscriberId === row.id
                        ? "Updating..."
                        : status === "subscribed"
                          ? "Unsubscribe"
                          : "Resubscribe"}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {safeTotal === 0
            ? "No subscribers to display"
            : `${pageStart} - ${pageEnd} of ${safeTotal}`}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage?.((previous) => Math.max((previous || 1) - 1, 1))}
            disabled={!canPrevious}
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              canPrevious
                ? "border-[#3979D2] bg-white text-[#3979D2] hover:bg-[#3979D2] hover:text-white cursor-pointer"
                : "border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs text-[#0A0A0A]">
            {safePage} / {Math.max(pageCount, 1)}
          </span>
          <button
            type="button"
            onClick={() => setPage?.((previous) => (canNext ? (previous || 1) + 1 : previous || 1))}
            disabled={!canNext}
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              canNext
                ? "border-[#3979D2] bg-white text-[#3979D2] hover:bg-[#3979D2] hover:text-white cursor-pointer"
                : "border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
