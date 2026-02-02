"use client";
import React, {
  startTransition,
  useState,
  useEffect,
  useActionState,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PiPackage,
  PiCurrencyCircleDollar,
  PiWarningCircle,
  PiXCircle,
  PiMagnifyingGlass,
  PiCaretDown,
  PiDotsThreeVertical,
  PiPencilSimple,
  PiTrash,
  PiUploadSimple,
  PiX,
  PiPlus,
  PiImage,
} from "react-icons/pi";
import { useVendorProductsContext } from "./context";
import { manageProducts } from "./action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../../components/Dialog";
import {
  formatCount,
  formatCurrency,
  getStatusBadge,
  getStockStatus,
  calculateMargin,
  StatCard,
} from "./utils";
import { AddProductDialog } from "../components/addProductDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/Dropdown";

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
        labelInput || [color, size].filter(Boolean).join(" / ") || sku || `Variant ${index + 1}`;
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

function ProductActionsMenu({ product, onEdit, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
          <PiDotsThreeVertical className="w-5 h-5 text-[#6B7280]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12}>
        <DropdownMenuItem onSelect={() => onEdit?.(product)}>
          <span className="flex items-center gap-2">
            <PiPencilSimple className="w-4 h-4" />
            Edit
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDelete?.(product)}>
          <span className="flex items-center gap-2 text-red-600">
            <PiTrash className="w-4 h-4" />
            Delete
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function VendorProductsContent() {
  const {
    vendor,
    categories,
    loading,
    error,
    refreshData,
    totalProducts,
    inventoryValue,
    lowStockCount,
    outOfStockCount,
    productsWithSales,
  } = useVendorProductsContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [editState, editAction, editPending] = useActionState(manageProducts, {
    success: false,
    message: "",
    errors: {},
    values: {},
  });

  const [editSubmitAttempted, setEditSubmitAttempted] = useState(false);
  const editSubmitAttemptedRef = useRef(false);

  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [editFeaturedIndex, setEditFeaturedIndex] = useState("");
  const editFileInputRef = useRef(null);
  const editFormRef = useRef(null);

  const [editParentCategoryId, setEditParentCategoryId] = useState("");
  const [editSubcategoryId, setEditSubcategoryId] = useState("");
  const [editVariationDrafts, setEditVariationDrafts] = useState([]);
  const [editCurrentStep, setEditCurrentStep] = useState(0);
  const editStepLabels = ["Basics", "Variations", "Images"];

  const handleEditSubmit = (event) => {
    event.preventDefault();
  };

  const handleEditSave = () => {
    const lastStepIndex = editStepLabels.length - 1;
    if (editCurrentStep !== lastStepIndex) {
      setEditCurrentStep(lastStepIndex);
      return;
    }

    if (!editFormRef.current || editPending) return;
    const formData = new FormData(editFormRef.current);
    editSubmitAttemptedRef.current = true;
    setEditSubmitAttempted(true);

    startTransition(() => {
      editAction(formData);
    });
  };

  const editErrorFor = (key) => editState?.errors?.[key];
  const hasEditError = (key) => {
    if (!editSubmitAttempted) return false;
    const err = editErrorFor(key);
    if (!err) return false;
    if (Array.isArray(err)) return err.length > 0;
    return Boolean(String(err).trim());
  };

  const toErrorList = (err) => {
    if (!err) return [];
    if (Array.isArray(err)) return err.filter(Boolean);
    const str = String(err).trim();
    return str ? [str] : [];
  };

  const categoriesById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const categoriesByParentId = React.useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      const parentId = category.parent_category_id || null;
      const existing = map.get(parentId) || [];
      existing.push(category);
      map.set(parentId, existing);
    });

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      map.set(key, list);
    }

    return map;
  }, [categories]);

  const editSubcategoryOptions = React.useMemo(() => {
    if (!editParentCategoryId) return [];
    return categoriesByParentId.get(editParentCategoryId) || [];
  }, [categoriesByParentId, editParentCategoryId]);

  const editSelectedCategoryId = editSubcategoryId || editParentCategoryId;

  const getCategoryDisplayName = React.useCallback(
    (category) => {
      if (!category) return "Untitled";
      const name = category.name || "Untitled";
      const parentId = category.parent_category_id;
      if (!parentId) return name;
      const parent = categoriesById.get(parentId);
      if (!parent) return name;
      return `${parent.name || "Untitled"} / ${name}`;
    },
    [categoriesById],
  );

  const editVariationsPayload = useMemo(
    () => buildVariationPayload(editVariationDrafts),
    [editVariationDrafts],
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
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const removeEditVariationDraft = (id) => {
    setEditVariationDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  useEffect(() => {
    if (!editDialogOpen) return;
    editSubmitAttemptedRef.current = false;
    setEditSubmitAttempted(false);
    setEditCurrentStep(0);
    const existing = Array.isArray(selectedProduct?.images)
      ? selectedProduct.images.filter(Boolean)
      : [];
    setEditExistingImages(existing.slice(0, 3));
    setEditImagePreviews([]);
    setEditFeaturedIndex("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    const selectedCategory = selectedProduct?.category_id
      ? categoriesById.get(selectedProduct.category_id)
      : null;
    if (selectedCategory?.parent_category_id) {
      setEditParentCategoryId(selectedCategory.parent_category_id);
      setEditSubcategoryId(selectedCategory.id);
    } else {
      setEditParentCategoryId(selectedCategory?.id || "");
      setEditSubcategoryId("");
    }
    const initialVariations =
      editState?.values?.variations ?? selectedProduct?.variations ?? "";
    setEditVariationDrafts(parseVariationDrafts(initialVariations));
  }, [editDialogOpen, selectedProduct?.id]);

  useEffect(() => {
    if (!editDialogOpen) return;
    if (!editState?.values?.variations) return;
    setEditVariationDrafts(parseVariationDrafts(editState.values.variations));
  }, [editDialogOpen, editState?.values?.variations]);

  useEffect(() => {
    if (!editState?.success) return;
    setEditDialogOpen(false);
    setSelectedProduct(null);
    setEditImagePreviews([]);
    setEditFeaturedIndex("");
    setEditVariationDrafts([]);
    setEditCurrentStep(0);
    editSubmitAttemptedRef.current = false;
    setEditSubmitAttempted(false);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    editFormRef.current?.reset();
    refreshData?.();
  }, [editState?.success, refreshData]);

  useEffect(() => {
    if (!editDialogOpen) return;
    if (!editSubmitAttemptedRef.current) return;
    if (editState?.success) return;

    const errors = editState?.errors || {};
    if (!errors || !Object.keys(errors).length) return;

    if (errors.images) {
      setEditCurrentStep(2);
    } else if (errors.variations) {
      setEditCurrentStep(1);
    } else {
      setEditCurrentStep(0);
    }
  }, [editDialogOpen, editState]);

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
      setEditFeaturedIndex("");
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

  const removeEditImageAt = (index) => {
    setEditImagePreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncEditInputFiles(next);
      setEditFeaturedIndex("");
      return next;
    });
  };

  const removeAllEditImages = () => {
    setEditImagePreviews([]);
    setEditExistingImages([]);
    setEditFeaturedIndex("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const removeExistingImageAt = (index) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
    setEditFeaturedIndex("");
  };

  const editFeaturedCount = editImagePreviews.length
    ? editImagePreviews.length
    : editExistingImages.length;

  const filteredProducts = productsWithSales.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      product.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="h-8 w-48 rounded-lg bg-[#E5E7EB] animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-[#E5E7EB] animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 w-full rounded-xl bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col space-y-2 w-full mb-8">
        <h1 className="text-[#111827] font-semibold font-inter">Products</h1>
        <p className="text-[#6B7280] text-sm font-poppins">{error}</p>
      </div>
    );
  }

  return (
    <section aria-label="Vendor products management" className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827] focus:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Products</span>
      </nav>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiPackage}
          iconColor="#3B82F6"
          title="Total Products"
          value={formatCount(totalProducts)}
        />
        <StatCard
          icon={PiCurrencyCircleDollar}
          iconColor="#10B981"
          title="Inventory Value"
          value={formatCurrency(inventoryValue)}
          description="price of products * stock_qty"
        />
        <StatCard
          icon={PiWarningCircle}
          iconColor="#F59E0B"
          title="Low Stock"
          value={formatCount(lowStockCount)}
        />
        <StatCard
          icon={PiXCircle}
          iconColor="#EF4444"
          title="Out of Stock"
          value={formatCount(outOfStockCount)}
        />
      </div>

      {/* Product Catalog Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-visible">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-inter">
              Product Catalog
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Manage your product listings and inventory
            </p>
          </div>
          <button
            onClick={() => setAddDialogOpen(true)}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            <PiPlus className="w-4 h-4" />
            Add New Products
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="approved">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
              <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <PiPackage className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] text-sm">
                        {searchQuery ||
                        categoryFilter !== "all" ||
                        statusFilter !== "all"
                          ? "No products match your filters"
                          : "No products yet. Add your first product!"}
                      </p>
                      {!searchQuery &&
                        categoryFilter === "all" &&
                        statusFilter === "all" && (
                          <button
                            onClick={() => setAddDialogOpen(true)}
                            className="cursor-pointer mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
                          >
                            <PiPlus className="w-4 h-4" />
                            Add Product
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock_qty);
                  const statusBadge = getStatusBadge(
                    product.stock_qty === 0 ? "out_of_stock" : product.status,
                  );
                  const margin = calculateMargin(product.price, null);

                  return (
                    <tr key={product.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center overflow-hidden">
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <PiImage className="w-5 h-5 text-[#9CA3AF]" />
                            )}
                          </div>
                          <span className="text-[#111827] text-sm font-medium">
                            {product.name || "Unnamed Product"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-sm">
                        {product.product_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-sm">
                        {product.categories?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#111827] text-sm font-medium">
                        {formatCurrency(product.price)}
                      </td>
                      <td
                        className={`px-4 py-3 text-center text-sm font-medium ${stockStatus.color}`}
                      >
                        {stockStatus.label}
                      </td>
                      <td className="px-4 py-3 text-center text-[#111827] text-sm">
                        {formatCount(product.salesUnits)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#10B981] text-sm font-medium">
                        {margin ? `↑ ${margin}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ProductActionsMenu
                          product={product}
                          onEdit={(p) => {
                            setSelectedProduct(p);
                            setEditDialogOpen(true);
                          }}
                          onDelete={(p) => console.log("Delete", p)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSuccess={refreshData}
        variant="vendor_products"
      />

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            editSubmitAttemptedRef.current = false;
            setEditSubmitAttempted(false);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#111827] text-lg font-semibold">
              Edit Product
            </DialogTitle>
            <DialogDescription className="text-[#6B7280] text-sm">
              Update your product details
            </DialogDescription>
          </DialogHeader>

          <form
            ref={editFormRef}
            onSubmit={handleEditSubmit}
            className="mt-4 space-y-4"
          >
            <input type="hidden" name="action" value="update" />
            <input type="hidden" name="product_id" value={selectedProduct?.id || ""} />
            <input type="hidden" name="variations" value={editVariationsPayload} />
            <input
              type="hidden"
              name="category_id"
              value={editSelectedCategoryId || ""}
            />
            <input
              type="hidden"
              name="featuredImageIndex"
              value={editFeaturedIndex || ""}
            />
            <input
              type="hidden"
              name="existing_images"
              value={editImagePreviews.length ? "" : JSON.stringify(editExistingImages)}
            />

            {editSubmitAttempted && editState?.message && !editState?.success && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {editState.message}
              </div>
            )}

            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                {editStepLabels.map((label, index) => {
                  const isActive = editCurrentStep === index;
                  const isComplete = editCurrentStep > index;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                          isComplete
                            ? "border-primary bg-primary text-white"
                            : isActive
                            ? "border-primary text-primary"
                            : "border-[#D1D5DB] text-[#9CA3AF]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={
                          isActive || isComplete
                            ? "font-semibold text-[#374151]"
                            : "text-[#9CA3AF]"
                        }
                      >
                        {label}
                      </span>
                      {index < editStepLabels.length - 1 && (
                        <span className="h-px w-6 bg-[#E5E7EB]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={editCurrentStep === 0 ? "" : "hidden"}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#374151] text-sm font-medium">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={selectedProduct?.name || ""}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {hasEditError("name") ? (
                      <span className="text-red-500 text-xs">
                        {toErrorList(editErrorFor("name"))[0]}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#374151] text-sm font-medium">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      defaultValue={selectedProduct?.status || "pending"}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {hasEditError("status") ? (
                      <span className="text-red-500 text-xs">
                        {toErrorList(editErrorFor("status"))[0]}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#374151] text-sm font-medium">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editParentCategoryId}
                      onChange={(e) => {
                        setEditParentCategoryId(e.target.value);
                        setEditSubcategoryId("");
                      }}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">Select category</option>
                      {(categoriesByParentId.get(null) || []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {hasEditError("category_id") ? (
                      <span className="text-red-500 text-xs">
                        {toErrorList(editErrorFor("category_id"))[0]}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#374151] text-sm font-medium">
                      Subcategory
                    </label>
                    <select
                      value={editSubcategoryId}
                      onChange={(e) => setEditSubcategoryId(e.target.value)}
                      disabled={!editParentCategoryId || !editSubcategoryOptions.length}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">None</option>
                      {editSubcategoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {getCategoryDisplayName(cat)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#374151] text-sm font-medium">
                      Selling Price(GHS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      step="0.01"
                      min="0"
                      defaultValue={selectedProduct?.price ?? ""}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {hasEditError("price") ? (
                      <span className="text-red-500 text-xs">
                        {toErrorList(editErrorFor("price"))[0]}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#374151] text-sm font-medium">
                      Initial Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="stock_qty"
                      min="0"
                      defaultValue={selectedProduct?.stock_qty ?? "0"}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {hasEditError("stock_qty") ? (
                      <span className="text-red-500 text-xs">
                        {toErrorList(editErrorFor("stock_qty"))[0]}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={selectedProduct?.description || ""}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </div>

            <div className={editCurrentStep === 1 ? "flex flex-col gap-1.5" : "hidden"}>
                <label className="text-[#374151] text-sm font-medium">
                  Variations (optional)
                </label>
                <div className="rounded-lg border border-[#E5E7EB] p-3 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#6B7280]">
                      Add color/size options or SKU-only variants. Price overrides the base
                      price.
                    </p>
                    <button
                      type="button"
                      onClick={addEditVariationDraft}
                      className="cursor-pointer inline-flex items-center justify-center rounded-full border border-[#D1D5DB] px-3 py-1 text-xs font-medium text-[#374151] hover:border-primary hover:text-primary"
                    >
                      + Add variation
                    </button>
                  </div>

                  {editVariationDrafts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-4 text-center text-xs text-[#6B7280]">
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
                              <span className="text-xs font-medium text-[#6B7280]">
                                Variation {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeEditVariationDraft(draft.id)}
                                className="cursor-pointer text-xs text-red-500 hover:text-red-600"
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
                                    updateEditVariationDraft(draft.id, "label", e.target.value)
                                  }
                                  placeholder="e.g., Red / Small"
                                  className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                                    updateEditVariationDraft(draft.id, "sku", e.target.value)
                                  }
                                  placeholder="SKU-RED-S"
                                  className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                                    updateEditVariationDraft(draft.id, "price", e.target.value)
                                  }
                                  placeholder="0.00"
                                  className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                                          isSelected ? "" : color,
                                        )
                                      }
                                      className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-[#E5E7EB] text-[#6B7280] hover:border-primary/50"
                                      }`}
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
                                  updateEditVariationDraft(draft.id, "color", e.target.value)
                                }
                                placeholder="Custom color"
                                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                                          isSelected ? "" : size,
                                        )
                                      }
                                      className={`cursor-pointer inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-[#E5E7EB] text-[#6B7280] hover:border-primary/50"
                                      }`}
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
                                  updateEditVariationDraft(draft.id, "size", e.target.value)
                                }
                                placeholder="Custom size"
                                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {editSubmitAttempted && editState?.errors?.variations ? (
                  <span className="text-red-500 text-xs">
                    {toErrorList(editState.errors.variations)[0]}
                  </span>
                ) : null}
              </div>

            <div className={editCurrentStep === 2 ? "" : "hidden"}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Product Images
                  </label>

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

                  <div className="relative border-2 border-dashed border-[#D1D5DB] rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    {editImagePreviews.length ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {editImagePreviews.map((item, idx) => (
                            <div key={idx} className="relative">
                              <img
                                src={item.preview}
                                alt={`Preview ${idx + 1}`}
                                className="h-20 w-full rounded-lg object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeEditImageAt(idx)}
                                className="cursor-pointer absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <PiX className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={removeAllEditImages}
                            className="cursor-pointer text-xs text-red-600 hover:underline"
                          >
                            Remove all images
                          </button>
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="cursor-pointer text-xs text-primary hover:underline"
                            disabled={editPending}
                          >
                            Replace images
                          </button>
                        </div>
                      </div>
                    ) : editExistingImages.length ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {editExistingImages.map((url, idx) => (
                            <div key={idx} className="relative">
                              <img
                                src={url}
                                alt={`Image ${idx + 1}`}
                                className="h-20 w-full rounded-lg object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeExistingImageAt(idx)}
                                className="cursor-pointer absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <PiX className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={removeAllEditImages}
                            className="cursor-pointer text-xs text-red-600 hover:underline"
                          >
                            Remove all images
                          </button>
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="cursor-pointer text-xs text-primary hover:underline"
                            disabled={editPending}
                          >
                            Replace images
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <PiUploadSimple className="w-8 h-8 mx-auto text-[#9CA3AF] mb-2" />
                        <p className="text-[#6B7280] text-sm">
                          Drag & drop an image here, or{" "}
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="text-primary cursor-pointer hover:underline"
                            disabled={editPending}
                          >
                            Browse
                          </button>
                        </p>
                      </div>
                    )}
                  </div>

                  {editSubmitAttempted && hasEditError("images") ? (
                    <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
                      {toErrorList(editErrorFor("images")).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6B7280]">
                      Upload up to 3 images per product. Each image must be 1MB or smaller.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Featured Image
                  </label>
                  {editFeaturedCount <= 0 ? (
                    <p className="text-xs text-[#6B7280]">
                      Select images above first. If you do not choose a featured image, the
                      first uploaded image will be used.
                    </p>
                  ) : (
                    <select
                      value={editFeaturedIndex}
                      onChange={(e) => setEditFeaturedIndex(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
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

            <DialogFooter className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <div className="flex w-full items-center justify-between gap-3">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB]"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCurrentStep((prev) => Math.max(prev - 1, 0))}
                    disabled={editCurrentStep === 0}
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  {editCurrentStep < editStepLabels.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditCurrentStep((prev) =>
                          Math.min(prev + 1, editStepLabels.length - 1),
                        )
                      }
                      className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEditSave}
                      disabled={editPending}
                      className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editPending ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
