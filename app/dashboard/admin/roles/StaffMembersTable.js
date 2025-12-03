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
  RefreshCcw,
  Trash2,
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
import { useRolesContext } from "./context";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/app/components/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/Tooltip";
import { updateStaffDetails, updateStaffStatus, resendStaffInvite } from "../action";

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

const { wrapper, table, headRow, headCell, bodyRow, bodyCell } =
  tableStyles();

const columnHelper = createColumnHelper();

const statusVariantMap = {
  Active: "success",
  Suspended: "error",
  Inactive: "neutral",
  Pending: "warning",
};

const ROLE_OPTIONS = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Operations Manager", value: "operations_manager_admin" },
  { label: "Finance", value: "finance_admin" },
  { label: "Customer Support", value: "customer_support_admin" },
];

const initialEditState = {
  message: "",
  errors: {
    staffId: [],
    fullName: [],
    role: [],
    phone: [],
  },
  values: {},
  data: {},
};

const initialResendState = {
  message: "",
  errors: {
    staffId: [],
  },
  values: {},
  data: {},
};

const initialStatusState = {
  message: "",
  errors: {
    staffId: [],
    mode: [],
    confirmText: [],
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

export default function StaffMembersTable({ searchQuery: _searchQuery }) {
  const [sorting, setSorting] = useState([]);
  const {
    staff,
    staffPage,
    pageSize,
    staffTotal,
    loadingStaff,
    setStaffPage,
    refreshStaff,
    currentAdmin,
  } = useRolesContext() || {};

  const isSuperAdmin = currentAdmin?.role === "super_admin";

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [statusMode, setStatusMode] = useState("suspend");
  const [confirmText, setConfirmText] = useState("");

  const [editState, editAction, editPending] = useActionState(
    updateStaffDetails,
    initialEditState
  );
  const [statusState, statusAction, statusPending] = useActionState(
    updateStaffStatus,
    initialStatusState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendStaffInvite,
    initialResendState
  );

  useEffect(() => {
    if (!editState) return;
    if (editState.message && editState.data && Object.keys(editState.data).length) {
      toast.success(editState.message);
      refreshStaff?.();
      setEditOpen(false);
    } else if (
      editState.message &&
      editState.errors &&
      Object.keys(editState.errors).length
    ) {
      toast.error(editState.message);
    }
  }, [editState, refreshStaff]);

  useEffect(() => {
    if (!statusState) return;
    if (
      statusState.message &&
      statusState.data &&
      Object.keys(statusState.data).length
    ) {
      toast.success(statusState.message);
      refreshStaff?.();
      setStatusOpen(false);
    } else if (
      statusState.message &&
      statusState.errors &&
      Object.keys(statusState.errors).length
    ) {
      toast.error(statusState.message);
    }
  }, [statusState, refreshStaff]);

  useEffect(() => {
    if (!resendState) return;
    if (
      resendState.message &&
      resendState.data &&
      Object.keys(resendState.data).length
    ) {
      toast.success(resendState.message);
    } else if (
      resendState.message &&
      resendState.errors &&
      Object.keys(resendState.errors).length
    ) {
      toast.error(resendState.message);
    }
  }, [resendState]);

  const tableRows = useMemo(() => {
    if (!staff || !staff.length) return [];
    return staff.map((row) => {
      const nameParts = [row.firstname, row.lastname].filter(Boolean);
      const name = nameParts.length
        ? nameParts.join(" ")
        : row.email?.split("@")[0] || "";
      const roleLabelMap = {
        super_admin: "Super Admin",
        finance_admin: "Finance",
        operations_manager_admin: "Operations Manager",
        customer_support_admin: "Customer Support",
      };
      const roleLabel = roleLabelMap[row.role] || row.role || "";
      const status = row.status || "Active";
      const lastLogin = row.updated_at
        ? new Date(row.updated_at).toLocaleString()
        : "—";
      return {
        id: row.id,
        name,
        email: row.email || "",
        role: roleLabel,
        status,
        lastLogin,
        createdBy: row.created_by_label || "—",
        __raw: row,
      };
    });
  }, [staff]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Name" />
        ),
        cell: (info) => (
          <span className="text-xs font-medium text-[#0A0A0A]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("email", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Email" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Role" />
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
      columnHelper.accessor("lastLogin", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Last Login" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("createdBy", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Created by" />
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
          const isPendingInvite = raw.status === "Pending";

          const handleView = () => {
            setSelectedStaff(raw);
            setViewOpen(true);
          };

          const handleEdit = () => {
            if (!isSuperAdmin) return;
            setSelectedStaff(raw);
            setEditOpen(true);
          };

          const handleStatus = () => {
            if (!isSuperAdmin) return;
            setSelectedStaff(raw);
            setStatusMode(raw.status === "Suspended" ? "delete" : "suspend");
            setConfirmText("");
            setStatusOpen(true);
          };

          return (
            <div className="flex justify-end items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleView}
                    aria-label="View staff details"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View details</TooltipContent>
              </Tooltip>
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleEdit}
                      aria-label="Edit staff"
                      className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit staff</TooltipContent>
                </Tooltip>
              )}
              {isSuperAdmin && isPendingInvite && (
                <form action={resendAction} className="inline-flex">
                  <input type="hidden" name="staffId" value={raw.id} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="submit"
                        aria-label="Resend invite email"
                        disabled={resendPending}
                        className="p-1 rounded-full border border-blue-200 text-[#3979D2] hover:bg-blue-50 cursor-pointer"
                      >
                        <RefreshCcw className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Resend invite email</TooltipContent>
                  </Tooltip>
                </form>
              )}
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleStatus}
                      aria-label="Suspend or delete staff"
                      className="p-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Suspend or delete staff</TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      }),
    ],
    [isSuperAdmin, resendAction, resendPending]
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

  const totalRows = staffTotal ?? tableRows.length;
  const pageIndex = staffPage ?? 0;
  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  const selectedFullName = selectedStaff
    ? [selectedStaff.firstname, selectedStaff.lastname].filter(Boolean).join(" ") ||
      selectedStaff.email ||
      "—"
    : "";

  const expectedConfirm =
    statusMode === "suspend" ? "SUSPEND" : "DELETE STAFF";
  const canSubmitStatus =
    confirmText.trim().toUpperCase() === expectedConfirm && !!selectedStaff;

  const editErrorFor = (key) => editState?.errors?.[key] ?? [];
  const hasEditError = (key) => (editErrorFor(key)?.length ?? 0) > 0;

  const statusErrorFor = (key) => statusState?.errors?.[key] ?? [];
  const hasStatusError = (key) => (statusErrorFor(key)?.length ?? 0) > 0;

  return (
    <div className={cx(wrapper())}>
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
          {loadingStaff ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading staff...
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
                No staff found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* View staff dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Staff Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              View staff member information.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              <div>
                <p className="font-medium">Full Name</p>
                <p className="text-[#6A7282]">{selectedFullName}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-[#6A7282]">{selectedStaff.email}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-[#6A7282]">{selectedStaff.phone || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Role</p>
                  <p className="text-[#6A7282]">{selectedStaff.role}</p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-[#6A7282]">{selectedStaff.status || "Active"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Created At</p>
                  <p className="text-[#6A7282]">
                    {selectedStaff.created_at
                      ? new Date(selectedStaff.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Created By</p>
                  <p className="text-[#6A7282]">
                    {selectedStaff.created_by_label || "—"}
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

      {/* Edit staff dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Update basic details for this staff member.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <form action={editAction} className="mt-3 space-y-4">
              <input type="hidden" name="staffId" value={selectedStaff.id} />

              <div className="space-y-1">
                <label
                  htmlFor="edit-fullName"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Full Name
                </label>
                <input
                  id="edit-fullName"
                  name="fullName"
                  type="text"
                  defaultValue={
                    editState?.values?.fullName ?? selectedFullName
                  }
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasEditError("fullName") ? hasErrorInput : ""
                  )}
                  disabled={editPending}
                />
                {hasEditError("fullName") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("fullName").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-phone"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Phone Number
                </label>
                <input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  defaultValue={
                    editState?.values?.phone ?? selectedStaff.phone ?? ""
                  }
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasEditError("phone") ? hasErrorInput : ""
                  )}
                  disabled={editPending}
                />
                {hasEditError("phone") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("phone").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Assign Role
                </label>
                <input
                  type="hidden"
                  name="role"
                  defaultValue={
                    editState?.values?.role ?? selectedStaff.role ?? ""
                  }
                />
                <Select
                  defaultValue={
                    editState?.values?.role ?? selectedStaff.role ?? ""
                  }
                  onValueChange={(value) => {
                    // keep hidden input in sync via formData, no extra state needed
                    const hidden = document.querySelector(
                      "input[name='role']"
                    );
                    if (hidden) hidden.value = value;
                  }}
                  disabled={editPending}
                >
                  <SelectTrigger
                    className={cx(
                      "bg-white",
                      hasEditError("role") ? hasErrorInput : ""
                    )}
                  >
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasEditError("role") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("role").map((err, index) => (
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
                    disabled={editPending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={editPending}
                  className="inline-flex items-center justify-center rounded-full border border-[#3979D2] bg-[#3979D2] px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend/Delete staff dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Suspend or Delete Staff
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Only Super Admins can perform these actions.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <form action={statusAction} className="mt-3 space-y-4">
              <input type="hidden" name="staffId" value={selectedStaff.id} />
              <input type="hidden" name="mode" value={statusMode} />

              <div className="space-y-2 text-xs text-[#0A0A0A]">
                <p>
                  Choose whether to <span className="font-semibold">suspend</span> or
                  <span className="font-semibold"> permanently delete</span> this
                  staff member.
                </p>
                <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setStatusMode("suspend")}
                    className={cx(
                      "px-4 py-1.5 text-[11px] font-medium rounded-full cursor-pointer",
                      statusMode === "suspend"
                        ? "bg-white text-[#0A0A0A] shadow-sm"
                        : "text-[#717182]"
                    )}
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusMode("delete")}
                    className={cx(
                      "px-4 py-1.5 text-[11px] font-medium rounded-full cursor-pointer",
                      statusMode === "delete"
                        ? "bg-white text-red-600 shadow-sm"
                        : "text-[#717182]"
                    )}
                  >
                    Delete
                  </button>
                </div>
                <p className="text-[11px] text-[#717182]">
                  {statusMode === "suspend"
                    ? "Suspended staff keep their record but lose access until reactivated."
                    : "Deleted staff will lose their role and identifying details in this dashboard."}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmText"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Type
                  {" "}
                  <span className="font-semibold">
                    {expectedConfirm}
                  </span>{" "}
                  to confirm
                </label>
                <input
                  id="confirmText"
                  name="confirmText"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={cx(
                    "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasStatusError("confirmText") ? hasErrorInput : ""
                  )}
                  placeholder={expectedConfirm}
                  disabled={statusPending}
                />
                {hasStatusError("confirmText") && (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {statusErrorFor("confirmText").map((err, index) => (
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
                    disabled={statusPending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={statusPending || !canSubmitStatus}
                  className={cx(
                    "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                    statusMode === "delete"
                      ? "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-600"
                      : "border-[#3979D2] bg-[#3979D2] text-white hover:bg-white hover:text-[#3979D2]"
                  )}
                >
                  {statusMode === "delete" ? "Delete Staff" : "Suspend Staff"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No users to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setStaffPage?.((prev) => (prev > 0 ? prev - 1 : 0))
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
              setStaffPage?.((prev) => (canNext ? prev + 1 : prev))
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
