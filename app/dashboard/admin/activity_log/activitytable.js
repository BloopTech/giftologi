"use client";
import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { PiDownloadSimple } from "react-icons/pi";
import { tv } from "tailwind-variants";
import { useActivityLogContext } from "./context";
import { Badge } from "@/app/components/Badge";
import { cx } from "@/app/components/utils";
import ActivityDetailsModal from "./activitydetailsmodal";

const tableStyles = tv({
  slots: {
    wrapper: "mt-4 overflow-x-auto border border-[#D6D6D6] rounded-xl bg-white",
    table: "min-w-full divide-y divide-gray-200",
    headRow: "bg-[#F9FAFB]",
    headCell:
      "px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide",
    bodyRow: "border-b last:border-b-0 hover:bg-gray-50/60",
    bodyCell: "px-4 py-3 text-xs text-[#0A0A0A] align-middle whitespace-nowrap",
  },
});

const { wrapper, table, headRow, headCell, bodyRow, bodyCell } = tableStyles();

export default function ActivityLogTable() {
  const context = useActivityLogContext() || {};

  const {
    logs = [],
    total = 0,
    loading = false,
    pageIndex = 0,
    pageSize = 8,
    pageCount = 1,
    pageStart = 0,
    pageEnd = 0,
    exporting = false,
    exportLogs,
    setPageIndex,
    hasRealData = true,
    focusId,
  } = context;

  const [selectedActivity, setSelectedActivity] = React.useState(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const lastAppliedFocusIdRef = useRef("");
  const focusIdValue = focusId ? String(focusId).trim() : "";

  useEffect(() => {
    if (!focusIdValue) return;
    if (!logs || !logs.length) return;
    if (lastAppliedFocusIdRef.current === focusIdValue) return;

    const match = logs.find((row) => String(row?.id) === focusIdValue);
    if (!match) return;

    lastAppliedFocusIdRef.current = focusIdValue;
    setSelectedActivity(match);
    setDetailsOpen(true);

    if (match.id) {
      const el = document.getElementById(`activity-row-${match.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusIdValue, logs]);

  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  const handlePreviousPage = () => {
    if (!setPageIndex) return;
    setPageIndex(Math.max(pageIndex - 1, 0));
  };

  const handleNextPage = () => {
    if (!setPageIndex) return;
    setPageIndex(canNext ? pageIndex + 1 : pageIndex);
  };

  const handleExport = async () => {
    if (!exportLogs) return;
    await exportLogs();
  };

  const handleView = (row) => {
    setSelectedActivity(row);
    setDetailsOpen(true);
  };

  const handleCloseModal = () => {
    setDetailsOpen(false);
    setSelectedActivity(null);
  };

  return (
    <div className={cx(wrapper(), "w-full")}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between w-full">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium text-[#0A0A0A]">
            Admin Activity History
          </h2>
          <p className="text-[11px] text-[#717182]">
            Complete audit trail stored in{" "}
            <span className="font-mono">admin_activity_log</span> table.
          </p>
        </div>
        <div className="flex justify-end self-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !exportLogs || total === 0 || !hasRealData}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-[#3979D2] bg-[#3979D2] px-4 py-1.5 text-[11px] font-medium text-white hover:bg-white hover:text-[#3979D2] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <PiDownloadSimple className="size-4" />
            <span>{exporting ? "Exporting..." : "Export log"}</span>
          </button>
        </div>
      </div>

      <table className={cx(table())}>
        <thead>
          <tr className={cx(headRow())}>
            <th className={cx(headCell())}>Timestamp</th>
            <th className={cx(headCell())}>Admin User</th>
            <th className={cx(headCell())}>Action</th>
            <th className={cx(headCell())}>Entity</th>
            <th className={cx(headCell())}>Target ID</th>
            <th className={cx(headCell())}>Details</th>
            <th className={cx(headCell())}>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading activity log...
              </td>
            </tr>
          ) : logs.length ? (
            logs.map((row) => {
              const isFocused =
                !!focusIdValue && String(row?.id) === String(focusIdValue);

              return (
                <tr
                  key={row.id || row.timestamp}
                  id={row?.id ? `activity-row-${row.id}` : undefined}
                  className={cx(
                    bodyRow(),
                    isFocused && "bg-[#EDF4FF] ring-2 ring-inset ring-[#B8D4FF]"
                  )}
                >
                <td className={cx(bodyCell())}>
                  <span className="text-xs text-[#0A0A0A]">
                    {row.timestampLabel || "—"}
                  </span>
                </td>
                <td className={cx(bodyCell())}>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#0A0A0A]">
                      {row.adminName || row.adminEmail || "—"}
                    </span>
                    {row.adminEmail && row.adminName && (
                      <span className="text-[11px] text-[#717182]">
                        {row.adminEmail}
                      </span>
                    )}
                  </div>
                </td>
                <td className={cx(bodyCell())}>
                  <Badge
                    variant={row.actionVariant || "neutral"}
                    className="text-[11px] capitalize"
                  >
                    {row.actionLabel || "—"}
                  </Badge>
                </td>
                <td className={cx(bodyCell())}>
                  <span className="text-xs text-[#6A7282] capitalize">
                    {row.entity || "—"}
                  </span>
                </td>
                <td className={cx(bodyCell())}>
                  <span className="text-xs font-mono text-[#0A0A0A]">
                    {row.targetId || "—"}
                  </span>
                </td>
                <td className={cx(bodyCell())}>
                  <span className="text-xs text-[#717182] max-w-xs inline-block truncate align-middle">
                    {row.details || "—"}
                  </span>
                </td>
                <td className={cx(bodyCell())}>
                  <button
                    type="button"
                    onClick={() => handleView(row)}
                    className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-2 py-1 text-[11px] text-[#3979D2] hover:border-[#3979D2] hover:bg-[#F3F8FF] cursor-pointer"
                  >
                    <Eye className="size-3 mr-1" />
                    <span>View</span>
                  </button>
                </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                {"No activity found for the selected filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ActivityDetailsModal
        open={detailsOpen}
        onClose={handleCloseModal}
        activity={selectedActivity}
      />

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {total === 0
            ? "No activity logs to display"
            : `Showing ${pageStart} - ${pageEnd} of ${total} logs`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={!canPrevious}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[#3979D2]",
              !canPrevious
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-[#3979D2] bg-white hover:bg-[#3979D2] hover:text-white cursor-pointer"
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs text-[#0A0A0A]">
            {pageCount ? pageIndex + 1 : 0} / {Math.max(pageCount, 1)}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!canNext}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[#3979D2]",
              !canNext
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-[#3979D2] bg-white hover:bg-[#3979D2] hover:text-white cursor-pointer"
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
