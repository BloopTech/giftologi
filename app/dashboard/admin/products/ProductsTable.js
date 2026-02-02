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
  Pencil,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/Tooltip";
import { useManageProductsContext } from "./context";
import { useDashboardContext } from "../context";
import { approveProduct, flagProduct, unflagProduct, updateProduct } from "./action";
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

const COLOR_OPTIONS = [
  "Black",
  "White",
  "Gray",
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Pink",
  "Brown",
  "Gold",
  "Silver",
];

const COLOR_SWATCHES = {
  Black: "#111827",
  White: "#F9FAFB",
  Gray: "#9CA3AF",
  Red: "#EF4444",
  Orange: "#F97316",
  Yellow: "#FACC15",
  Green: "#22C55E",
  Blue: "#3B82F6",
  Purple: "#8B5CF6",
  Pink: "#EC4899",
  Brown: "#A16207",
  Gold: "#D4AF37",
  Silver: "#CBD5F5",
};

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

const createVariationId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseVariationDrafts = (raw) => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      return {
        id: createVariationId(),
        label: typeof entry.label === "string" ? entry.label : "",
        color: typeof entry.color === "string" ? entry.color : "",
        size: typeof entry.size === "string" ? entry.size : "",
        sku: typeof entry.sku === "string" ? entry.sku : "",
        price:
          entry.price === null || typeof entry.price === "undefined"
            ? ""
            : String(entry.price),
      };
    })
    .filter(Boolean);
};

