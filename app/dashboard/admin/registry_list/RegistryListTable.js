"use client";

import React, { useEffect, useMemo, useState, useActionState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
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
import { toast } from "sonner";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import { useRegistryListContext } from "./context";
import RegistryDetailsDialog from "./RegistryDetailsDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { useDashboardContext } from "../context";
import { updateRegistryEvent, flagRegistry, deleteRegistry } from "./action";

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
  Active: "success",
  Expired: "warning",
  Flagged: "error",
};

const initialUpdateRegistryEventState = {
  message: "",
  errors: {
    registryId: [],
    eventId: [],
    eventType: [],
    eventDate: [],
  },
  values: {},
  data: {},
};

const initialFlagRegistryState = {
  message: "",
  errors: {
    registryId: [],
    reason: [],
  },
  values: {},
  data: {},
};

const initialDeleteRegistryState = {
  message: "",
  errors: {
    registryId: [],
    confirmText: [],
  },
  values: {},
  data: {},
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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

export default function RegistryListTable() {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    registries,
    registryPage,
    pageSize,
    registriesTotal,
    loadingRegistries,
    setRegistryPage,
    refreshRegistries,
  } = useRegistryListContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const isSuperAdmin = currentAdmin?.role === "super_admin";

  const [updateState, updateAction, updatePending] = useActionState(
    updateRegistryEvent,
    initialUpdateRegistryEventState
  );
  const [flagState, flagAction, flagPending] = useActionState(
    flagRegistry,
    initialFlagRegistryState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRegistry,
    initialDeleteRegistryState
  );

  const updateErrorFor = (key) => updateState?.errors?.[key] ?? [];
  const hasUpdateError = (key) => (updateErrorFor(key)?.length ?? 0) > 0;

  const flagErrorFor = (key) => flagState?.errors?.[key] ?? [];
  const hasFlagError = (key) => (flagErrorFor(key)?.length ?? 0) > 0;

  const deleteErrorFor = (key) => deleteState?.errors?.[key] ?? [];
  const hasDeleteError = (key) => (deleteErrorFor(key)?.length ?? 0) > 0;

  useEffect(() => {
    if (!updateState) return;
    if (
      updateState.message &&
      updateState.data &&
      Object.keys(updateState.data).length
    ) {
      toast.success(updateState.message);
      refreshRegistries?.();
      setEditOpen(false);
    } else if (
      updateState.message &&
      updateState.errors &&
      Object.keys(updateState.errors).length
    ) {
      toast.error(updateState.message);
    }
  }, [updateState, refreshRegistries]);

  useEffect(() => {
    if (!flagState) return;
    if (flagState.message && flagState.data && Object.keys(flagState.data).length) {
      toast.success(flagState.message);
      refreshRegistries?.();
      setFlagOpen(false);
    } else if (
      flagState.message &&
      flagState.errors &&
      Object.keys(flagState.errors).length
    ) {
      toast.error(flagState.message);
    }
  }, [flagState, refreshRegistries]);

  useEffect(() => {
    if (!deleteState) return;
    if (
      deleteState.message &&
      deleteState.data &&
      Object.keys(deleteState.data).length
    ) {
      toast.success(deleteState.message);
      refreshRegistries?.();
      setDeleteOpen(false);
      setSelectedRegistry(null);
      setDeleteConfirmText("");
    } else if (
      deleteState.message &&
      deleteState.errors &&
      Object.keys(deleteState.errors).length
    ) {
      toast.error(deleteState.message);
    }
  }, [deleteState, refreshRegistries]);

  const tableRows = useMemo(() => {
    if (!registries || !registries.length) return [];
    return registries.map((row) => {
      const eventDateLabel = row.eventDate
        ? new Date(row.eventDate).toLocaleDateString()
        : "—";
      const totalValueLabel = Number(row.totalValue || 0).toLocaleString(
        "en-GH",
        {
          maximumFractionDigits: 0,
        }
      );
      return {
        ...row,
        eventDateLabel,
        totalValueLabel,
      };
    });
  }, [registries]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("registryName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Registry Name" />
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#0A0A0A]">
              {info.getValue()}
            </span>
            <span className="text-[10px] text-[#286AD4]">
              {info.row.original.__raw?.registry?.registry_code ?? ""}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("hostName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Host Name" />
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
            <span className="text-[10px] text-[#286AD4]">
              {info.row.original.hostEmail}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("eventType", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Event Type" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge
            variant={statusVariantMap[info.getValue()] || "neutral"}
            className="text-[11px]"
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("eventDateLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Event Date" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("totalItems", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Total Items" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("purchasedItems", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Purchased" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("totalValueLabel", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Total Value (GHS)" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const original = row.original;
          const raw = original.__raw;

          const handleView = () => {
            setViewRow(original);
            setViewOpen(true);
          };

          return (
            <div className="flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={handleView}
                aria-label="View registry"
                className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                <Eye className="size-4" />
              </button>
              {isSuperAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!raw?.registry?.id) return;
                      setSelectedRegistry(raw);
                      setEditOpen(true);
                    }}
                    aria-label="Edit registry"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!raw?.registry?.id) return;
                      setSelectedRegistry(raw);
                      setFlagOpen(true);
                    }}
                    aria-label="Flag registry"
                    className="p-1 rounded-full border border-yellow-200 text-yellow-500 hover:bg-yellow-50 cursor-pointer"
                  >
                    <Flag className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!raw?.registry?.id) return;
                      setSelectedRegistry(raw);
                      setDeleteConfirmText("");
                      setDeleteOpen(true);
                    }}
                    aria-label="Delete registry"
                    className="p-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          );
        },
      }),
    ],
    [isSuperAdmin]
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
  });

  const totalRows = registriesTotal ?? tableRows.length;
  const pageIndex = registryPage ?? 0;
  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  const canSubmitDelete =
    deleteConfirmText.trim().toUpperCase() === "DELETE REGISTRY" &&
    !!selectedRegistry;

  return (
    <div className={cx(wrapper())}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium text-[#0A0A0A]">
            All Registries
          </h2>
          <p className="text-[11px] text-[#717182]">
            {totalRows || 0} registries found
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
          {loadingRegistries ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading registries...
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
                No registries found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <RegistryDetailsDialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewRow(null);
          }
        }}
        registryRow={viewRow}
      />

      {/* Edit registry dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Event Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Update the event type and date for this registry. Only Super Admins
              can perform this action.
            </DialogDescription>
          </DialogHeader>
          {selectedRegistry && (
            <form action={updateAction} className="mt-3 space-y-4">
              <input
                type="hidden"
                name="registryId"
                value={selectedRegistry.registry?.id || ""}
              />
              <input
                type="hidden"
                name="eventId"
                value={selectedRegistry.event?.id || ""}
              />

              <div className="space-y-1 text-xs text-[#0A0A0A]">
                <p className="font-medium">Registry</p>
                <p className="text-[#6A7282]">
                  {selectedRegistry.registry?.title || "Untitled"}
                  {selectedRegistry.registry?.registry_code ? (
                    <span className="ml-1 text-[11px] text-[#3979D2]">
                      (Code: {selectedRegistry.registry.registry_code})
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-eventType"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Event Type
                </label>
                <input
                  id="edit-eventType"
                  name="eventType"
                  type="text"
                  defaultValue={
                    updateState?.values?.eventType ??
                    selectedRegistry.event?.type ??
                    ""
                  }
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasUpdateError("eventType") ? hasErrorInput : ""
                  )}
                  disabled={updatePending}
                />
                {hasUpdateError("eventType") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {updateErrorFor("eventType").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-eventDate"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Event Date
                </label>
                <input
                  id="edit-eventDate"
                  name="eventDate"
                  type="date"
                  defaultValue={
                    updateState?.values?.eventDate ??
                    toDateInputValue(
                      selectedRegistry.event?.date ||
                        selectedRegistry.registry?.deadline
                    )
                  }
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasUpdateError("eventDate") ? hasErrorInput : ""
                  )}
                  disabled={updatePending}
                />
                {hasUpdateError("eventDate") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {updateErrorFor("eventDate").map((err, index) => (
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
                    disabled={updatePending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={updatePending}
                  className="inline-flex items-center justify-center rounded-full border border-[#3979D2] bg-[#3979D2] px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag registry dialog */}
      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Flag Registry
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Create an escalated support ticket for this registry. Only Super
              Admins can perform this action.
            </DialogDescription>
          </DialogHeader>
          {selectedRegistry && (
            <form action={flagAction} className="mt-3 space-y-4">
              <input
                type="hidden"
                name="registryId"
                value={selectedRegistry.registry?.id || ""}
              />

              <div className="space-y-1 text-xs text-[#0A0A0A]">
                <p className="font-medium">Registry</p>
                <p className="text-[#6A7282]">
                  {selectedRegistry.registry?.title || "Untitled"}
                  {selectedRegistry.registry?.registry_code ? (
                    <span className="ml-1 text-[11px] text-[#3979D2]">
                      (Code: {selectedRegistry.registry.registry_code})
                    </span>
                  ) : null}
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
                  placeholder="Describe why this registry needs attention"
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
                  Flag Registry
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete registry dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Delete Registry
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              This will permanently delete the registry and its configuration.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRegistry && (
            <form action={deleteAction} className="mt-3 space-y-4">
              <input
                type="hidden"
                name="registryId"
                value={selectedRegistry.registry?.id || ""}
              />

              <div className="space-y-1 text-xs text-[#0A0A0A]">
                <p className="font-medium">Registry</p>
                <p className="text-[#6A7282]">
                  {selectedRegistry.registry?.title || "Untitled"}
                  {selectedRegistry.registry?.registry_code ? (
                    <span className="ml-1 text-[11px] text-[#3979D2]">
                      (Code: {selectedRegistry.registry.registry_code})
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="delete-confirmText"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Type
                  {" "}
                  <span className="font-semibold">DELETE REGISTRY</span>{" "}
                  to confirm
                </label>
                <input
                  id="delete-confirmText"
                  name="confirmText"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasDeleteError("confirmText") ? hasErrorInput : ""
                  )}
                  placeholder="DELETE REGISTRY"
                  disabled={deletePending}
                />
                {hasDeleteError("confirmText") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {deleteErrorFor("confirmText").map((err, index) => (
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
                    disabled={deletePending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={deletePending || !canSubmitDelete}
                  className="inline-flex items-center justify-center rounded-full border border-red-500 bg-red-500 px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-red-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Delete Registry
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No registries to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setRegistryPage?.((prev) => (prev > 0 ? prev - 1 : 0))
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
              setRegistryPage?.((prev) => (canNext ? prev + 1 : prev))
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
