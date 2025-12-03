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
import { useViewTransactionsContext } from "./context";
import { useDashboardContext } from "../context";
import { updateOrderStatus } from "./action";

const tableStyles = tv({
  slots: {
    wrapper:
      "mt-4 overflow-x-auto border border-[#D6D6D6] rounded-xl bg-white",
    table: "min-w-full divide-y divide-gray-200",
    headRow: "bg-[#F9FAFB]",
    headCell:
      "px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] tracking-wide",
    bodyRow: "border-b last:border-b-0 hover:bg-gray-50/60",
    bodyCell:
      "px-4 py-3 text-xs text-[#0A0A0A] align-middle whitespace-nowrap",
  },
});

const { wrapper, table, headRow, headCell, bodyRow, bodyCell } = tableStyles();

const columnHelper = createColumnHelper();

const statusVariantMap = {
  pending: "neutral",
  paid: "success",
  shipped: "success",
  delivered: "success",
  cancelled: "error",
  disputed: "error",
};

const deliveryStatusVariantMap = {
  delivered: "success",
  shipped: "success",
  pending: "neutral",
  paid: "neutral",
  cancelled: "error",
};

const initialUpdateOrderStatusState = {
  message: "",
  errors: {
    orderId: [],
    newStatus: [],
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

export default function TransactionsTable() {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const {
    transactions,
    transactionsPage,
    pageSize,
    transactionsTotal,
    loadingTransactions,
    setTransactionsPage,
    refreshTransactions,
  } = useViewTransactionsContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const allowedActionRoles = [
    "super_admin",
    "finance_admin",
    "operations_manager_admin",
  ];
  const canModerate =
    !!currentAdmin && allowedActionRoles.includes(currentAdmin.role);

  const [updateState, updateAction, updatePending] = useActionState(
    updateOrderStatus,
    initialUpdateOrderStatusState
  );

  useEffect(() => {
    if (!updateState) return;
    if (
      updateState.message &&
      updateState.data &&
      Object.keys(updateState.data).length
    ) {
      toast.success(updateState.message);
      refreshTransactions?.();
    } else if (
      updateState.message &&
      updateState.errors &&
      Object.keys(updateState.errors).length
    ) {
      toast.error(updateState.message);
    }
  }, [updateState, refreshTransactions]);

  const tableRows = useMemo(() => {
    if (!transactions || !transactions.length) return [];
    return transactions;
  }, [transactions]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("orderCode", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Order ID" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("registryCode", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Registry" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("guestName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Guest Name" />
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
            <span className="text-[10px] text-[#6A7282]">{info.row.original.email}</span>
          </div>
        ),
      }),
      columnHelper.accessor("vendorName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Vendor" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("paymentMethodLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Payment Method" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("amountLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Amount (GHS)" />
        ),
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
      columnHelper.accessor("deliveryStatus", {
        header: "Delivery Status",
        cell: (info) => {
          const raw = info.getValue();
          if (!raw) {
            return (
              <Badge variant="neutral" className="text-[11px] text-[#B0B7C3]">
                —
              </Badge>
            );
          }

          const normalized = String(raw).toLowerCase();
          let label = "";
          switch (normalized) {
            case "delivered":
              label = "Delivered";
              break;
            case "shipped":
              label = "Shipped";
              break;
            case "cancelled":
              label = "Failed";
              break;
            case "paid":
            case "pending":
            default:
              label = "Pending";
              break;
          }

          const variant = deliveryStatusVariantMap[normalized] || "neutral";

          return (
            <Badge variant={variant} className="text-[11px]">
              {label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("createdAtLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Date" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const original = row.original;

          if (!canModerate) {
            return (
              <div className="flex justify-end text-[11px] text-[#B0B7C3]">
                No actions
              </div>
            );
          }

          const normalizedStatus = original.normalizedStatus;
          const canMarkPaid = normalizedStatus === "pending";
          const canMarkShipped = normalizedStatus === "paid";
          const canMarkDelivered = normalizedStatus === "shipped";
          const canCancel =
            normalizedStatus !== "cancelled" &&
            normalizedStatus !== "delivered";

          const disabled = updatePending || !original.id;

          const handleView = () => {
            setSelectedRow(original);
            setViewOpen(true);
          };

          return (
            <div className="flex justify-end items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleView}
                    aria-label="View order"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View order details</TooltipContent>
              </Tooltip>
              {/* {canMarkPaid && (
                <form action={updateAction}>
                  <input type="hidden" name="orderId" value={original.id} />
                  <input type="hidden" name="newStatus" value="paid" />
                  <button
                    type="submit"
                    disabled={disabled}
                    className={cx(
                      "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                      "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                      disabled &&
                        "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white"
                    )}
                  >
                    Mark Paid
                  </button>
                </form>
              )}
              {canMarkShipped && (
                <form action={updateAction}>
                  <input type="hidden" name="orderId" value={original.id} />
                  <input type="hidden" name="newStatus" value="shipped" />
                  <button
                    type="submit"
                    disabled={disabled}
                    className={cx(
                      "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                      "border-[#3979D2] text-white bg-[#3979D2] hover:bg-white hover:text-[#3979D2]",
                      disabled &&
                        "opacity-60 cursor-not-allowed hover:bg-[#3979D2] hover:text-white"
                    )}
                  >
                    Mark Shipped
                  </button>
                </form>
              )}
              {canMarkDelivered && (
                <form action={updateAction}>
                  <input type="hidden" name="orderId" value={original.id} />
                  <input
                    type="hidden"
                    name="newStatus"
                    value="delivered"
                  />
                  <button
                    type="submit"
                    disabled={disabled}
                    className={cx(
                      "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                      "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                      disabled &&
                        "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white"
                    )}
                  >
                    Mark Delivered
                  </button>
                </form>
              )}
              {canCancel && (
                <form action={updateAction}>
                  <input type="hidden" name="orderId" value={original.id} />
                  <input
                    type="hidden"
                    name="newStatus"
                    value="cancelled"
                  />
                  <button
                    type="submit"
                    disabled={disabled}
                    className={cx(
                      "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                      "border-[#DF0404] text-[#DF0404] bg-white hover:bg-[#DF0404] hover:text-white",
                      disabled &&
                        "opacity-60 cursor-not-allowed hover:bg-white hover:text-[#DF0404]"
                    )}
                  >
                    Cancel
                  </button>
                </form>
              )} */}
            </div>
          );
        },
      }),
    ],
    [canModerate, updateAction, updatePending]
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

  const totalRows = transactionsTotal ?? tableRows.length;
  const pageIndex = transactionsPage ?? 0;
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
          <h2 className="text-xs font-medium text-[#0A0A0A]">
            All Transactions
          </h2>
          <p className="text-[11px] text-[#717182]">
            {totalRows || 0} transactions found
          </p>
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
          {loadingTransactions ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading transactions...
              </td>
            </tr>
          ) : tableInstance.getRowModel().rows.length ? (
            tableInstance.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cx(bodyRow())}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cx(bodyCell())}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
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
                No transactions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Order Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              View order information and context.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              <div>
                <p className="font-medium">Order ID</p>
                <p className="text-[#6A7282]">{selectedRow.orderCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Registry</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.registryCode || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Guest</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.guestName || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.vendorName || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.paymentMethodLabel || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Amount (GHS)</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.amountLabel || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.statusLabel || selectedRow.status}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Delivery Status</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.deliveryStatus || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Order Date</p>
                  <p className="text-[#6A7282]">
                    {selectedRow.createdAt
                      ? new Date(selectedRow.createdAt).toLocaleString()
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
            ? "No transactions to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setTransactionsPage?.((prev) => (prev > 0 ? prev - 1 : 0))
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
              setTransactionsPage?.((prev) => (canNext ? prev + 1 : prev))
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
