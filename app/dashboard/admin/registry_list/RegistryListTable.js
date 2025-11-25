"use client";

import React, { useMemo, useState } from "react";
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
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import { useRegistryListContext } from "./context";

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
  Active: "success",
  Expired: "warning",
  Flagged: "error",
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
  const {
    registries,
    registryPage,
    pageSize,
    registriesTotal,
    loadingRegistries,
    setRegistryPage,
  } = useRegistryListContext() || {};

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
          <span className="text-xs font-medium text-[#0A0A0A]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("hostName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Host Name" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("hostEmail", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Host Email" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
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
            if (!raw?.registry?.registry_code) return;
            const code = raw.registry.registry_code;
            window.open(`/dashboard/h/registry/${code}`, "_blank");
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
            </div>
          );
        },
      }),
    ],
    []
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