const buildVariationPayload = (drafts) => {
  if (!Array.isArray(drafts)) return "";
  const normalized = drafts
    .map((draft, index) => {
      if (!draft || typeof draft !== "object") return null;
      const color = String(draft.color || "").trim();
      const size = String(draft.size || "").trim();
      const sku = String(draft.sku || "").trim();
      const labelInput = String(draft.label || "").trim();
      const fallbackLabel =
        labelInput ||
        [color, size].filter(Boolean).join(" / ") ||
        sku ||
        `Variant ${index + 1}`;
      const priceValue =
        draft.price === "" || draft.price === null || typeof draft.price === "undefined"
          ? null
          : Number(draft.price);
      const price = Number.isFinite(priceValue) ? priceValue : null;

      if (!fallbackLabel && !color && !size && !sku && price == null) return null;

      const entry = {};
      if (fallbackLabel) entry.label = fallbackLabel;
      if (color) entry.color = color;
      if (size) entry.size = size;
      if (sku) entry.sku = sku;
      if (price != null) entry.price = price;
      return entry;
    })
    .filter(Boolean);

  if (!normalized.length) return "";
  return JSON.stringify(normalized);
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

const initialUpdateState = {
  message: "",
  errors: {
    productId: [],
    name: [],
    description: [],
    price: [],
    stockQty: [],
    categoryId: [],
    variations: [],
    images: [],
    featuredImageIndex: [],
    existingImages: [],
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

export default function ProductsTable({
  categories = [],
  categoriesLoading = false,
  categoriesError = "",
}) {
  const [sorting, setSorting] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  const [editState, editAction, editPending] = useActionState(
    updateProduct,
    initialUpdateState
  );

  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [editFeaturedIndex, setEditFeaturedIndex] = useState("");
  const editFileInputRef = useRef(null);
  const editFormRef = useRef(null);

  const [editParentCategoryId, setEditParentCategoryId] = useState("");
  const [editSubcategoryId, setEditSubcategoryId] = useState("");
  const [editVariationDrafts, setEditVariationDrafts] = useState([]);
  const [editStep, setEditStep] = useState(0);

  const handleEditSubmit = (event) => {
    event.preventDefault();
  };

  const handleEditSave = () => {
    if (editStep !== 2) {
      setEditStep(2);
      return;
    }
    if (!editFormRef.current || editPending) return;
    const formData = new FormData(editFormRef.current);
    editAction(formData);
  };

  const flagErrorFor = (key) => flagState?.errors?.[key] ?? [];
  const hasFlagError = (key) => (flagErrorFor(key)?.length ?? 0) > 0;

  const editErrorFor = (key) => editState?.errors?.[key] ?? [];
  const hasEditError = (key) => (editErrorFor(key)?.length ?? 0) > 0;

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

  useEffect(() => {
    if (!editState) return;
    if (
      editState.message &&
      editState.data &&
      Object.keys(editState.data).length
    ) {
      toast.success(editState.message);
      setEditOpen(false);
      setSelectedProduct(null);
      setEditImagePreviews([]);
      setEditFeaturedIndex("");
      setEditVariationDrafts([]);
      refreshProducts?.();
    } else if (
      editState.message &&
      editState.errors &&
      Object.keys(editState.errors).length
    ) {
      toast.error(editState.message);
    }
  }, [editState, refreshProducts]);

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

  const categoriesById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const categoriesByParentId = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      const parentId = category.parent_category_id || null;
      const existing = map.get(parentId) || [];
      existing.push(category);
      map.set(parentId, existing);
    });

    for (const [key, list] of map.entries()) {
      list.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      map.set(key, list);
    }

    return map;
  }, [categories]);

  const editSubcategoryOptions = useMemo(() => {
    if (!editParentCategoryId) return [];
    return categoriesByParentId.get(editParentCategoryId) || [];
  }, [categoriesByParentId, editParentCategoryId]);

  const parentCategoryOptions = useMemo(() => {
    return categoriesByParentId.get(null) || [];
  }, [categoriesByParentId]);

  const editSelectedCategoryId = editSubcategoryId || editParentCategoryId;

  const getCategoryDisplayName = useMemo(() => {
    return (category) => {
      if (!category) return "Untitled";
      const name = category.name || "Untitled";
      const parentId = category.parent_category_id;
      if (!parentId) return name;
      const parent = categoriesById.get(parentId);
      if (!parent) return name;
      return `${parent.name || "Untitled"} / ${name}`;
    };
  }, [categoriesById]);

  const editVariationsPayload = useMemo(
    () => buildVariationPayload(editVariationDrafts),
    [editVariationDrafts]
  );

  const addEditVariationDraft = () => {
    setEditVariationDrafts((prev) => [
      ...prev,
      {
        id: createVariationId(),
        label: "",
        color: "",
        size: "",
        sku: "",
        price: "",
      },
    ]);
  };

  const updateEditVariationDraft = (id, field, value) => {
    setEditVariationDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft
      )
    );
  };

  const removeEditVariationDraft = (id) => {
    setEditVariationDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

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

  useEffect(() => {
    if (!editOpen) return;
    setEditStep(0);
    const existing = Array.isArray(selectedProduct?.images)
      ? selectedProduct.images.filter(Boolean).slice(0, 3)
      : [];
    setEditExistingImages(existing);
    setEditImagePreviews([]);
    setEditFeaturedIndex("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    const selectedCategory = selectedProduct?.categoryId
      ? categoriesById.get(selectedProduct.categoryId)
      : null;
    if (selectedCategory?.parent_category_id) {
      setEditParentCategoryId(selectedCategory.parent_category_id);
      setEditSubcategoryId(selectedCategory.id);
    } else {
      setEditParentCategoryId(selectedCategory?.id || "");
      setEditSubcategoryId("");
    }
    setEditVariationDrafts(
      parseVariationDrafts(selectedProduct?.variations || [])
    );
  }, [editOpen, selectedProduct?.id, categoriesById, selectedProduct?.variations]);

  const buildEditPreviews = (files) => {
    const list = Array.from(files || []).filter((file) =>
      Boolean(file && file.type && file.type.startsWith("image/"))
    );
    const limited = list.slice(0, 3);

    if (list.length !== limited.length && editFileInputRef.current) {
      const dt = new DataTransfer();
      limited.forEach((f) => dt.items.add(f));
      editFileInputRef.current.files = dt.files;
    }

    Promise.all(
      limited.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ file, preview: reader.result });
            reader.readAsDataURL(file);
          })
      )
    ).then((items) => {
      setEditImagePreviews(items);
      setEditFeaturedIndex("");
    });
  };

  const handleEditImagesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setEditImagePreviews([]);
      return;
    }
    buildEditPreviews(files);
  };

  const syncEditInputFiles = (nextPreviews) => {
    if (!editFileInputRef.current) return;
    const dt = new DataTransfer();
    nextPreviews.forEach((item) => {
      if (item?.file) dt.items.add(item.file);
    });
    editFileInputRef.current.files = dt.files;
  };

  const removeEditPreviewAt = (index) => {
    setEditImagePreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncEditInputFiles(next);
      setEditFeaturedIndex("");
      return next;
    });
  };

  const removeAllEditPreviews = () => {
    setEditImagePreviews([]);
    setEditFeaturedIndex("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const removeExistingImageAt = (index) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
    setEditFeaturedIndex("");
  };

  const removeAllExistingImages = () => {
    setEditExistingImages([]);
    setEditFeaturedIndex("");
  };

  const editFeaturedCount = editImagePreviews.length
    ? editImagePreviews.length
    : editExistingImages.length;

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

          const handleEdit = () => {
            setSelectedProduct(original);
            setEditOpen(true);
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleEdit}
                    aria-label="Edit product"
                    className="p-1 rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50 cursor-pointer"
                  >
                    <Pencil className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit product</TooltipContent>
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

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditImagePreviews([]);
            setEditFeaturedIndex("");
            setEditVariationDrafts([]);
            setEditStep(0);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Product
            </DialogTitle>
            <DialogDescription className="text-xs text-[#717182]">
              Update product details, pricing, and images.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <form
              ref={editFormRef}
              onSubmit={handleEditSubmit}
              className="mt-4 space-y-6 text-xs text-[#0A0A0A]"
            >
              <input type="hidden" name="productId" value={selectedProduct.id} />
              <input
                type="hidden"
                name="categoryId"
                value={editSelectedCategoryId || ""}
              />
              <input type="hidden" name="variations" value={editVariationsPayload} />
              <input
                type="hidden"
                name="featuredImageIndex"
                value={editFeaturedIndex || ""}
              />
              <input
                type="hidden"
                name="existing_images"
                value={JSON.stringify(editExistingImages)}
              />

              {editState?.message && Object.keys(editState?.errors || {}).length ? (
                <p className="text-[11px] text-red-600">{editState.message}</p>
              ) : null}

              <div className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 flex flex-wrap gap-2">
                {["Details", "Variations", "Images"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEditStep(index)}
                    disabled={editPending}
                    className={cx(
                      "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                      editStep === index
                        ? "bg-primary text-white"
                        : "bg-white text-[#6B7280] border border-transparent hover:border-primary/40"
                    )}
                  >
                    {`${index + 1}. ${label}`}
                  </button>
                ))}
              </div>

              <div
                className={cx(
                  "grid grid-cols-1 md:grid-cols-2 gap-4",
                  editStep === 0 ? "" : "hidden"
                )}
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={editParentCategoryId || ""}
                    onValueChange={(value) => {
                      setEditParentCategoryId(value || "");
                      setEditSubcategoryId("");
                    }}
                    disabled={categoriesLoading || editPending}
                  >
                    <SelectTrigger className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCategoryOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name || "Untitled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoriesError ? (
                    <p className="mt-1 text-[11px] text-red-600">
                      {categoriesError}
                    </p>
                  ) : null}
                  {hasEditError("categoryId") ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {editErrorFor("categoryId").map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Subcategory
                  </label>
                  <Select
                    value={editSubcategoryId || ""}
                    onValueChange={(value) => setEditSubcategoryId(value || "")}
                    disabled={
                      categoriesLoading ||
                      editPending ||
                      !editParentCategoryId ||
                      !editSubcategoryOptions.length
                    }
                  >
                    <SelectTrigger className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {editSubcategoryOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {getCategoryDisplayName(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={selectedProduct.name || ""}
                    maxLength={100}
                    className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                    disabled={editPending}
                  />
                  {hasEditError("name") ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {editErrorFor("name").map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Price (GHS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="price"
                    type="text"
                    inputMode="decimal"
                    defaultValue={
                      selectedProduct.price == null
                        ? ""
                        : String(selectedProduct.price)
                    }
                    className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                    disabled={editPending}
                  />
                  {hasEditError("price") ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {editErrorFor("price").map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Stock Quantity
                  </label>
                  <input
                    name="stockQty"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    defaultValue={selectedProduct.stockQty ?? ""}
                    className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                    disabled={editPending}
                  />
                  {hasEditError("stockQty") ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {editErrorFor("stockQty").map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-[#717182]">
                      Optional. Leave blank if stock is managed elsewhere.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={selectedProduct.description || ""}
                    className="w-full rounded-lg border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                    disabled={editPending}
                  />
                  {hasEditError("description") ? (
                    <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                      {editErrorFor("description").map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <div className={cx("space-y-2", editStep === 1 ? "" : "hidden")}>
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Variations (optional)
                </label>
                <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] text-[#717182]">
                      Add color/size options or SKU-only variants. Price overrides the
                      base price.
                    </p>
                    <button
                      type="button"
                      onClick={addEditVariationDraft}
                      className="cursor-pointer inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:border-primary hover:text-primary"
                      disabled={editPending}
                    >
                      + Add variation
                    </button>
                  </div>

                  {editVariationDrafts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#D6D6D6] bg-[#F9FAFB] p-4 text-center text-[11px] text-[#6B7280]">
                      No variations yet. Add one to offer color, size, or SKU options.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editVariationDrafts.map((draft, index) => {
                        const colorValue = draft.color || "";
                        const sizeValue = draft.size || "";
                        return (
                          <div
                            key={draft.id}
                            className="rounded-lg border border-[#E5E7EB] p-3 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-[#6B7280]">
                                Variation {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeEditVariationDraft(draft.id)}
                                className="cursor-pointer text-[11px] text-red-500 hover:text-red-600"
                                disabled={editPending}
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-[#374151]">
                                  Label (auto if blank)
                                </label>
                                <input
                                  type="text"
                                  value={draft.label}
                                  onChange={(e) =>
                                    updateEditVariationDraft(
                                      draft.id,
                                      "label",
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g., Red / Small"
                                  className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  disabled={editPending}
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-[#374151]">
                                  SKU (optional)
                                </label>
                                <input
                                  type="text"
                                  value={draft.sku}
                                  onChange={(e) =>
                                    updateEditVariationDraft(
                                      draft.id,
                                      "sku",
                                      e.target.value
                                    )
                                  }
                                  placeholder="SKU-RED-S"
                                  className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  disabled={editPending}
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-[#374151]">
                                  Price override (optional)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(e) =>
                                    updateEditVariationDraft(
                                      draft.id,
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  disabled={editPending}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[11px] font-medium text-[#374151]">
                                Color
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {COLOR_OPTIONS.map((color) => {
                                  const isSelected = colorValue === color;
                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() =>
                                        updateEditVariationDraft(
                                          draft.id,
                                          "color",
                                          isSelected ? "" : color
                                        )
                                      }
                                      className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-[#E5E7EB] text-[#6B7280] hover:border-primary/50"
                                      }`}
                                      disabled={editPending}
                                    >
                                      <span
                                        className="h-3 w-3 rounded-full border"
                                        style={{
                                          background:
                                            COLOR_SWATCHES[color] || "#E5E7EB",
                                          borderColor:
                                            color === "White" ? "#E5E7EB" : "transparent",
                                        }}
                                      />
                                      {color}
                                    </button>
                                  );
                                })}
                              </div>
                              <input
                                type="text"
                                value={colorValue}
                                onChange={(e) =>
                                  updateEditVariationDraft(
                                    draft.id,
                                    "color",
                                    e.target.value
                                  )
                                }
                                placeholder="Custom color"
                                className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                disabled={editPending}
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-[11px] font-medium text-[#374151]">
                                Size
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {SIZE_OPTIONS.map((size) => {
                                  const isSelected = sizeValue === size;
                                  return (
                                    <button
                                      key={size}
                                      type="button"
                                      onClick={() =>
                                        updateEditVariationDraft(
                                          draft.id,
                                          "size",
                                          isSelected ? "" : size
                                        )
                                      }
                                      className={`cursor-pointer inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-[#E5E7EB] text-[#6B7280] hover:border-primary/50"
                                      }`}
                                      disabled={editPending}
                                    >
                                      {size}
                                    </button>
                                  );
                                })}
                              </div>
                              <input
                                type="text"
                                value={sizeValue}
                                onChange={(e) =>
                                  updateEditVariationDraft(
                                    draft.id,
                                    "size",
                                    e.target.value
                                  )
                                }
                                placeholder="Custom size"
                                className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                disabled={editPending}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {hasEditError("variations") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("variations").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className={cx("space-y-4", editStep === 2 ? "" : "hidden")}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Product Images
                  </label>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="text-[11px] text-primary hover:underline"
                    disabled={editPending}
                  >
                    {editImagePreviews.length || editExistingImages.length
                      ? "Replace"
                      : "Upload"}
                  </button>
                </div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  name="product_images"
                  accept="image/*"
                  multiple
                  onChange={handleEditImagesChange}
                  className="hidden"
                  disabled={editPending}
                />

                <div className="space-y-2">
                  <p className="text-[11px] text-[#717182]">
                    Uploading new images replaces existing ones (max 3).
                  </p>
                  {editExistingImages.length ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-[#0A0A0A]">
                        Current images
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {editExistingImages.map((url, idx) => (
                          <div
                            key={`${url}-${idx}`}
                            className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-200"
                          >
                            <img
                              src={url}
                              alt={`Existing ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImageAt(idx)}
                              className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={removeAllExistingImages}
                        className="text-[11px] text-red-500 hover:text-red-600"
                        disabled={editPending}
                      >
                        Remove all current images
                      </button>
                    </div>
                  ) : null}

                  {editImagePreviews.length ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-[#0A0A0A]">
                        New uploads
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {editImagePreviews.map((item, idx) => (
                          <div
                            key={idx}
                            className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-200"
                          >
                            <img
                              src={item.preview}
                              alt={`Preview ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeEditPreviewAt(idx)}
                              className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={removeAllEditPreviews}
                        className="text-[11px] text-red-500 hover:text-red-600"
                        disabled={editPending}
                      >
                        Clear new images
                      </button>
                    </div>
                  ) : null}

                  {!editExistingImages.length && !editImagePreviews.length ? (
                    <p className="text-[11px] text-[#717182]">
                      No images yet. Upload up to 3 images per product.
                    </p>
                  ) : null}
                </div>

                {hasEditError("images") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("images").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#0A0A0A]">
                    Featured Image
                  </label>
                  {editFeaturedCount <= 0 ? (
                    <p className="text-[11px] text-[#717182]">
                      Select images above first. If you do not choose a featured
                      image, the first image will be used.
                    </p>
                  ) : (
                    <select
                      value={editFeaturedIndex}
                      onChange={(e) => setEditFeaturedIndex(e.target.value)}
                      className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                      disabled={editPending}
                    >
                      <option value="">Use first image as featured</option>
                      {Array.from({ length: Math.min(editFeaturedCount, 3) }).map(
                        (_, idx) => (
                          <option key={idx} value={String(idx)}>
                            {`Image ${idx + 1}`}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={editPending}
                  >
                    Cancel
                  </button>
                </DialogClose>
                {editStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setEditStep((prev) => Math.max(prev - 1, 0))}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={editPending}
                  >
                    Back
                  </button>
                ) : null}
                {editStep < 2 ? (
                  <button
                    type="button"
                    onClick={() => setEditStep((prev) => Math.min(prev + 1, 2))}
                    className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                    disabled={editPending}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={editPending}
                    className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                  >
                    {editPending ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </form>
          )}
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
