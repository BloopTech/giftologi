"use client";

import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  useActionState,
} from "react";
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
import { cx } from "@/app/components/utils";
import { Badge } from "@/app/components/Badge";
import ProductDetailsDialog from "./ProductDetailsDialog";
import EditProductDialog from "./EditProductDialog";
import FlagProductDialog from "./FlagProductDialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/Tooltip";
import { useManageProductsContext } from "./context";
import { useDashboardContext } from "../context";
import { approveProduct, flagProduct, unflagProduct, updateProduct } from "./action";
import RejectProductDialog from "./RejectProductDialog";

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
    startTransition(() => {
      editAction(formData);
    });
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

      <ProductDetailsDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        product={selectedProduct}
      />

      <EditProductDialog
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
        product={selectedProduct}
        editState={editState}
        editPending={editPending}
        editStep={editStep}
        setEditStep={setEditStep}
        editFormRef={editFormRef}
        editFileInputRef={editFileInputRef}
        editParentCategoryId={editParentCategoryId}
        setEditParentCategoryId={setEditParentCategoryId}
        editSubcategoryId={editSubcategoryId}
        setEditSubcategoryId={setEditSubcategoryId}
        editSubcategoryOptions={editSubcategoryOptions}
        parentCategoryOptions={parentCategoryOptions}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        editSelectedCategoryId={editSelectedCategoryId}
        editVariationsPayload={editVariationsPayload}
        editVariationDrafts={editVariationDrafts}
        addEditVariationDraft={addEditVariationDraft}
        removeEditVariationDraft={removeEditVariationDraft}
        updateEditVariationDraft={updateEditVariationDraft}
        editExistingImages={editExistingImages}
        removeExistingImageAt={removeExistingImageAt}
        removeAllExistingImages={removeAllExistingImages}
        editImagePreviews={editImagePreviews}
        removeEditPreviewAt={removeEditPreviewAt}
        removeAllEditPreviews={removeAllEditPreviews}
        editFeaturedIndex={editFeaturedIndex}
        setEditFeaturedIndex={setEditFeaturedIndex}
        editFeaturedCount={editFeaturedCount}
        handleEditImagesChange={handleEditImagesChange}
        handleEditSave={handleEditSave}
        handleEditSubmit={handleEditSubmit}
        hasEditError={hasEditError}
        editErrorFor={editErrorFor}
        colorOptions={COLOR_OPTIONS}
        colorSwatches={COLOR_SWATCHES}
        sizeOptions={SIZE_OPTIONS}
        getCategoryDisplayName={getCategoryDisplayName}
      />

      <FlagProductDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        product={selectedProduct}
        flagAction={flagAction}
        flagPending={flagPending}
        hasFlagError={hasFlagError}
        flagErrorFor={flagErrorFor}
      />

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
