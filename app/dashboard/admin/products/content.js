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

const initialCreateState = {
  message: "",
  errors: {
    vendorId: [],
    mode: [],
    name: [],
    description: [],
    price: [],
    stockQty: [],
    productCode: [],
    categoryId: [],
    variations: [],
    images: [],
    featuredImageIndex: [],
    bulkFile: [],
    bulkMapping: [],
    bulkCategoryId: [],
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
    description: "",
    stockQty: "",
    imageUrl: "",
  });
  const [bulkHeaderError, setBulkHeaderError] = useState("");
  const [bulkFileLabel, setBulkFileLabel] = useState("");

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const [bulkParentCategoryId, setBulkParentCategoryId] = useState("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState("");

  const [imageCount, setImageCount] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState("");
  const [variationDrafts, setVariationDrafts] = useState([]);

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
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
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

  const subcategoryOptions = useMemo(() => {
    if (!selectedParentCategoryId) return [];
    return categoriesByParentId.get(selectedParentCategoryId) || [];
  }, [categoriesByParentId, selectedParentCategoryId]);

  const bulkSubcategoryOptions = useMemo(() => {
    if (!bulkParentCategoryId) return [];
    return categoriesByParentId.get(bulkParentCategoryId) || [];
  }, [categoriesByParentId, bulkParentCategoryId]);

  const selectedCategoryId = selectedSubcategoryId || selectedParentCategoryId;
  const bulkCategoryId = bulkSubcategoryId || bulkParentCategoryId;

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

  useEffect(() => {
    if (createMode !== "single") return;

    const value = createState?.values?.categoryId;
    if (!value) return;
    if (selectedParentCategoryId || selectedSubcategoryId) return;

    const category = categoriesById.get(value);
    if (category?.parent_category_id) {
      setSelectedParentCategoryId(category.parent_category_id);
      setSelectedSubcategoryId(category.id);
      return;
    }

    setSelectedParentCategoryId(value);
  }, [
    createMode,
    createState?.values?.categoryId,
    categoriesById,
    selectedParentCategoryId,
    selectedSubcategoryId,
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

  const handleImagesChange = (event) => {
    const files = event?.target?.files;
    const count = files ? files.length : 0;
    setImageCount(count);

    if (featuredIndex) {
      const idx = Number(featuredIndex);
      if (!Number.isInteger(idx) || idx >= count) {
        setFeaturedIndex("");
      }
    }
  };

  return (
    <section
      aria-label="Product management"
      className="flex flex-col space-y-4 w-full mb-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Manage Products
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Approve, reject, or flag products submitted by vendors.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Products
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.total)}
            <PiShoppingBagOpen className="size-4 text-[#427ED3]" />
          </div>
          <div className="border-t-[2px] border-[#7DADF2]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Pending Approval
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.pending)}
            <PiArticle className="size-4 text-[#DDA938]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Approved Products
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.approved)}
            <PiCheckCircle className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#CBED8E]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Flagged</h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.flagged)}
            <PiFlag className="size-4 text-[#C52721]" />
          </div>
          <div className="border-t-[2px] border-[#FF908B]" />
        </div>
      </div>

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
          {["pending", "approved", "flagged", "rejected"].map((key) => {
            const labelMap = {
              pending: "Pending Approval",
              approved: "Approved",
              flagged: "Flagged",
              rejected: "Rejected",
            };
            const countMap = {
              pending: metrics?.pending,
              approved: metrics?.approved,
              flagged: metrics?.flagged,
              rejected: metrics?.rejected,
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

      <div className="mt-4 grid grid-cols-1 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col gap-2">
          <h2 className="text-[#0A0A0A] text-xs font-medium font-inter">
            Create Products for Vendor
          </h2>
          <p className="text-[#717182] text-[11px] font-poppins">
            Search for a vendor, then create a single product or upload multiple
            products from a CSV file (up to 200 rows per upload).
          </p>
        </div>

        <section className="space-y-3">
          {!selectedVendor && (
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-[#717182]">
                Step 1 - Choose Vendor
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#9CA3AF]">
                    <Search className="size-3.5" />
                  </span>
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(event) => setVendorSearch(event.target.value)}
                    placeholder="Search vendors by business name or email"
                    className="w-full rounded-full border px-8 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-white max-h-64 overflow-y-auto text-xs">
                {vendorLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-6 text-[11px] text-[#717182]">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>Loading vendors</span>
                  </div>
                ) : vendorError ? (
                  <div className="px-4 py-6 text-[11px] text-red-600">
                    {vendorError}
                  </div>
                ) : !vendorResults.length ? (
                  <div className="px-4 py-6 text-[11px] text-[#717182]">
                    Start typing to search for vendors by business name or
                    email.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {vendorResults.map((vendor) => {
                      const profile = vendor.profiles || {};
                      const parts = [];
                      if (profile.firstname) parts.push(profile.firstname);
                      if (profile.lastname) parts.push(profile.lastname);
                      const contactName =
                        parts.join(" ") || profile.email || "-";
                      const email = profile.email || "-";

                      return (
                        <li
                          key={vendor.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0A0A0A]">
                              {vendor.business_name || "Untitled Vendor"}
                            </span>
                            <span className="text-[11px] text-[#6A7282]">
                              {contactName} - {email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectVendor(vendor)}
                            className="rounded-full px-3 py-1 text-[11px] font-medium border border-primary bg-primary text-white hover:bg-white hover:text-primary cursor-pointer"
                          >
                            Select
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 flex flex-col gap-1 text-[11px]">
                  <span className="text-[#6B7280]">Selected Vendor</span>
                  <span className="text-xs font-medium text-[#111827]">
                    {selectedVendor.businessName}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    {selectedVendor.contactName} - {selectedVendor.contactEmail}
                  </span>
                </div>
                <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px]">
                  {[
                    { id: "single", label: "Single Product" },
                    { id: "bulk", label: "Bulk from CSV" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCreateMode(tab.id)}
                      className={
                        "px-3 py-1.5 rounded-full cursor-pointer transition-colors " +
                        (createMode === tab.id
                          ? "bg-white text-[#0A0A0A] shadow-sm"
                          : "text-[#6A7282] hover:text-[#0A0A0A]")
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <form
                action={createAction}
                className="space-y-4 text-xs text-[#0A0A0A]"
              >
                <input
                  type="hidden"
                  name="vendorId"
                  value={selectedVendor.id}
                />
                <input type="hidden" name="mode" value={createMode} />
                <input
                  type="hidden"
                  name="categoryId"
                  value={selectedCategoryId || ""}
                />
                <input
                  type="hidden"
                  name="featuredImageIndex"
                  value={featuredIndex || ""}
                />
                <input
                  type="hidden"
                  name="bulkCategoryId"
                  value={bulkCategoryId || ""}
                />

                {createMode === "single" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium text-[#0A0A0A]">
                          Category <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <Select
                        value={selectedParentCategoryId || ""}
                        onValueChange={(value) => {
                          setSelectedParentCategoryId(value || "");
                          setSelectedSubcategoryId("");
                        }}
                        disabled={categoriesLoading || createPending}
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
                      {(createState?.errors?.categoryId || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.categoryId.map((err, index) => (
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
                        value={selectedSubcategoryId || ""}
                        onValueChange={(value) =>
                          setSelectedSubcategoryId(value || "")
                        }
                        disabled={
                          categoriesLoading ||
                          createPending ||
                          !selectedParentCategoryId ||
                          !subcategoryOptions.length
                        }
                      >
                        <SelectTrigger className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategoryOptions.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {getCategoryDisplayName(cat)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-name"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="product-name"
                        name="name"
                        type="text"
                        maxLength={100}
                        defaultValue={createState?.values?.name || ""}
                        placeholder="e.g. Premium Gift Basket"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.name || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.name.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-price"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Price (GHS) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="product-price"
                        name="price"
                        type="text"
                        inputMode="decimal"
                        defaultValue={createState?.values?.price || ""}
                        placeholder="e.g. 250.00"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.price || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.price.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-stock"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Stock Quantity
                      </label>
                      <input
                        id="product-stock"
                        name="stockQty"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        defaultValue={createState?.values?.stockQty || ""}
                        placeholder="e.g. 50"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.stockQty || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.stockQty.map((err, index) => (
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
                      <label
                        htmlFor="product-description"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Description
                      </label>
                      <textarea
                        id="product-description"
                        name="description"
                        rows={3}
                        defaultValue={createState?.values?.description || ""}
                        placeholder="Short description of the product shown to guests."
                        className="w-full rounded-lg border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.description || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.description.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label
                        htmlFor="product-variations"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Variations (optional)
                      </label>
                      <input type="hidden" name="variations" value={variationsPayload} />
                      <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-[#717182]">
                            Add color/size options or SKU-only variants. Price overrides
                            the base price.
                          </p>
                          <button
                            type="button"
                            onClick={addVariationDraft}
                            className="cursor-pointer inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:border-primary hover:text-primary"
                            disabled={createPending}
                          >
                            + Add variation
                          </button>
                        </div>

                        {variationDrafts.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[#D6D6D6] bg-[#F9FAFB] p-4 text-center text-[11px] text-[#6B7280]">
                            No variations yet. Add one to offer color, size, or SKU options.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {variationDrafts.map((draft, index) => {
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
                                      onClick={() => removeVariationDraft(draft.id)}
                                      className="cursor-pointer text-[11px] text-red-500 hover:text-red-600"
                                      disabled={createPending}
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
                                          updateVariationDraft(
                                            draft.id,
                                            "label",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="e.g., Red / Small"
                                        className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={createPending}
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
                                          updateVariationDraft(
                                            draft.id,
                                            "sku",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="SKU-RED-S"
                                        className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={createPending}
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
                                          updateVariationDraft(
                                            draft.id,
                                            "price",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="0.00"
                                        className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={createPending}
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
                                              updateVariationDraft(
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
                                            disabled={createPending}
                                          >
                                            <span
                                              className="h-3 w-3 rounded-full border"
                                              style={{
                                                background:
                                                  COLOR_SWATCHES[color] || "#E5E7EB",
                                                borderColor:
                                                  color === "White"
                                                    ? "#E5E7EB"
                                                    : "transparent",
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
                                        updateVariationDraft(
                                          draft.id,
                                          "color",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Custom color"
                                      className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                      disabled={createPending}
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
                                              updateVariationDraft(
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
                                            disabled={createPending}
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
                                        updateVariationDraft(
                                          draft.id,
                                          "size",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Custom size"
                                      className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                      disabled={createPending}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {(createState?.errors?.variations || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.variations.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Variations can include label, color, size, sku, and price.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label
                        htmlFor="product-images"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Product Images
                      </label>
                      <input
                        id="product-images"
                        name="product_images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagesChange}
                        className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-[#F3F4F6]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.images || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.images.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Upload up to 3 images per product. Each image must be
                          1MB or smaller. Images are uploaded to Cloudflare and
                          stored as URLs on the product.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-[#0A0A0A]">
                        Featured Image
                      </label>
                      <div className="flex flex-col gap-1 text-[11px] text-[#6B7280]">
                        {imageCount <= 0 ? (
                          <p>
                            Select images above first. If you do not choose a
                            featured image, the first uploaded image will be
                            used.
                          </p>
                        ) : (
                          <select
                            value={featuredIndex}
                            onChange={(e) => setFeaturedIndex(e.target.value)}
                            className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                            disabled={createPending}
                          >
                            <option value="">
                              Use first image as featured
                            </option>
                            {Array.from({
                              length: Math.min(imageCount, 3),
                            }).map((_, idx) => (
                              <option key={idx} value={String(idx)}>
                                {`Image ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        )}
                        {(createState?.errors?.featuredImageIndex || [])
                          .length ? (
                          <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                            {createState.errors.featuredImageIndex.map(
                              (err, index) => (
                                <li key={index}>{err}</li>
                              ),
                            )}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {createMode === "bulk" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#0A0A0A]">
                        Default Category (optional)
                      </label>
                      <Select
                        value={bulkParentCategoryId || ""}
                        onValueChange={(value) => {
                          setBulkParentCategoryId(value || "");
                          setBulkSubcategoryId("");
                        }}
                        disabled={categoriesLoading || createPending}
                      >
                        <SelectTrigger className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]">
                          <SelectValue placeholder="Use category from each product's own settings" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentCategoryOptions.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name || "Untitled"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2">
                        <Select
                          value={bulkSubcategoryId || ""}
                          onValueChange={(value) =>
                            setBulkSubcategoryId(value || "")
                          }
                          disabled={
                            categoriesLoading ||
                            createPending ||
                            !bulkParentCategoryId ||
                            !bulkSubcategoryOptions.length
                          }
                        >
                          <SelectTrigger className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]">
                            <SelectValue placeholder="Subcategory (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {bulkSubcategoryOptions.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {getCategoryDisplayName(cat)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {categoriesError ? (
                        <p className="mt-1 text-[11px] text-red-600">
                          {categoriesError}
                        </p>
                      ) : null}
                      {(createState?.errors?.bulkCategoryId || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.bulkCategoryId.map(
                            (err, index) => (
                              <li key={index}>{err}</li>
                            ),
                          )}
                        </ul>
                      ) : null}
                      <p className="text-[11px] text-[#717182]">
                        When set, all products created from this CSV will use
                        this category.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="bulk-file"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        CSV File <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="bulk-file"
                        name="bulk_file"
                        type="file"
                        accept=".csv"
                        onChange={handleBulkFileChange}
                        className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-[#F3F4F6]"
                        disabled={createPending}
                      />
                      {bulkFileLabel ? (
                        <p className="text-[11px] text-[#6A7282]">
                          Selected: {bulkFileLabel}
                        </p>
                      ) : null}
                      {bulkHeaderError ? (
                        <p className="text-[11px] text-red-600 mt-1">
                          {bulkHeaderError}
                        </p>
                      ) : null}
                      {(createState?.errors?.bulkFile || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.bulkFile.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Export from Excel or Google Sheets as a CSV with a
                          header row. Maximum of 200 products per upload.
                        </p>
                      )}
                    </div>

                    <input
                      type="hidden"
                      name="bulk_mapping"
                      value={JSON.stringify(bulkMapping)}
                    />

                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-[#717182]">
                        Step 2 - Map CSV Columns
                      </p>
                      {!bulkColumns.length ? (
                        <p className="text-[11px] text-[#9CA3AF]">
                          Upload a CSV file to configure column mappings.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Product Name Column{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={bulkMapping.name}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Select column</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Price Column{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={bulkMapping.price}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  price: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Select column</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Description Column
                            </label>
                            <select
                              value={bulkMapping.description}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Optional</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Stock Quantity Column
                            </label>
                            <select
                              value={bulkMapping.stockQty}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  stockQty: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Optional</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Image URL Column
                            </label>
                            <select
                              value={bulkMapping.imageUrl}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  imageUrl: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Optional</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {(createState?.errors?.bulkMapping || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.bulkMapping.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                )}

                {createState?.message && hasCreateErrors && (
                  <p className="text-[11px] text-red-600">
                    {createState.message}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendor(null);
                      setVendorSearch("");
                      setVendorResults([]);
                    }}
                    className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={createPending}
                  >
                    Change Vendor
                  </button>
                  <button
                    type="submit"
                    disabled={createPending}
                    className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createPending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-3.5 animate-spin" />
                        <span>
                          {createMode === "bulk"
                            ? "Creating products..."
                            : "Creating product..."}
                        </span>
                      </span>
                    ) : createMode === "bulk" ? (
                      "Create Products"
                    ) : (
                      "Create Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
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
