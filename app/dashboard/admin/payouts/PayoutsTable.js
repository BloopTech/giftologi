"use client";

import React, { useEffect, useMemo, useState, useActionState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { tv } from "tailwind-variants";
import { toast } from "sonner";
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/Tooltip";
import { usePayoutsContext } from "./context";
import { useDashboardContext } from "../context";
import { updateVendorPayoutApproval } from "./action";
import { PiDownloadSimple } from "react-icons/pi";

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

const columnHelper = createColumnHelper();

const statusVariantMap = {
  pending: "neutral",
  awaiting_super_admin: "warning",
  awaiting_finance: "warning",
  in_review: "warning",
  approved: "success",
};

const initialUpdatePayoutState = {
  message: "",
  errors: {
    vendorId: [],
  },
  values: {},
  data: {},
};

function SortableHeader({ column, title }) {
  const sorted = column.getIsSorted();

  let Icon = ChevronsUpDown;
  let iconClassName = "size-3 text-[#B0B7C3]";

  if (sorted === "asc") {
    Icon = ChevronUp;
    iconClassName = "size-3 text-[#427ED3]";
  } else if (sorted === "desc") {
    Icon = ChevronDown;
    iconClassName = "size-3 text-[#427ED3]";
  }

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="inline-flex items-center gap-1"
    >
      <span>{title}</span>
      <Icon className={iconClassName} />
    </button>
  );
}

