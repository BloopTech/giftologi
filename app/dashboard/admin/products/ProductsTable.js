"use client";

import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  useActionState,
  useCallback
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
import {
  flagProduct,
  unflagProduct,
  updateProduct,
  setFeaturedProduct,
} from "./action";
import RejectProductDialog from "./RejectProductDialog";
import ApproveProductDialog from "./ApproveProductDialog";

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
    weightKg: [],
    serviceCharge: [],
    stockQty: [],
    categoryIds: [],
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

  const [featuredState, featuredAction, featuredPending] = useActionState(
    setFeaturedProduct,
    {
      errors: { productId: [], featured: [] },
      values: {},
      data: {},
    },
  );

  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [editFeaturedIndex, setEditFeaturedIndex] = useState("");
  const editFileInputRef = useRef(null);
  const editFormRef = useRef(null);

  const [editCategoryIds, setEditCategoryIds] = useState([]);
  const [editVariationDrafts, setEditVariationDrafts] = useState([]);
  const [editActiveVariationFieldById, setEditActiveVariationFieldById] = useState({});
  const [editStep, setEditStep] = useState(0);

  const handleEditSubmit = (event) => {
    event.preventDefault();
  };

  const handleEditSave = () => {
    if (editStep !== 3) {
      setEditStep(3);
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

  useEffect(() => {
    if (!featuredState) return;
    if (
      featuredState.message &&
      featuredState.data &&
      Object.keys(featuredState.data).length
    ) {
      toast.success(featuredState.message);
      refreshProducts?.();
    } else if (
      featuredState.message &&
      featuredState.errors &&
      Object.keys(featuredState.errors).length
    ) {
      toast.error(featuredState.message);
    }
  }, [featuredState, refreshProducts]);

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

  const parentCategoryOptions = useMemo(() => {
    return categoriesByParentId.get(null) || [];
  }, [categoriesByParentId]);

  const editCategoryIdSet = useMemo(
    () => new Set(editCategoryIds),
    [editCategoryIds],
  );

  const toggleEditCategory = useCallback((categoryId) => {
    if (!categoryId) return;
    setEditCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

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
    const seededCategoryIds = Array.isArray(selectedProduct?.categoryIds)
      ? selectedProduct.categoryIds
      : [];
    const mergedCategoryIds = [
      ...new Set(
        [...seededCategoryIds, selectedProduct?.categoryId].filter(Boolean),
      ),
    ];
    setEditCategoryIds(mergedCategoryIds);
    setEditVariationDrafts(
      parseVariationDrafts(selectedProduct?.variations || [])
    );
    setEditActiveVariationFieldById({});
  }, [editOpen, selectedProduct?.id, selectedProduct?.categoryIds, selectedProduct?.variations]);

  const buildEditPreviews = (files, currentPreviews = []) => {
    const list = Array.from(files || []).filter((file) =>
      Boolean(file && file.type && file.type.startsWith("image/"))
    );
    const existingCount = editExistingImages.length;
    const remainingSlots = Math.max(0, 3 - existingCount - currentPreviews.length);
    const limited = list.slice(0, remainingSlots);

    if (editFileInputRef.current) {
      const dt = new DataTransfer();
      currentPreviews.forEach((item) => {
        if (item?.file) dt.items.add(item.file);
      });
      limited.forEach((f) => dt.items.add(f));
      editFileInputRef.current.files = dt.files;
    }

    if (!limited.length) return;

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
      setEditImagePreviews((prev) => [...prev, ...items]);
      setEditFeaturedIndex("");
    });
  };

  const handleEditImagesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    buildEditPreviews(files, editImagePreviews);
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

  const editFeaturedCount = editImagePreviews.length + editExistingImages.length;

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
        cell: (info) => {
          const row = info.row.original;
          const categoryIds = Array.isArray(row?.categoryIds)
            ? row.categoryIds
            : row?.categoryId
              ? [row.categoryId]
              : [];

          const labels = categoryIds
            .map((id) => categoriesById.get(id))
            .filter(Boolean)
            .map((cat) => getCategoryDisplayName(cat));

          if (!labels.length) {
            return <span className="text-xs text-[#6A7282]">—</span>;
          }

          const visible = labels.slice(0, 3);
          const remaining = labels.length - visible.length;

          return (
            <div className="flex flex-wrap gap-1.5 max-w-[240px]">
              {visible.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[#374151]"
                  title={label}
                >
                  {label}
                </span>
              ))}
              {remaining > 0 ? (
                <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[#374151]">
                  +{remaining}
                </span>
              ) : null}
            </div>
          );
        },
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
      columnHelper.accessor("weightKg", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Weight (kg)" />
        ),
        cell: (info) => {
          const value = Number(info.getValue());
          if (!Number.isFinite(value)) {
            return <span className="text-xs text-[#6A7282]">—</span>;
          }
          const label = value.toLocaleString("en-GH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return <span className="text-xs text-[#0A0A0A]">{label}</span>;
        },
      }),
      columnHelper.accessor("serviceCharge", {
        header: ({ column }) => (
          <SortableHeader column={column} title="Service Charge (GHS)" />
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
      columnHelper.display({
        id: "totalPrice",
        header: ({ column }) => (
          <SortableHeader column={column} title="Total (GHS)" />
        ),
        cell: ({ row }) => {
          const base = Number(row.original?.price || 0);
          const charge = Number(row.original?.serviceCharge || 0);
          const total =
            (Number.isFinite(base) ? base : 0) +
            (Number.isFinite(charge) ? charge : 0);
          const label = Number.isFinite(total)
            ? total.toLocaleString("en-GH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "—";
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
          const isFeatured = !!original.isFeatured;

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

              <form action={featuredAction}>
                <input type="hidden" name="productId" value={original.id} />
                <input type="hidden" name="featured" value={isFeatured ? "0" : "1"} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      disabled={featuredPending}
                      aria-label={isFeatured ? "Unfeature product" : "Feature product"}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                        isFeatured
                          ? "border-gray-400 text-gray-700 bg-gray-50 hover:bg-gray-100"
                          : "border-primary text-primary bg-white hover:bg-primary hover:text-white",
                        featuredPending &&
                          "opacity-60 cursor-not-allowed hover:bg-white hover:text-primary",
                      )}
                    >
                      {featuredPending ? (
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                      ) : isFeatured ? (
                        "Unfeature"
                      ) : (
                        "Feature"
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFeatured ? "Remove from featured" : "Add to featured"}
                  </TooltipContent>
                </Tooltip>
              </form>

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
              <Tooltip>
                <ApproveProductDialog
                  product={original}
                  onSuccess={() => refreshProducts?.()}
                >
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isPending}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                        "border-[#6EA30B] text-white bg-[#6EA30B] hover:bg-white hover:text-[#6EA30B]",
                        !isPending &&
                          "opacity-60 cursor-not-allowed hover:bg-[#6EA30B] hover:text-white"
                      )}
                    >
                      Approve
                    </button>
                  </TooltipTrigger>
                </ApproveProductDialog>
                <TooltipContent>Approve product</TooltipContent>
              </Tooltip>
              <RejectProductDialog
                product={original}
                onSuccess={() => refreshProducts?.()}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isPending}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-medium cursor-pointer border",
                        "border-[#DF0404] text-[#DF0404] bg-white hover:bg-[#DF0404] hover:text-white",
                        !isPending &&
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
      unflagAction,
      unflagPending,
      featuredAction,
      featuredPending,
      refreshProducts,
      categoriesById,
      getCategoryDisplayName,
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
                      "outline outline-[#3979D2] -outline-offset-1 bg-[#EEF4FF]"
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
            setEditActiveVariationFieldById({});
            setEditStep(0);
            setEditCategoryIds([]);
          }
        }}
        product={selectedProduct}
        editState={editState}
        editPending={editPending}
        editStep={editStep}
        setEditStep={setEditStep}
        editFormRef={editFormRef}
        editFileInputRef={editFileInputRef}
        editCategoryIds={editCategoryIds}
        editCategoryIdSet={editCategoryIdSet}
        toggleEditCategory={toggleEditCategory}
        clearEditCategories={() => setEditCategoryIds([])}
        parentCategoryOptions={parentCategoryOptions}
        categoriesByParentId={categoriesByParentId}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        categoriesById={categoriesById}
        editVariationsPayload={editVariationsPayload}
        editVariationDrafts={editVariationDrafts}
        addEditVariationDraft={addEditVariationDraft}
        removeEditVariationDraft={removeEditVariationDraft}
        updateEditVariationDraft={updateEditVariationDraft}
        editActiveVariationFieldById={editActiveVariationFieldById}
        setEditActiveVariationFieldById={setEditActiveVariationFieldById}
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
