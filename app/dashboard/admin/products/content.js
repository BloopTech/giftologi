"use client";
import { Search, LoaderCircle } from "lucide-react";
import React, {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PiShoppingBagOpen,
  PiCheckCircle,
  PiXCircle,
  PiFlag,
  PiArticle,
} from "react-icons/pi";
import { useManageProductsContext } from "./context";
import ProductsTable from "./ProductsTable";
import CategoriesSection from "./CategoriesSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { createVendorProducts } from "./action";
import CreateAllVendorProducts from "./createVendorProducts";

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
        stock_qty:
          entry.stock_qty === null || typeof entry.stock_qty === "undefined"
            ? ""
            : String(entry.stock_qty),
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
        draft.price === "" ||
        draft.price === null ||
        typeof draft.price === "undefined"
          ? null
          : Number(draft.price);
      const price = Number.isFinite(priceValue) ? priceValue : null;

      if (!fallbackLabel && !color && !size && !sku && price == null)
        return null;

      const entry = {};
      if (fallbackLabel) entry.label = fallbackLabel;
      if (color) entry.color = color;
      if (size) entry.size = size;
      if (sku) entry.sku = sku;
      if (price != null) entry.price = price;
      const stockRaw = draft.stock_qty;
      const stockValue =
        stockRaw === "" || stockRaw === null || typeof stockRaw === "undefined"
          ? null
          : Number(stockRaw);
      const stock = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : null;
      if (stock != null) entry.stock_qty = stock;
      return entry;
    })
    .filter(Boolean);

  if (!normalized.length) return "";
  return JSON.stringify(normalized);
};