export default function PayoutsTable() {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const {
    payouts,
    payoutsPage,
    pageSize,
    payoutsTotal,
    loadingPayouts,
    setPayoutsPage,
    refreshPayouts,
  } = usePayoutsContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const allowedActionRoles = ["super_admin", "finance_admin"];
  const canApprove =
    !!currentAdmin && allowedActionRoles.includes(currentAdmin.role);
  const isFinanceAdmin = currentAdmin?.role === "finance_admin";
  const isSuperAdmin = currentAdmin?.role === "super_admin";

  const [updateState, updateAction, updatePending] = useActionState(
    updateVendorPayoutApproval,
    initialUpdatePayoutState
  );

  useEffect(() => {
    if (!updateState) return;
    if (
      updateState.message &&
      updateState.data &&
      Object.keys(updateState.data).length
    ) {
      toast.success(updateState.message);
      refreshPayouts?.();
    } else if (
      updateState.message &&
      updateState.errors &&
      Object.keys(updateState.errors).length
    ) {
      toast.error(updateState.message);
    }
  }, [updateState, refreshPayouts]);

  const tableRows = useMemo(() => {
    if (!payouts || !payouts.length) return [];
    return payouts;
  }, [payouts]);

  const handleExportCsv = () => {
    if (!tableRows || !tableRows.length) {
      toast.info("No payouts to export.");
      return;
    }

    const headers = [
      "Payout ID",
      "Vendor Name",
      "Total Sales (GHS)",
      "Pending Payout (GHS)",
      "Payout Method",
      "Orders",
      "Period",
      "Status",
    ];

    const escapeCell = (value) => {
      if (value === null || typeof value === "undefined") return "";
      const str = String(value);
      if (str.includes("\"") || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = tableRows.map((row) => {
      const cells = [
        row.payoutCode || "",
        row.vendorName || "",
        row.totalSalesLabel || "",
        row.pendingPayoutLabel || "",
        row.payoutMethodLabel || "",
        typeof row.orderCount === "number" && Number.isFinite(row.orderCount)
          ? row.orderCount
          : "",
        row.periodLabel || "",
        row.statusLabel || "",
      ];
      return cells.map(escapeCell).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vendor_payouts_${new Date().toISOString().slice(0, 19)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("payoutCode", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Payout ID" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("vendorName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Vendor Name" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("totalSalesLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Total Sales (GHS)" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("pendingPayoutLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Pending Payout (GHS)" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("payoutMethodLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Payout Method" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("orderCount", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Orders" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("periodLabel", {
        header: "Period",
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("statusLabel", {
        header: "Status",
        cell: (info) => {
          const row = info.row.original;
          const variant = statusVariantMap[row.normalizedStatus] || "neutral";
          return (
            <Badge variant={variant} className="text-[11px]">
              {info.getValue()}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const original = row.original;

          if (!canApprove) {
            return (
              <div className="flex justify-end text-[11px] text-[#B0B7C3]">
                No actions
              </div>
            );
          }

          const disabled = updatePending || !original.vendorId;

          const handleView = () => {
            setSelectedRow(original);
            setViewOpen(true);
          };

          const approvalLabel = (() => {
            if (original.normalizedStatus === "approved") return "Approved";
            if (original.normalizedStatus === "awaiting_super_admin")
              return "Approve as Super Admin";
            if (original.normalizedStatus === "awaiting_finance")
              return "Approve as Finance";
            return "Approve";
          })();

          const canSubmit =
            (isFinanceAdmin || isSuperAdmin) &&
            original.normalizedStatus !== "approved";

          return (
            <div className="flex justify-end items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleView}
                    aria-label="View payout details"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View payout</TooltipContent>
              </Tooltip>
              <form action={updateAction}>
                <input
                  type="hidden"
                  name="vendorId"
                  value={original.vendorId}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      disabled={disabled || !canSubmit}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                        "border-[#6EA30B] text:white bg-[#6EA30B] hover:bg:white hover:text-[#6EA30B]",
                        (disabled || !canSubmit) &&
                          "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text:white"
                      )}
                    >
                      {approvalLabel}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{approvalLabel}</TooltipContent>
                </Tooltip>
              </form>
            </div>
          );
        },
      }),
    ],
    [canApprove, isFinanceAdmin, isSuperAdmin, updateAction, updatePending]
  );

  const tableInstance = useReactTable({
    data: tableRows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRows = payoutsTotal ?? tableRows.length;
  const pageIndex = payoutsPage ?? 0;
  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  return (
    <div className={cx(wrapper())}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium text-[#0A0A0A]">Vendor Payouts</h2>
          <p className="text-[11px] text-[#717182]">
            {totalRows || 0} payouts found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex space-x-2 items-center justify-center rounded-full border border-[#3979D2] px-3 py-1 text-[11px] font-medium text-[#3979D2] hover:bg-[#3979D2] hover:text:white cursor-pointer"
              >
                <PiDownloadSimple className="size-4" />
                <span>Export CSV</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Export payouts to CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <table className={cx(table())}>
        <thead>
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className={cx(headRow())}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className={cx(headCell())}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loadingPayouts ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading payouts...
              </td>
            </tr>
          ) : tableInstance.getRowModel().rows.length ? (
            tableInstance.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cx(bodyRow())}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cx(bodyCell())}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                No payouts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Payout Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              View payout information and context.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              <div>
                <p className="font-medium">Payout ID</p>
                <p className="text-[#6A7282]">{selectedRow.payoutCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.vendorName || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Orders</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.orderCount ?? 0}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Total Sales (GHS)</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.totalSalesLabel || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Pending Payout (GHS)</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.pendingPayoutLabel || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Payout Method</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.payoutMethodLabel || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.statusLabel || "Pending"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Period</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.periodLabel || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Order IDs</p>
                  <p className="text-[#6A7282] break-all">
                    {Array.isArray(selectedRow.orderIds) &&
                    selectedRow.orderIds.length
                      ? selectedRow.orderIds.join(", ")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <button className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer">
                Close
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No payouts to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setPayoutsPage?.((prev) => (prev > 0 ? prev - 1 : 0))
            }
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
            {pageIndex + 1} / {Math.max(pageCount, 1)}
          </span>
          <button
            type="button"
            onClick={() =>
              setPayoutsPage?.((prev) => (canNext ? prev + 1 : prev))
            }
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
