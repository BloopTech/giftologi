"use client";

import React, { useEffect, useMemo, useRef, useState, useActionState } from "react";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/app/components/Tooltip";
import { usePayoutsContext } from "./context";
import { useDashboardContext } from "../context";
import { approvePayout, markPayoutPaid, deleteDraftPayout, requestVendorPaymentInfo } from "./action";
import { PiDownloadSimple, PiWarning } from "react-icons/pi";

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
  draft: "neutral",
  approved: "warning",
  processing: "warning",
  completed: "success",
  failed: "error",
};

const initialActionState = { message: "", errors: {}, data: {} };

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
  const [approveOpen, setApproveOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const lastAppliedFocusIdRef = useRef("");

  const {
    payouts,
    payoutsPage,
    pageSize,
    payoutsTotal,
    loadingPayouts,
    setPayoutsPage,
    refreshPayouts,
    focusId,
  } = usePayoutsContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const allowedActionRoles = ["super_admin", "finance_admin", "operations_manager_admin"];
  const canAct =
    !!currentAdmin && allowedActionRoles.includes(currentAdmin.role);

  const [approveState, approveAction, approvePending] = useActionState(
    approvePayout,
    initialActionState
  );

  const [markPaidState, markPaidAction, markPaidPending] = useActionState(
    markPayoutPaid,
    initialActionState
  );

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDraftPayout,
    initialActionState
  );

  const [reqInfoState, reqInfoAction, reqInfoPending] = useActionState(
    requestVendorPaymentInfo,
    initialActionState
  );

  // Handle action results
  useEffect(() => {
    if (!approveState?.message) return;
    if (approveState.data && Object.keys(approveState.data).length) {
      toast.success(approveState.message);
      refreshPayouts?.();
      setApproveOpen(false);
      setSelectedRow(null);
    } else {
      toast.error(approveState.message);
    }
  }, [approveState, refreshPayouts]);

  useEffect(() => {
    if (!markPaidState?.message) return;
    if (markPaidState.data && Object.keys(markPaidState.data).length) {
      toast.success(markPaidState.message);
      refreshPayouts?.();
      setMarkPaidOpen(false);
      setSelectedRow(null);
      setPaymentRef("");
      setPaymentMethod("bank_transfer");
    } else {
      toast.error(markPaidState.message);
    }
  }, [markPaidState, refreshPayouts]);

  useEffect(() => {
    if (!deleteState?.message) return;
    if (deleteState.data && Object.keys(deleteState.data).length) {
      toast.success(deleteState.message);
      refreshPayouts?.();
      setDeleteOpen(false);
      setSelectedRow(null);
    } else {
      toast.error(deleteState.message);
    }
  }, [deleteState, refreshPayouts]);

  useEffect(() => {
    if (!reqInfoState?.message) return;
    if (reqInfoState.data && Object.keys(reqInfoState.data).length) {
      toast.success(reqInfoState.message);
    } else {
      toast.error(reqInfoState.message);
    }
  }, [reqInfoState]);

  const tableRows = useMemo(() => {
    if (!payouts || !payouts.length) return [];
    return payouts;
  }, [payouts]);

  const focusIdValue = focusId ? String(focusId).trim() : "";

  useEffect(() => {
    if (!focusIdValue) return;
    if (!tableRows || !tableRows.length) return;
    if (lastAppliedFocusIdRef.current === focusIdValue) return;

    const match = tableRows.find(
      (row) =>
        String(row.id) === focusIdValue ||
        String(row.vendorId) === focusIdValue
    );

    if (!match) return;

    lastAppliedFocusIdRef.current = focusIdValue;
    setSelectedRow(match);
    setViewOpen(true);

    if (match.id) {
      const el = document.getElementById(`payout-row-${match.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusIdValue, tableRows]);

  const handleExportCsv = () => {
    if (!tableRows || !tableRows.length) {
      toast.info("No payouts to export.");
      return;
    }

    const headers = [
      "Period",
      "Vendor Name",
      "Gross (GHS)",
      "Commission (GHS)",
      "Vendor Net (GHS)",
      "Items",
      "Orders",
      "Payment Method",
      "Payment Ref",
      "Status",
    ];

    const escapeCell = (value) => {
      if (value === null || typeof value === "undefined") return "";
      const str = String(value);
      if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = tableRows.map((row) => {
      const cells = [
        row.periodLabel || "",
        row.vendorName || "",
        row.grossLabel || "",
        row.commissionLabel || "",
        row.vendorNetLabel || "",
        row.totalItems ?? "",
        row.totalOrders ?? "",
        row.payoutMethodLabel || "",
        row.paymentReference || "",
        row.statusLabel || "",
      ];
      return cells.map(escapeCell).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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

  const anyPending = approvePending || markPaidPending || deletePending || reqInfoPending;

  const columns = useMemo(
    () => [
      columnHelper.accessor("vendorName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Vendor" />
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col">
              <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
              {!row.hasPaymentInfo && (
                <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                  <PiWarning className="size-3" /> No payment info
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("periodLabel", {
        header: "Period",
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("vendorNetLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Vendor Net (GHS)" />
        ),
        cell: (info) => (
          <span className="text-xs font-medium text-[#0A0A0A]">{info.getValue()}</span>
        ),
        sortingFn: (rowA, rowB) =>
          (rowA.original.totalVendorNet || 0) - (rowB.original.totalVendorNet || 0),
      }),
      columnHelper.accessor("grossLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Gross (GHS)" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
        sortingFn: (rowA, rowB) =>
          (rowA.original.totalGross || 0) - (rowB.original.totalGross || 0),
      }),
      columnHelper.accessor("commissionLabel", {
        header: "Commission",
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("payoutMethodLabel", {
        header: "Method",
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("totalItems", {
        header: "Items",
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("statusLabel", {
        header: "Status",
        cell: (info) => {
          const row = info.row.original;
          const variant = statusVariantMap[row.status] || "neutral";
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

          if (!canAct) {
            return (
              <div className="flex justify-end text-[11px] text-[#B0B7C3]">
                View only
              </div>
            );
          }

          const handleView = () => {
            setSelectedRow(original);
            setViewOpen(true);
          };

          const handleApprove = () => {
            setSelectedRow(original);
            setApproveOpen(true);
          };

          const handleMarkPaid = () => {
            setSelectedRow(original);
            setPaymentRef("");
            setPaymentMethod("bank_transfer");
            setMarkPaidOpen(true);
          };

          const handleDelete = () => {
            setSelectedRow(original);
            setDeleteOpen(true);
          };

          const handleRequestInfo = () => {
            const fd = new FormData();
            fd.set("vendorId", original.vendorId);
            reqInfoAction(fd);
          };

          return (
            <div className="flex justify-end items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleView}
                    aria-label="View payout details"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View details</TooltipContent>
              </Tooltip>

              {original.status === "draft" && (
                <>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={anyPending}
                    className={cx(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer border",
                      "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                      anyPending && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={anyPending}
                    className={cx(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer border",
                      "border-red-400 text-red-500 bg-white hover:bg-red-500 hover:text-white",
                      anyPending && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    Delete
                  </button>
                </>
              )}

              {original.status === "approved" && (
                <button
                  type="button"
                  onClick={handleMarkPaid}
                  disabled={anyPending}
                  className={cx(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer border",
                    "border-primary text-white bg-primary hover:bg-white hover:text-primary",
                    anyPending && "opacity-60 cursor-not-allowed"
                  )}
                >
                  Mark Paid
                </button>
              )}

              {!original.hasPaymentInfo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleRequestInfo}
                      disabled={anyPending}
                      className={cx(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer border",
                        "border-amber-400 text-amber-600 bg-white hover:bg-amber-500 hover:text-white",
                        anyPending && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      Request Info
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Notify vendor to update payment details</TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      }),
    ],
    [canAct, anyPending, reqInfoAction]
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
          <h2 className="text-xs font-medium text-[#0A0A0A]">Payout Periods</h2>
          <p className="text-[11px] text-[#717182]">
            {totalRows || 0} payout records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex space-x-2 items-center justify-center rounded-full border border-primary px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary hover:text-white cursor-pointer"
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
            tableInstance.getRowModel().rows.map((row) => {
              const original = row.original;
              const isFocused =
                !!focusIdValue &&
                (String(original.id) === focusIdValue ||
                  String(original.vendorId) === focusIdValue);
              const rowDomId = original?.id
                ? `payout-row-${original.id}`
                : undefined;

              return (
                <tr
                  key={row.id}
                  id={rowDomId}
                  className={cx(
                    bodyRow(),
                    isFocused &&
                      "outline outline-[#3979D2] outline-offset-[-1px] bg-[#EEF4FF]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cx(bodyCell())}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                No payouts found. Generate payouts from the vendor calendar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Payout Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Auto-calculated payout breakdown.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.vendorName || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Period</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.periodLabel || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-medium">Gross</p>
                  <p className="text-[#6A7282]">GHS {selectedRow.grossLabel}</p>
                </div>
                <div>
                  <p className="font-medium">Commission</p>
                  <p className="text-[#6A7282]">GHS {selectedRow.commissionLabel}</p>
                </div>
                <div>
                  <p className="font-medium text-[#0A0A0A]">Vendor Net</p>
                  <p className="font-semibold text-[#0A0A0A]">GHS {selectedRow.vendorNetLabel}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-medium">Items</p>
                  <p className="text-[#6A7282]">{selectedRow.totalItems}</p>
                </div>
                <div>
                  <p className="font-medium">Orders</p>
                  <p className="text-[#6A7282]">{selectedRow.totalOrders}</p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <Badge variant={statusVariantMap[selectedRow.status] || "neutral"} className="text-[11px]">
                    {selectedRow.statusLabel}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-[#6A7282]">{selectedRow.payoutMethodLabel}</p>
                </div>
                <div>
                  <p className="font-medium">Payment Ref</p>
                  <p className="text-[#6A7282]">{selectedRow.paymentReference || "—"}</p>
                </div>
              </div>
              {selectedRow.notes && (
                <div>
                  <p className="font-medium">Notes</p>
                  <p className="text-[#6A7282]">{selectedRow.notes}</p>
                </div>
              )}
              {!selectedRow.hasPaymentInfo && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-center gap-2">
                  <PiWarning className="size-4 text-red-500" />
                  <span className="text-[11px] text-red-600">
                    This vendor has not registered payment details.
                  </span>
                </div>
              )}
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

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Approve Payout
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Approve this draft payout for payment?
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <form
              action={approveAction}
              className="mt-3 space-y-3 text-xs text-[#0A0A0A]"
            >
              <input type="hidden" name="payoutPeriodId" value={selectedRow.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor</p>
                  <p className="text-[#6A7282]">{selectedRow.vendorName || "—"}</p>
                </div>
                <div>
                  <p className="font-medium">Vendor Net</p>
                  <p className="font-semibold">GHS {selectedRow.vendorNetLabel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Period</p>
                  <p className="text-[#6A7282]">{selectedRow.periodLabel}</p>
                </div>
                <div>
                  <p className="font-medium">Method</p>
                  <p className="text-[#6A7282]">{selectedRow.payoutMethodLabel}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={approvePending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={approvePending}
                  className={cx(
                    "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                    "border-[#6EA30B] bg-[#6EA30B] text-white hover:bg-white hover:text-[#6EA30B]",
                    approvePending && "opacity-60 cursor-not-allowed"
                  )}
                >
                  Approve Payout
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Mark Payout as Paid
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Enter the payment reference after transferring funds.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <form
              action={markPaidAction}
              className="mt-3 space-y-3 text-xs text-[#0A0A0A]"
            >
              <input type="hidden" name="payoutPeriodId" value={selectedRow.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor</p>
                  <p className="text-[#6A7282]">{selectedRow.vendorName || "—"}</p>
                </div>
                <div>
                  <p className="font-medium">Vendor Net</p>
                  <p className="font-semibold">GHS {selectedRow.vendorNetLabel}</p>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="payment-method" className="text-xs font-medium text-[#0A0A0A]">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  id="payment-method"
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="momo">Mobile Money</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="payment-ref" className="text-xs font-medium text-[#0A0A0A]">
                  Payment Reference <span className="text-red-500">*</span>
                </label>
                <input
                  id="payment-ref"
                  name="paymentReference"
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                  placeholder="e.g. TXN-123456789"
                  disabled={markPaidPending}
                />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={markPaidPending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={markPaidPending || !paymentRef.trim()}
                  className={cx(
                    "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                    "border-primary bg-primary text-white hover:bg-white hover:text-primary",
                    (markPaidPending || !paymentRef.trim()) &&
                      "opacity-60 cursor-not-allowed"
                  )}
                >
                  Mark as Paid
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Draft Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Delete Draft Payout
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              This will unlink all order items and delete the draft. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <form action={deleteAction} className="mt-3 space-y-3 text-xs">
              <input type="hidden" name="payoutPeriodId" value={selectedRow.id} />
              <p className="text-[#0A0A0A]">
                <span className="font-medium">{selectedRow.vendorName}</span> — GHS {selectedRow.vendorNetLabel}
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={deletePending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={deletePending}
                  className={cx(
                    "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                    "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-600",
                    deletePending && "opacity-60 cursor-not-allowed"
                  )}
                >
                  Delete
                </button>
              </div>
            </form>
          )}
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
              "flex h-7 w-7 items-center justify-center rounded-full border text-primary",
              !canPrevious
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-primary bg-white hover:bg-primary hover:text-white cursor-pointer"
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
              "flex h-7 w-7 items-center justify-center rounded-full border text-primary",
              !canNext
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-primary bg-white hover:bg-primary hover:text-white cursor-pointer"
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
