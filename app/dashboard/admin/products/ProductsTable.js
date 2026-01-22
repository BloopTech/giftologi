"use client";

import React, { useEffect, useMemo, useRef, useState, useActionState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  LoaderIcon,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/Tooltip";
import { useManageProductsContext } from "./context";
import { useDashboardContext } from "../context";
import { approveProduct, flagProduct, unflagProduct } from "./action";
import RejectProductDialog from "./RejectProductDialog";
import Image from "next/image";

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
  approved: "success",
  rejected: "error",
  flagged: "error",
};

const initialApproveState = {
  message: "",
  errors: {
    productId: [],
  },
  values: {},
  data: {},
};

const initialFlagState = {
  message: "",
  errors: {
    productId: [],
    reason: [],
  },
  values: {},
  data: {},
};

const initialUnflagState = {
  message: "",
  errors: {
    productId: [],
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

export default function ProductsTable() {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const lastAppliedFocusIdRef = useRef("");

  const {
    products,
    productsPage,
    pageSize,
    productsTotal,
    loadingProducts,
    setProductsPage,
    refreshProducts,
    focusId,
  } = useManageProductsContext() || {};

  const { currentAdmin } = useDashboardContext() || {};
  const allowedActionRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];
  const canModerate =
    !!currentAdmin && allowedActionRoles.includes(currentAdmin.role);

  const [approveState, approveAction, approvePending] = useActionState(
    approveProduct,
    initialApproveState
  );
  const [flagState, flagAction, flagPending] = useActionState(
    flagProduct,
    initialFlagState
  );

  const [unflagState, unflagAction, unflagPending] = useActionState(
    unflagProduct,
    initialUnflagState
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
      refreshProducts?.();
    } else if (
      approveState.message &&
      approveState.errors &&
      Object.keys(approveState.errors).length
    ) {
      toast.error(approveState.message);
    }
  }, [approveState, refreshProducts]);

  useEffect(() => {
    if (!flagState) return;
    if (
      flagState.message &&
      flagState.data &&
      Object.keys(flagState.data).length
    ) {
      toast.success(flagState.message);
      refreshProducts?.();
      setFlagOpen(false);
      setSelectedProduct(null);
    } else if (
      flagState.message &&
      flagState.errors &&
      Object.keys(flagState.errors).length
    ) {
      toast.error(flagState.message);
    }
  }, [flagState, refreshProducts]);

  useEffect(() => {
    if (!unflagState) return;
    if (
      unflagState.message &&
      unflagState.data &&
      Object.keys(unflagState.data).length
    ) {
      toast.success(unflagState.message);
      refreshProducts?.();
    } else if (
      unflagState.message &&
      unflagState.errors &&
      Object.keys(unflagState.errors).length
    ) {
      toast.error(unflagState.message);
    }
  }, [unflagState, refreshProducts]);

  const tableRows = useMemo(() => {
    if (!products || !products.length) return [];
    return products.map((row) => {
      const createdAtLabel = row.createdAt
        ? new Date(row.createdAt).toLocaleDateString()
        : "—";
      const normalizedStatus = (row.status || "pending").toLowerCase();
      const statusLabel =
        normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
      return {
        ...row,
        product_code: row.product_code || null,
        createdAtLabel,
        normalizedStatus,
        statusLabel,
      };
    });
  }, [products]);

  const focusIdValue = focusId ? String(focusId).trim() : "";

  useEffect(() => {
    if (!focusIdValue) return;
    if (!tableRows || !tableRows.length) return;
    if (lastAppliedFocusIdRef.current === focusIdValue) return;

    const match = tableRows.find(
      (row) =>
        String(row.id) === focusIdValue ||
        String(row.product_code || "") === focusIdValue
    );

    if (!match) return;

    lastAppliedFocusIdRef.current = focusIdValue;
    setSelectedProduct(match);
    setViewOpen(true);

    const el = document.getElementById(`product-row-${match.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusIdValue, tableRows]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("product_code", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Product ID" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#0A0A0A]">
              {info.getValue()}
            </span>
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
      columnHelper.accessor("categoryName", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Category" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#6A7282]">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("price", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Price (GHS)" />
        ),
        cell: (info) => {
          const value = Number(info.getValue() || 0);
          const label = Number.isNaN(value)
            ? "—"
            : value.toLocaleString("en-GH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
          return <span className="text-xs text-[#0A0A0A]">{label}</span>;
        },
      }),
      columnHelper.accessor("stockQty", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Stock" />
        ),
        cell: (info) => (
          <span className="text-xs text-[#0A0A0A]">
            {info.getValue() ?? "—"}
          </span>
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
          const isPending = original.normalizedStatus === "pending";
          const isFlagged = original.normalizedStatus === "flagged";

          if (!canModerate) {
            return (
              <div className="flex justify-end text-[11px] text-[#B0B7C3]">
                No actions
              </div>
            );
          }

          const handleView = () => {
            setSelectedProduct(original);
            setViewOpen(true);
          };

          const handleFlag = () => {
            setSelectedProduct(original);
            setFlagOpen(true);
          };

          return (
            <div className="flex justify-end items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleView}
                    aria-label="View product"
                    className="p-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View product</TooltipContent>
              </Tooltip>
              {isFlagged ? (
                <form action={unflagAction}>
                  <input type="hidden" name="productId" value={original.id} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="submit"
                        disabled={unflagPending}
                        aria-label="Unflag product"
                        className={cx(
                          "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                          "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
                          unflagPending &&
                            "opacity-60 cursor-not-allowed hover:bg-emerald-50"
                        )}
                      >
                        {unflagPending ? (
                          <LoaderIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          "Unflag"
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Unflag product</TooltipContent>
                  </Tooltip>
                </form>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleFlag}
                      aria-label="Flag product"
                      className="p-1 rounded-full border border-yellow-200 text-yellow-500 hover:bg-yellow-50 cursor-pointer"
                    >
                      <Flag className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Flag product</TooltipContent>
                </Tooltip>
              )}
              <form action={approveAction}>
                <input type="hidden" name="productId" value={original.id} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      disabled={!isPending || approvePending}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                        "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                        (!isPending || approvePending) &&
                          "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white"
                      )}
                    >
                      {approvePending ? (
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Approve product</TooltipContent>
                </Tooltip>
              </form>
              <RejectProductDialog
                product={original}
                onSuccess={() => refreshProducts?.()}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isPending || approvePending}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                        "border-[#DF0404] text-[#DF0404] bg-white hover:bg-[#DF0404] hover:text-white",
                        (!isPending || approvePending) &&
                          "opacity-60 cursor-not-allowed hover:bg-white hover:text-[#DF0404]"
                      )}
                    >
                      Reject
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Reject product</TooltipContent>
                </Tooltip>
              </RejectProductDialog>
            </div>
          );
        },
      }),
    ],
    [
      canModerate,
      approveAction,
      unflagAction,
      unflagPending,
      approvePending,
      refreshProducts,
    ]
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

  const totalRows = productsTotal ?? tableRows.length;
  const pageIndex = productsPage ?? 0;
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
          <h2 className="text-xs font-medium text-[#0A0A0A]">All Products</h2>
          <p className="text-[11px] text-[#717182]">
            Review and moderate products submitted by vendors.
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
          {loadingProducts ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-[#717182]"
              >
                Loading products...
              </td>
            </tr>
          ) : tableInstance.getRowModel().rows.length ? (
            tableInstance.getRowModel().rows.map((row) => {
              const original = row.original;
              const isFocused =
                !!focusIdValue &&
                (String(original.id) === focusIdValue ||
                  String(original.product_code || "") === focusIdValue);

              return (
                <tr
                  key={row.id}
                  id={`product-row-${original.id}`}
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
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Product Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              View product information and context.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="mt-3 space-y-3 text-xs text-[#0A0A0A]">
              {Array.isArray(selectedProduct.images) &&
              selectedProduct.images.length ? (
                <div>
                  <p className="font-medium mb-1">Images</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.images.map((url, index) => (
                      <div
                        key={url || index}
                        className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        <Image
                          src={url}
                          alt={
                            index === 0
                              ? "Featured product image"
                              : "Product image"
                          }
                          className="h-full w-full object-cover"
                          fill
                          priority
                          sizes="64px"
                        />
                        {index === 0 && (
                          <span className="absolute top-1 left-1 rounded-full bg-[#F97316] px-2 py-[2px] text-[10px] font-semibold text-white shadow-sm">
                            Featured
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="font-medium">Name</p>
                <p className="text-[#6A7282]">
                  {selectedProduct.name || "Untitled product"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Vendor</p>
                  <p className="text-[#6A7282]">
                    {selectedProduct.vendorName || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Category</p>
                  <p className="text-[#6A7282]">
                    {selectedProduct.categoryName || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Price (GHS)</p>
                  <p className="text-[#6A7282]">
                    {selectedProduct.price != null
                      ? Number(selectedProduct.price).toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Stock</p>
                  <p className="text-[#6A7282]">
                    {selectedProduct.stockQty ?? "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-[#6A7282]">
                    {selectedProduct.createdAt
                      ? new Date(selectedProduct.createdAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-[#6A7282]">
                    {selectedProduct.statusLabel || selectedProduct.status}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-medium">Product ID</p>
                <p className="text-[#6A7282] break-all">
                  {selectedProduct.product_code || selectedProduct.id}
                </p>
              </div>
              {selectedProduct.normalizedStatus === "rejected" && selectedProduct.rejection_reason ? (
                <div>
                  <p className="font-medium">Rejection Reason</p>
                  <p className="text-[#6A7282] whitespace-pre-wrap">
                    {selectedProduct.rejection_reason}
                  </p>
                </div>
              ) : null}
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
              Flag Product
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Create an escalated support ticket for this product.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <form action={flagAction} className="mt-3 space-y-4">
              <input
                type="hidden"
                name="productId"
                value={selectedProduct.id || ""}
              />

              <div className="space-y-1 text-xs text-[#0A0A0A]">
                <p className="font-medium">Product</p>
                <p className="text-[#6A7282]">
                  {selectedProduct.name || "Untitled product"}
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
                  rows={3}
                  className={cx(
                    "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput,
                    hasFlagError("reason") ? hasErrorInput : ""
                  )}
                  placeholder="Describe why this product needs attention"
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
                  {flagPending ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    "Flag Product"
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-[11px] text-[#6A7282] bg-white">
        <span>
          {totalRows === 0
            ? "No products to display"
            : `${pageStart} - ${pageEnd} of ${totalRows}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setProductsPage?.((prev) => (prev > 0 ? prev - 1 : 0))
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
              setProductsPage?.((prev) => (canNext ? prev + 1 : prev))
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
