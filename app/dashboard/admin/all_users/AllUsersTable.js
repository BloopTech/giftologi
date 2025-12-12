"use client";

import React, { useEffect, useMemo, useState, useActionState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCcw,
  Trash2,
  Ban,
  LoaderCircle,
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
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/app/components/Dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/app/components/Tooltip";
import { toast } from "sonner";
import { useAllUsersContext } from "./context";
import { useDashboardContext } from "../context";
import { updateStaffStatus, resendStaffInvite } from "../action";
import { deleteUser } from "./action";

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
  Suspended: "error",
  Inactive: "neutral",
  Pending: "warning",
  Deleted: "error",
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

const initialResendState = {
  message: "",
  errors: {
    staffId: [],
  },
  values: {},
  data: {},
};

const initialDeleteState = {
  message: "",
  errors: {
    staffId: [],
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

export default function AllUsersTable() {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusMode, setStatusMode] = useState("suspend");
  const [confirmText, setConfirmText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    users,
    usersPage,
    pageSize,
    usersTotal,
    loadingUsers,
    setUsersPage,
    refreshUsers,
  } = useAllUsersContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const isSuperAdmin = currentAdmin?.role === "super_admin";

  const [statusState, statusAction, statusPending] = useActionState(
    updateStaffStatus,
    initialStatusState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendStaffInvite,
    initialResendState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUser,
    initialDeleteState
  );

  useEffect(() => {
    if (!statusState) return;
    if (
      statusState.message &&
      statusState.data &&
      Object.keys(statusState.data).length
    ) {
      toast.success(statusState.message);
      refreshUsers?.();
      setStatusOpen(false);
    } 
    if (
      statusState.message &&
      statusState.errors &&
      Object.keys(statusState.errors).length
    ) {
      toast.error(statusState.message);
    }
  }, [statusState, refreshUsers]);

  useEffect(() => {
    if (!resendState) return;
    if (
      resendState.message &&
      resendState.data &&
      Object.keys(resendState.data).length
    ) {
      toast.success(resendState.message);
    } 
    if (
      resendState.message &&
      resendState.errors &&
      Object.keys(resendState.errors).length
    ) {
      toast.error(resendState.message);
    }
  }, [resendState]);

  useEffect(() => {
    if (!deleteState) return;
    if (
      deleteState.message &&
      deleteState.data &&
      Object.keys(deleteState.data).length
    ) {
      toast.success(deleteState.message);
      refreshUsers?.();
      setDeleteOpen(false);
    }
    if (
      deleteState.message &&
      deleteState.errors &&
      Object.keys(deleteState.errors).length
    ) {
      toast.error(deleteState.message);
    }
  }, [deleteState, refreshUsers]);

  const tableRows = useMemo(() => {
    if (!users || !users.length) return [];

    return users.map((row) => {
      const nameParts = [row.firstname, row.lastname].filter(Boolean);
      const name =
        nameParts.length > 0
          ? nameParts.join(" ")
          : row.email?.split("@")[0] || "";

      const roleLabelMap = {
        host: "Host",
        vendor: "Vendor",
        guest: "Guest",
        super_admin: "Super Admin",
        finance_admin: "Finance Admin",
        operations_manager_admin: "Operations Manager",
        customer_support_admin: "Customer Support",
      };

      const roleLabel = roleLabelMap[row.role] || row.role || "—";
      const status = row.status || "Active";
      const lastLogin = row.last_sign_in_at
        ? new Date(row.last_sign_in_at).toLocaleString()
        : "—";
      const createdAt = row.auth_created_at
        ? new Date(row.auth_created_at).toLocaleString()
        : row.created_at
        ? new Date(row.created_at).toLocaleString()
        : "—";
      const createdBy = row.created_by_label || "—";

      return {
        id: row.id,
        name,
        email: row.email || "",
        role: roleLabel,
        rawRole: row.role || null,
        status,
        lastLogin,
        createdAt,
        createdBy,
        __raw: row,
      };
    });
  }, [users]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Name" />
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#0A0A0A]">
              {info.getValue()}
            </span>
            <span className="text-[10px] text-[#6A7282]">
              {info.row.original.email}
            </span>
          </div>
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
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Created At" />
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

          const staffRoles = [
            "super_admin",
            "finance_admin",
            "operations_manager_admin",
            "customer_support_admin",
          ];
          const isStaffRole = staffRoles.includes(original.rawRole);
          const isInvite = raw.__source === "invite";
          const isPendingInvite = raw.status === "Pending" && isInvite;

          const handleView = () => {
            setSelectedUser(raw);
            setViewOpen(true);
          };

          const handleStatus = () => {
            if (!isSuperAdmin || isInvite) return;
            setSelectedUser(raw);
            setStatusMode(raw.status === "Suspended" ? "delete" : "suspend");
            setConfirmText("");
            setStatusOpen(true);
          };

          const handleDelete = () => {
            if (!isSuperAdmin) return;
            setSelectedUser(raw);
            setDeleteConfirmText("");
            setDeleteOpen(true);
          };

          return (
            <div className="flex justify-end items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleView}
                    aria-label="View user details"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View details</TooltipContent>
              </Tooltip>
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
                      onClick={handleDelete}
                      aria-label="Delete user"
                      className="p-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete user</TooltipContent>
                </Tooltip>
              )}
              {isSuperAdmin && !isInvite && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleStatus}
                      aria-label="Suspend user"
                      className="p-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Ban className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Suspend user</TooltipContent>
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

  const totalRows = usersTotal ?? tableRows.length;
  const pageIndex = usersPage ?? 0;
  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  const selectedFullName = selectedUser
    ? [selectedUser.firstname, selectedUser.lastname]
        .filter(Boolean)
        .join(" ") || selectedUser.email || "—"
    : "";

  return (
    <div className={cx(wrapper())}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium text-[#0A0A0A]">All Users</h2>
          <p className="text-[11px] text-[#717182]">
            {totalRows || 0} users found
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
          {loadingUsers ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading users...
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
                No users found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              User Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              View user profile information.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              <div>
                <p className="font-medium">Full Name</p>
                <p className="text-[#6A7282]">{selectedFullName}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-[#6A7282]">{selectedUser.email}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-[#6A7282]">{selectedUser.phone || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Role</p>
                  <p className="text-[#6A7282]">{selectedUser.role || "—"}</p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-[#6A7282]">{selectedUser.status || "Active"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Created At</p>
                  <p className="text-[#6A7282]">
                    {selectedUser.auth_created_at
                      ? new Date(selectedUser.auth_created_at).toLocaleString()
                      : selectedUser.created_at
                      ? new Date(selectedUser.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Last Login</p>
                  <p className="text-[#6A7282]">
                    {selectedUser.last_sign_in_at
                      ? new Date(selectedUser.last_sign_in_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Created By</p>
                  <p className="text-[#6A7282]">
                    {selectedUser.created_by_label || "—"}
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Delete User
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Only Super Admins can perform this action.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form action={deleteAction} className="mt-3 space-y-4">
              <input type="hidden" name="staffId" value={selectedUser.id} />

              <div className="space-y-1">
                <label
                  htmlFor="deleteConfirmText"
                  className="text-xs font-medium text-[#0A0A0A]"
                >
                  Type <span className="font-semibold">DELETE USER</span> to
                  confirm
                </label>
                <input
                  id="deleteConfirmText"
                  name="confirmText"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                  placeholder="DELETE USER"
                  disabled={deletePending}
                />
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
                  disabled={
                    deletePending ||
                    !deleteConfirmText.trim() ||
                    deleteConfirmText.trim().toUpperCase() !== "DELETE USER"
                  }
                  className={cx(
                    "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                    "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-600"
                  )}
                >
                  {deletePending ? <LoaderCircle className="animate-spin size-4" /> : "Delete User"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Suspend or Delete User
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Only Super Admins can perform these actions.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form action={statusAction} className="mt-3 space-y-4">
              <input type="hidden" name="staffId" value={selectedUser.id} />
              <input type="hidden" name="mode" value={statusMode} />

              <div className="space-y-2 text-xs text-[#0A0A0A]">
                <p>
                  Choose whether to <span className="font-semibold">suspend</span>
                  {" "}
                  or
                  {" "}
                  <span className="font-semibold">permanently delete</span> this
                  user.
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
                    ? "Suspended users keep their record but lose access until reactivated."
                    : "Deleted users will lose their role and identifying details in this dashboard."}
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
                    {statusMode === "suspend" ? "SUSPEND" : "DELETE STAFF"}
                  </span>
                  {" "}
                  to confirm
                </label>
                <input
                  id="confirmText"
                  name="confirmText"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                  placeholder={statusMode === "suspend" ? "SUSPEND" : "DELETE STAFF"}
                  disabled={statusPending}
                />
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
                  disabled={
                    statusPending ||
                    !confirmText.trim() ||
                    confirmText.trim().toUpperCase() !==
                      (statusMode === "suspend" ? "SUSPEND" : "DELETE STAFF")
                  }
                  className={cx(
                    "inline-flex items-center justify-center rounded-full border px-6 py-2 text-xs font-medium cursor-pointer",
                    statusMode === "delete"
                      ? "border-red-500 bg-red-500 text-white hover:bg-white hover:text-red-600"
                      : "border-[#3979D2] bg-[#3979D2] text-white hover:bg-white hover:text-[#3979D2]"
                  )}
                >
                  {statusMode === "delete" ? "Delete User" : "Suspend User"}
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
              setUsersPage?.((prev) => (prev > 0 ? prev - 1 : 0))
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
              setUsersPage?.((prev) => (canNext ? prev + 1 : prev))
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