const initialCreateState = {
  message: "",
  errors: {
    vendorId: [],
    mode: [],
    name: [],
    description: [],
    price: [],
    weightKg: [],
    serviceCharge: [],
    stockQty: [],
    productCode: [],
    categoryIds: [],
    variations: [],
    images: [],
    featuredImageIndex: [],
    bulkFile: [],
    bulkMapping: [],
    bulkCategoryIds: [],
  },
  values: {},
  data: {},
};

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export default function ManageProductsContent() {
  const {
    metrics,
    loadingMetrics,
    searchTerm,
    setSearchTerm,
    setProductsPage,
    refreshProducts,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
  } = useManageProductsContext() || {};

  const [search, setSearch] = useState(searchTerm || "");
  const [createState, createAction, createPending] = useActionState(
    createVendorProducts,
    initialCreateState,
  );

  const [vendorSearch, setVendorSearch] = useState("");
  const [debouncedVendorSearch] = useDebounce(vendorSearch, 300);
  const [vendorResults, setVendorResults] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [createMode, setCreateMode] = useState("single");

  const [bulkColumns, setBulkColumns] = useState([]);
  const [bulkMapping, setBulkMapping] = useState({
    name: "",
    price: "",
    weightKg: "",
    serviceCharge: "",
    description: "",
    stockQty: "",
    imageUrl: "",
  });
  const [bulkHeaderError, setBulkHeaderError] = useState("");
  const [bulkFileLabel, setBulkFileLabel] = useState("");

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [bulkCategoryIds, setBulkCategoryIds] = useState([]);

  const [featuredIndex, setFeaturedIndex] = useState("");
  const [variationDrafts, setVariationDrafts] = useState([]);
  const [activeVariationFieldById, setActiveVariationFieldById] = useState({});

  const variationsPayload = useMemo(
    () => buildVariationPayload(variationDrafts),
    [variationDrafts],
  );

  const addVariationDraft = useCallback(() => {
    setVariationDrafts((prev) => [
      ...prev,
      {
        id: createVariationId(),
        label: "",
        color: "",
        size: "",
        sku: "",
        price: "",
        stock_qty: "",
      },
    ]);
  }, []);

  const updateVariationDraft = useCallback((id, field, value) => {
    setVariationDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  }, []);

  const removeVariationDraft = useCallback((id) => {
    setVariationDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }, []);

  const isLoadingMetrics = !!loadingMetrics;

  const formatCount = (value) => {
    if (value === null || typeof value === "undefined") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString();
  };

  const renderMetricCount = (value) => {
    if (isLoadingMetrics) {
      return <div className="h-4 w-10 rounded bg-[#E5E7EB] animate-pulse" />;
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
        {formatCount(value)}
      </p>
    );
  };

  const handleSearch = () => {
    if (!setSearchTerm || !setProductsPage) return;
    setSearchTerm(search);
    setProductsPage(0);
  };

  const hasCreateErrors = useMemo(() => {
    const errors = createState?.errors || {};
    return Object.values(errors).some(
      (arr) => Array.isArray(arr) && arr.length,
    );
  }, [createState?.errors]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError("");

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_category_id")
        .order("name", { ascending: true });

      if (error) {
        setCategoriesError(error.message || "Failed to load categories.");
        setCategories([]);
        return;
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      setCategoriesError(
        error?.message || "Failed to load categories. Please try again.",
      );
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

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
        String(a.name || "").localeCompare(String(b.name || "")),
      );
      map.set(key, list);
    }

    return map;
  }, [categories]);

  const parentCategoryOptions = useMemo(() => {
    return categoriesByParentId.get(null) || [];
  }, [categoriesByParentId]);

  const selectedCategoryIdSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds],
  );

  const bulkCategoryIdSet = useMemo(
    () => new Set(bulkCategoryIds),
    [bulkCategoryIds],
  );

  const getCategoryDisplayName = useCallback(
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

  const normalizeCategoryIds = useCallback((value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((id) => String(id).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((id) => String(id).trim()).filter(Boolean);
        }
      } catch (_) {
        return trimmed
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }
    }
    return [];
  }, []);

  const toggleSelectedCategory = useCallback((categoryId) => {
    if (!categoryId) return;
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  const toggleBulkCategory = useCallback((categoryId) => {
    if (!categoryId) return;
    setBulkCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  useEffect(() => {
    if (createMode !== "single") return;

    const value = normalizeCategoryIds(createState?.values?.categoryIds);
    if (!value.length) return;
    if (selectedCategoryIds.length) return;

    setSelectedCategoryIds(value);
  }, [
    createMode,
    createState?.values?.categoryIds,
    normalizeCategoryIds,
    selectedCategoryIds.length,
  ]);

  useEffect(() => {
    if (createMode !== "bulk") return;

    const value = normalizeCategoryIds(createState?.values?.bulkCategoryIds);
    if (!value.length) return;
    if (bulkCategoryIds.length) return;

    setBulkCategoryIds(value);
  }, [
    createMode,
    createState?.values?.bulkCategoryIds,
    normalizeCategoryIds,
    bulkCategoryIds.length,
  ]);

  useEffect(() => {
    if (createMode !== "single") {
      setVariationDrafts([]);
      return;
    }
    if (createState?.values?.variations) {
      setVariationDrafts(parseVariationDrafts(createState.values.variations));
      return;
    }
    if (!createState?.message) {
      setVariationDrafts([]);
    }
  }, [createMode, createState?.message, createState?.values?.variations]);

  useEffect(() => {
    if (createState.data && Object.keys(createState.data || {}).length > 0) {
      toast.success(createState.message);
      refreshProducts?.();
      setVariationDrafts([]);
    }
    if (
      createState.message &&
      createState.errors &&
      Object.keys(createState.errors || {}).length > 0
    ) {
      toast.error(createState.message);
    }
  }, [createState, refreshProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const term = (debouncedVendorSearch || "").trim();
    if (!term) {
      setVendorResults([]);
      setVendorError("");
      setVendorLoading(false);
      return;
    }

    let ignore = false;

    const searchVendors = async () => {
      setVendorLoading(true);
      setVendorError("");

      try {
        const supabase = createSupabaseClient();

        let query = supabase
          .from("vendors")
          .select(
            `
            id,
            business_name,
            category,
            profiles:profiles!Vendors_profiles_id_fkey (
              id,
              firstname,
              lastname,
              email
            )
          `,
          )
          .limit(20);

        const tokens = term
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => `${t}:*`)
          .join(" & ");

        if (tokens) {
          query = query.filter("search_vector", "fts", tokens);
        }

        const { data, error } = await query;

        if (ignore) return;

        if (error) {
          setVendorError(error.message || "Failed to search vendors.");
          setVendorResults([]);
          return;
        }

        setVendorResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!ignore) {
          setVendorError(
            error?.message || "Failed to search vendors. Please try again.",
          );
          setVendorResults([]);
        }
      } finally {
        if (!ignore) {
          setVendorLoading(false);
        }
      }
    };

    searchVendors();

    return () => {
      ignore = true;
    };
  }, [debouncedVendorSearch]);

  const handleSelectVendor = (vendor) => {
    const profile = vendor.profiles || {};
    const parts = [];
    if (profile.firstname) parts.push(profile.firstname);
    if (profile.lastname) parts.push(profile.lastname);
    const contactName = parts.join(" ") || profile.email || "—";

    setSelectedVendor({
      id: vendor.id,
      businessName: vendor.business_name || "Untitled Vendor",
      category: vendor.category || "",
      contactName,
      contactEmail: profile.email || "",
    });
  };

  const handleBulkFileChange = (event) => {
    const file = event?.target?.files?.[0];
    setBulkHeaderError("");
    setBulkColumns([]);
    setBulkFileLabel(file?.name || "");

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter((line) => line.length > 0);

        if (!lines.length) {
          setBulkHeaderError("The CSV file is empty.");
          return;
        }

        const header = parseCsvLine(lines[0]).map((h) => h.trim());
        if (!header.length) {
          setBulkHeaderError("Could not read header row from CSV.");
          return;
        }

        setBulkColumns(header);

        const lowerHeader = header.map((h) => h.toLowerCase());

        const autoMap = (predicate) => {
          const index = lowerHeader.findIndex(predicate);
          return index >= 0 ? header[index] : "";
        };

        setBulkMapping((prev) => ({
          name:
            prev.name ||
            autoMap((h) => h.includes("name") || h.includes("product")),
          price:
            prev.price || autoMap((h) => h.includes("price") || h === "amount"),
          weightKg:
            prev.weightKg ||
            autoMap(
              (h) => h.includes("weight") || h.includes("kg") || h.includes("mass")
            ),
          serviceCharge:
            prev.serviceCharge ||
            autoMap(
              (h) => h.includes("service") || h.includes("charge") || h.includes("fee")
            ),
          description:
            prev.description ||
            autoMap((h) => h.includes("description") || h.includes("details")),
          stockQty:
            prev.stockQty ||
            autoMap(
              (h) =>
                h.includes("stock") || h.includes("quantity") || h === "qty",
            ),
          imageUrl:
            prev.imageUrl ||
            autoMap((h) => h.includes("image") || h.includes("photo")),
        }));
      } catch (error) {
        setBulkHeaderError(
          error?.message || "Failed to read CSV header. Please try again.",
        );
        setBulkColumns([]);
      }
    };

    reader.onerror = () => {
      setBulkHeaderError("Failed to read CSV file.");
      setBulkColumns([]);
    };

    reader.readAsText(file);
  };

  return (
    <section
      aria-label="Product management"
      className="flex flex-col space-y-4 w-full mb-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Manage Products
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Approve, reject, or flag products submitted by vendors.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">
            Total Products
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.total)}
            <PiShoppingBagOpen className="size-4 text-[#427ED3]" />
          </div>
          <div className="border-t-2 border-[#7DADF2]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">
            Pending Approval
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.pending)}
            <PiArticle className="size-4 text-[#DDA938]" />
          </div>
          <div className="border-t-2 border-[#FFCA57]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">
            Approved Products
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.approved)}
            <PiCheckCircle className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-2 border-[#CBED8E]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">Flagged</h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.flagged)}
            <PiFlag className="size-4 text-[#C52721]" />
          </div>
          <div className="border-t-2 border-[#FF908B]" />
        </div>
      </div>

      <CreateAllVendorProducts
        selectedVendor={selectedVendor}
        vendorSearch={vendorSearch}
        setVendorSearch={setVendorSearch}
        vendorLoading={vendorLoading}
        vendorError={vendorError}
        vendorResults={vendorResults}
        handleSelectVendor={handleSelectVendor}
        setCreateMode={setCreateMode}
        createMode={createMode}
        createAction={createAction}
        selectedCategoryIds={selectedCategoryIds}
        featuredIndex={featuredIndex}
        bulkCategoryIds={bulkCategoryIds}
        setSelectedCategoryIds={setSelectedCategoryIds}
        createPending={createPending}
        categories={categories}
        categoriesById={categoriesById}
        getCategoryDisplayName={getCategoryDisplayName}
        parentCategoryOptions={parentCategoryOptions}
        categoriesByParentId={categoriesByParentId}
        selectedCategoryIdSet={selectedCategoryIdSet}
        toggleSelectedCategory={toggleSelectedCategory}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        createState={createState}
        variationsPayload={variationsPayload}
        addVariationDraft={addVariationDraft}
        variationDrafts={variationDrafts}
        activeVariationFieldById={activeVariationFieldById}
        removeVariationDraft={removeVariationDraft}
        setActiveVariationFieldById={setActiveVariationFieldById}
        updateVariationDraft={updateVariationDraft}
        setFeaturedIndex={setFeaturedIndex}
        setBulkCategoryIds={setBulkCategoryIds}
        bulkCategoryIdSet={bulkCategoryIdSet}
        toggleBulkCategory={toggleBulkCategory}
        handleBulkFileChange={handleBulkFileChange}
        bulkFileLabel={bulkFileLabel}
        bulkHeaderError={bulkHeaderError}
        bulkMapping={bulkMapping}
        bulkColumns={bulkColumns}
        setBulkMapping={setBulkMapping}
        setSelectedVendor={setSelectedVendor}
        setVendorResults={setVendorResults}
      />

      <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={"Search by product name or description"}
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={typeFilter || "all"}
            onValueChange={(value) => {
              setTypeFilter?.(value);
              setProductsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setProductsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="w-full md:w-auto px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium border border-primary cursor-pointer hover:bg-white hover:text-primary"
        >
          Search
        </button>
      </div>

      <div className="flex items-center justify-start mt-2">
        <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1">
          {["pending", "approved", "flagged", "rejected", "featured"].map((key) => {
            const labelMap = {
              pending: "Pending Approval",
              approved: "Approved",
              flagged: "Flagged",
              rejected: "Rejected",
              featured: "Featured",
            };
            const countMap = {
              pending: metrics?.pending,
              approved: metrics?.approved,
              flagged: metrics?.flagged,
              rejected: metrics?.rejected,
              featured: metrics?.featured,
            };
            const isActive = statusFilter === key;
            const label = labelMap[key] || key;
            const count = countMap[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter?.(key);
                  setProductsPage?.(0);
                }}
                className={
                  "px-4 py-2 text-xs font-medium rounded-full cursor-pointer transition-colors flex items-center gap-2 " +
                  (isActive
                    ? "bg-white text-[#0A0A0A] shadow-sm"
                    : "text-[#717182]")
                }
              >
                <span>{label}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] bg-[#E5E7EB] text-[#4B5563]">
                  {formatCount(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* <VendorRequestsTable /> */}
      <ProductsTable
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
      />

      <CategoriesSection
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        onCategoriesRefresh={loadCategories}
      />
    </section>
  );
}
