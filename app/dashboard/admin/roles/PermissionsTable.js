import React, { useMemo, useState } from "react";
import { ChevronsUpDown, ChevronUp, ChevronDown, Check, X } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
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
      "px-4 py-3 text-left text-[11px] font-medium text-[#6A7282] uppercase tracking-wide",
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
    module: "Dashboard",
    superAdmin: true,
    operations: true,
    finance: true,
    support: true,
  },
  {
    id: 2,
    module: "Vendors",
    superAdmin: true,
    operations: true,
    finance: false,
    support: false,
  },
  {
    id: 3,
    module: "Products",
    superAdmin: true,
    operations: true,
    finance: false,
    support: false,
  },
  {
    id: 4,
    module: "Orders",
    superAdmin: true,
    operations: true,
    finance: true,
    support: false,
  },
  {
    id: 5,
    module: "Payouts",
    superAdmin: true,
    operations: false,
    finance: true,
    support: false,
  },
  {
    id: 6,
    module: "Support Tickets",
    superAdmin: true,
    operations: false,
    finance: false,
    support: true,
  },
  {
    id: 7,
    module: "Reports",
    superAdmin: true,
    operations: false,
    finance: true,
    support: false,
  },
  {
    id: 8,
    module: "User Management",
    superAdmin: true,
    operations: true,
    finance: false,
    support: false,
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

function PermissionDot({ allowed }) {
  if (allowed) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1DA85B] text-white">
        <Check className="size-3" />
      </span>
    );
  }

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#DF0404] text-white">
      <X className="size-3" />
    </span>
  );
}

export default function PermissionsTable({ searchQuery }) {
  const [sorting, setSorting] = useState([]);
  const filteredData = useMemo(() => {
    const query = (searchQuery || "").trim().toLowerCase();

    return initialData.filter((row) => {
      const matchesQuery =
        !query || row.module.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("module", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Role" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("superAdmin", {
        header: "Super Admin",
        cell: (info) => <PermissionDot allowed={info.getValue()} />,
      }),
      columnHelper.accessor("operations", {
        header: "Operations",
        cell: (info) => <PermissionDot allowed={info.getValue()} />,
      }),
      columnHelper.accessor("finance", {
        header: "Finance",
        cell: (info) => <PermissionDot allowed={info.getValue()} />,
      }),
      columnHelper.accessor("support", {
        header: "Support",
        cell: (info) => <PermissionDot allowed={info.getValue()} />,
      }),
    ],
    []
  );

  const tableInstance = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalRows = filteredData.length;

  return (
    <div className={cx(wrapper())}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h2 className="text-xs font-medium text-[#0A0A0A]">
          Permissions Matrix
        </h2>
        <p className="text-[11px] text-[#717182]">
          Module access by role (RBAC).
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
                No permissions found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No permissions to display"
            : `${totalRows} permission rows`}
        </span>
      </div>
    </div>
  );
}
