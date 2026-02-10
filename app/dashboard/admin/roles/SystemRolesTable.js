import React, { useMemo, useState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
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
import { cx } from "@/app/components/utils";

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

const initialData = [
  {
    id: 1,
    roleName: "Super Admin",
    description: "Full CRUD access to staff users and roles.",
    accessScope: "All modules, settings, users",
  },
  {
    id: 2,
    roleName: "Operations",
    description: "Manages vendors, products, and registries.",
    accessScope: "/admin/vendors, /admin/registries, /admin/products",
  },
  {
    id: 3,
    roleName: "Finance",
    description: "Handles payouts, orders, and reports.",
    accessScope: "/admin/orders, /admin/payouts, /admin/reports",
  },
  {
    id: 4,
    roleName: "Customer Support",
    description: "Manages tickets and user issues.",
    accessScope: "/admin/support",
  },
  {
    id: 5,
    roleName: "Ops/HR",
    description:
      "Add new users, assign roles (without editing permissions).",
    accessScope: "/admin/users (restricted add/delete)",
  },
  {
    id: 6,
    roleName: "Store Manager",
    description: "Maintains the full catalog lifecycle and product readiness.",
    accessScope: "/dashboard/admin/products",
  },
  {
    id: 7,
    roleName: "Marketing",
    description: "Owns analytics insights and content governance workflows.",
    accessScope:
      "/dashboard/admin/analytics_reporting, /dashboard/admin/content_policy_pages",
  },
];

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

export default function SystemRolesTable({ searchQuery }) {
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 6,
  });

  const filteredData = useMemo(() => {
    const query = (searchQuery || "").trim().toLowerCase();

    return initialData.filter((row) => {
      const matchesQuery =
        !query ||
        row.roleName.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.accessScope.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("roleName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Role" />
        ),
        cell: (info) => (
          <span className="text-xs font-medium text-[#0A0A0A]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("accessScope", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Access Scope" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#1DA85B]">{info.getValue()}</span>
        ),
      }),
    ],
    []
  );

  const tableInstance = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRows = filteredData.length;
  const {
    pageIndex,
    pageSize,
  } = tableInstance.getState().pagination;
  const pageCount = tableInstance.getPageCount();
  const pageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize);

  return (
    <div className={cx(wrapper())}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h2 className="text-xs font-medium text-[#0A0A0A]">
          Available System Roles
        </h2>
        <p className="text-[11px] text-[#717182]">
          Role definitions and access scopes.
        </p>
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
          {tableInstance.getRowModel().rows.length ? (
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
                No roles found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No roles to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => tableInstance.previousPage()}
            disabled={!tableInstance.getCanPreviousPage()}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[#3979D2]",
              !tableInstance.getCanPreviousPage()
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
            onClick={() => tableInstance.nextPage()}
            disabled={!tableInstance.getCanNextPage()}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-full border text-[#3979D2]",
              !tableInstance.getCanNextPage()
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
