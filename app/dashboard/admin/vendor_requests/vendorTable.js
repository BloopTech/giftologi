"use client";
import React, { useEffect, useMemo, useState, useActionState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
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
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { toast } from "sonner";

import { useVendorRequestsContext } from "./context";
import { useDashboardContext } from "../context";
import {
  approveVendorRequest,
  rejectVendorRequest,
  flagVendorRequest,
} from "./action";

const tableStyles = tv({
  slots: {
    wrapper:
      "mt-4 overflow-x-auto border border-[#D6D6D6] rounded-xl bg-white",
    table: "min-w-full divide-y divide-gray-200",
    headRow: "bg-[#F9FAFB]",
    headCell:
      "px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] uppercase tracking-wide",
    bodyRow: "border-b last:border-b-0 hover:bg-gray-50/60",
    bodyCell:
      "px-4 py-3 text-xs text-[#0A0A0A] align-middle whitespace-nowrap",
  },
});

const { wrapper, table, headRow, headCell, bodyRow, bodyCell } = tableStyles();

const columnHelper = createColumnHelper();

const statusVariantMap = {
  pending: "neutral",
  approved: "success",
  rejected: "error",
};

const initialApproveState = {
  message: "",
  errors: {
    applicationId: [],
  },
  values: {},
  data: {},
};

const initialRejectState = {
  message: "",
  errors: {
    applicationId: [],
  },
  values: {},
  data: {},
};

const initialFlagState = {
  message: "",
  errors: {
    applicationId: [],
    reason: [],
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

export default function VendorRequestsTable() {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [flagOpen, setFlagOpen] = useState(false);

  const {
    requests,
    requestsPage,
    pageSize,
    requestsTotal,
    loadingRequests,
    setRequestsPage,
    refreshRequests,
  } = useVendorRequestsContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const allowedActionRoles = [
    "super_admin",
    "operations_manager_admin",
  ];
  const canModerate =
    !!currentAdmin && allowedActionRoles.includes(currentAdmin.role);

  const [approveState, approveAction, approvePending] = useActionState(
    approveVendorRequest,
    initialApproveState
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectVendorRequest,
    initialRejectState
  );

  const [flagState, flagAction, flagPending] = useActionState(
    flagVendorRequest,
    initialFlagState
  );

  const flagErrorFor = (key) => flagState?.errors?.[key] ?? [];
  const hasFlagError = (key) => (flagErrorFor(key)?.length ?? 0) > 0;

  useEffect(() => {
    if (!approveState) return;
    if (
      approveState.message &&
      approveState.data &&
      Object.keys(approveState.data).length
    ) {
      toast.success(approveState.message);
      refreshRequests?.();
    } else if (
      approveState.message &&
      approveState.errors &&
      Object.keys(approveState.errors).length
    ) {
      toast.error(approveState.message);
    }
  }, [approveState, refreshRequests]);

  useEffect(() => {
    if (!rejectState) return;
    if (
      rejectState.message &&
      rejectState.data &&
      Object.keys(rejectState.data).length
    ) {
      toast.success(rejectState.message);
      refreshRequests?.();
    } else if (
      rejectState.message &&
      rejectState.errors &&
      Object.keys(rejectState.errors).length
    ) {
      toast.error(rejectState.message);
    }
  }, [rejectState, refreshRequests]);

  useEffect(() => {
    if (!flagState) return;
    if (
      flagState.message &&
      flagState.data &&
      Object.keys(flagState.data).length
    ) {
      toast.success(flagState.message);
      refreshRequests?.();
      setFlagOpen(false);
      setSelectedRequest(null);
    } else if (
      flagState.message &&
      flagState.errors &&
      Object.keys(flagState.errors).length
    ) {
      toast.error(flagState.message);
    }
  }, [flagState, refreshRequests]);

  const tableRows = useMemo(() => {
    if (!requests || !requests.length) return [];
    return requests.map((row) => {
      const appliedDateLabel = row.appliedDate
        ? new Date(row.appliedDate).toLocaleDateString()
        : "—";
      const normalizedStatus = (row.status || "pending").toLowerCase();
      const statusLabel =
        normalizedStatus.charAt(0).toUpperCase() +
        normalizedStatus.slice(1);
      return {
        ...row,
        appliedDateLabel,
        statusLabel,
        normalizedStatus,
      };
    });
  }, [requests]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("vendorId", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Vendor ID" />
        ),
        cell: (info) => (
          <span className="text-xs font-medium text-[#0A0A0A]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("businessName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Business Name" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("category", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Category" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("appliedDateLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Applied Date" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("statusLabel", {
        header: "Status",
        cell: (info) => {
          const row = info.row.original;
          const variant =
            statusVariantMap[row.normalizedStatus] || "neutral";
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
          const isPending = original.normalizedStatus === "pending";

          if (!canModerate) {
            return (
              <div className="flex justify-end text-[11px] text-[#B0B7C3]">
                No actions
              </div>
            );
          }

          const handleView = () => {
            setSelectedRequest(original);
            setViewOpen(true);
          };

          const handleFlag = () => {
            setSelectedRequest(original);
            setFlagOpen(true);
          };

          return (
            <div className="flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={handleView}
                aria-label="View vendor request"
                className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                <Eye className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleFlag}
                aria-label="Flag vendor request"
                className="p-1 rounded-full border border-yellow-200 text-yellow-500 hover:bg-yellow-50 cursor-pointer"
              >
                <Flag className="size-4" />
              </button>
              <form action={approveAction}>
                <input
                  type="hidden"
                  name="applicationId"
                  value={original.id}
                />
                <button
                  type="submit"
                  disabled={!isPending || approvePending || rejectPending}
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                    "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                    (!isPending || approvePending || rejectPending) &&
                      "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white"
                  )}
                >
                  Approve
                </button>
              </form>
              <form action={rejectAction}>
                <input
                  type="hidden"
                  name="applicationId"
                  value={original.id}
                />
                <button
                  type="submit"
                  disabled={!isPending || approvePending || rejectPending}
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                    "border-[#DF0404] text-[#DF0404] bg-white hover:bg-[#DF0404] hover:text-white",
                    (!isPending || approvePending || rejectPending) &&
                      "opacity-60 cursor-not-allowed hover:bg-white hover:text-[#DF0404]"
                  )}
                >
                  Reject
                </button>
              </form>
            </div>
          );
        },
      }),
    ],
    [canModerate, approveAction, rejectAction, approvePending, rejectPending]
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

  const totalRows = requestsTotal ?? tableRows.length;
  const pageIndex = requestsPage ?? 0;
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
            Pending Vendor Applications
          </h2>
          <p className="text-[11px] text-[#717182]">
            Review and approve new vendor requests.
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
          {loadingRequests ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading vendor requests...
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
                No vendor requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Vendor Request Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              View vendor application information.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              <div>
                <p className="font-medium">Business Name</p>
                <p className="text-[#6A7282]">
                  {selectedRequest.businessName || "—"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor ID</p>
                  <p className="text-[#6A7282]">
                    {selectedRequest.vendorId || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Category</p>
                  <p className="text-[#6A7282]">
                    {selectedRequest.category || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Contact Name</p>
                  <p className="text-[#6A7282]">
                    {selectedRequest.contactName || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Contact Email</p>
                  <p className="text-[#6A7282]">
                    {selectedRequest.contactEmail || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Applied Date</p>
                  <p className="text-[#6A7282]">
                    {selectedRequest.appliedDate
                      ? new Date(selectedRequest.appliedDate).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-[#6A7282]">
                    {selectedRequest.statusLabel ||
                      selectedRequest.status ||
                      "Pending"}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-medium">Application ID</p>
                <p className="text-[#6A7282] break-all">{selectedRequest.id}</p>
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

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Flag Vendor Request
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Create an escalated support ticket for this vendor request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <form action={flagAction} className="mt-3 space-y-4">
              <input
                type="hidden"
                name="applicationId"
                value={selectedRequest.id || ""}
              />

              <div className="space-y-1 text-xs text-[#0A0A0A]">
                <p className="font-medium">Vendor</p>
                <p className="text-[#6A7282]">
                  {selectedRequest.businessName || "Untitled"}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="flag-reason"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Reason (optional)
                </label>
                <textarea
                  id="flag-reason"
                  name="reason"
                  defaultValue={flagState?.values?.reason ?? ""}
                  rows={3}
                  className={cx(
                    "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasFlagError("reason") ? hasErrorInput : ""
                  )}
                  placeholder="Describe why this vendor request needs attention"
                  disabled={flagPending}
                />
                {hasFlagError("reason") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {flagErrorFor("reason").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={flagPending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={flagPending}
                  className="inline-flex items-center justify-center rounded-full border border-yellow-500 bg-yellow-500 px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-yellow-600 cursor-pointer"
                >
                  Flag Request
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No vendor requests to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setRequestsPage?.((prev) => (prev > 0 ? prev - 1 : 0))
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
              setRequestsPage?.((prev) => (canNext ? prev + 1 : prev))
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