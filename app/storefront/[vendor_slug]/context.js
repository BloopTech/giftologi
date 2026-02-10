"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryState, parseAsString } from "nuqs";
import { createClient as createSupabaseClient } from "../../utils/supabase/client";

const StorefrontContext = createContext(null);

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

const normalizeVariations = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v) => v && typeof v === "object");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((v) => v && typeof v === "object")
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getVariationPriceStats = (variations, serviceCharge = 0) => {
  const prices = (variations || [])
    .map((variation) => Number(variation?.price))
    .filter((value) => Number.isFinite(value))
    .map((value) => value + serviceCharge);
  if (!prices.length) return { min: null, max: null };
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

const mapProduct = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const serviceCharge = Number(product?.service_charge || 0);
  const variations = normalizeVariations(product?.variations);
  const variationStats = getVariationPriceStats(variations, serviceCharge);
  const relatedCategoryIds = Array.isArray(product?.product_categories)
    ? product.product_categories
        .map((entry) => entry?.category_id)
        .filter(Boolean)
    : [];
  const mergedCategoryIds = [
    ...new Set(
      [...relatedCategoryIds, product?.category_id].filter(Boolean),
    ),
  ];
  const basePrice = Number(product?.price);
  const baseWithCharge = Number.isFinite(basePrice)
    ? basePrice + serviceCharge
    : serviceCharge;
  const displayPrice =
    variationStats.min != null && Number.isFinite(variationStats.min)
      ? variationStats.min
      : Number.isFinite(baseWithCharge)
      ? baseWithCharge
      : null;
  return {
    id: product?.id,
    product_code: product?.product_code || null,
    name: product?.name || "Product",
    image: images[0] || "/host/toaster.png",
    price: formatPrice(displayPrice),
    rawPrice: displayPrice,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
    categoryId: product?.category_id || null,
    categoryIds: mergedCategoryIds,
    serviceCharge,
    avg_rating: product?.avg_rating ?? 0,
    review_count: product?.review_count ?? 0,
  };
};

const parseCategoryChips = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];

  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
      }
    } catch {
      // fallthrough
    }
  }

  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

export function StorefrontProvider({
  vendorSlug,
  initialSearchParams,
  children,
}) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const pageSize = 24;

  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states via URL query params
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(initialSearchParams?.q || "")
  );
  const [categoryParam, setCategoryParam] = useQueryState(
    "category",
    parseAsString.withDefault(initialSearchParams?.category || "")
  );
  const [sortParam, setSortParam] = useQueryState(
    "sort",
    parseAsString.withDefault(initialSearchParams?.sort || "newest")
  );
  const [minPriceParam, setMinPriceParam] = useQueryState(
    "minPrice",
    parseAsString.withDefault(initialSearchParams?.minPrice || "")
  );
  const [maxPriceParam, setMaxPriceParam] = useQueryState(
    "maxPrice",
    parseAsString.withDefault(initialSearchParams?.maxPrice || "")
  );
  const [ratingParam, setRatingParam] = useQueryState(
    "rating",
    parseAsString.withDefault(initialSearchParams?.rating || "")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault(initialSearchParams?.page || "1")
  );

  const searchQuery = searchParam || "";
  const categoryFilter = categoryParam || "";
  const sortBy = sortParam || "newest";
  const selectedCategories = useMemo(
    () => (categoryFilter ? categoryFilter.split(",").filter(Boolean) : []),
    [categoryFilter]
  );
  const page = useMemo(() => {
    const num = Number.parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 1;
    return num;
  }, [pageParam]);
  const [priceRange, setPriceRange] = useState({
    min: minPriceParam || "",
    max: maxPriceParam || "",
  });

  useEffect(() => {
    setPriceRange({
      min: minPriceParam || "",
      max: maxPriceParam || "",
    });
  }, [minPriceParam, maxPriceParam]);

  // Fetch vendor
  useEffect(() => {
    let cancelled = false;
    if (!vendorSlug) {
      setVendor(null);
      setVendorId(null);
      setVendorLoading(false);
      return;
    }

    setVendorLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select(
            "id, business_name, description, logo, logo_url, slug, shop_status, category, verified, address_city, address_country, website, phone, email"
          )
          .eq("slug", vendorSlug)
          .maybeSingle();
        if (cancelled) return;
        const v = data || null;
        if (v) {
          v.category_chips = parseCategoryChips(v.category);
        }
        setVendor(v);
        setVendorId(v?.id || null);
      } finally {
        if (!cancelled) setVendorLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorSlug, supabase]);

  // Fetch vendor-specific categories
  useEffect(() => {
    let cancelled = false;
    if (!vendorId) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    setCategoriesLoading(true);
    (async () => {
      try {
        // Get category IDs from vendor's products
        const { data: prods } = await supabase
          .from("products")
          .select("category_id, product_categories (category_id)")
          .eq("vendor_id", vendorId)
          .eq("status", "approved")
          .eq("active", true);

        if (cancelled) return;

        const catIds = [
          ...new Set(
            (prods || [])
              .flatMap((p) => {
                const related = Array.isArray(p.product_categories)
                  ? p.product_categories.map((e) => e?.category_id).filter(Boolean)
                  : [];
                return [p.category_id, ...related].filter(Boolean);
              })
          ),
        ];

        if (catIds.length === 0) {
          setCategories([]);
          if (!cancelled) setCategoriesLoading(false);
          return;
        }

        const { data: cats } = await supabase
          .from("categories")
          .select("id, name, slug, parent_category_id")
          .in("id", catIds)
          .order("name");

        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorId, supabase]);

  // Filter key for detecting changes
  const filterKey = useMemo(
    () =>
      [searchQuery, categoryFilter, sortBy, minPriceParam, maxPriceParam, ratingParam].join("|"),
    [searchQuery, categoryFilter, sortBy, minPriceParam, maxPriceParam, ratingParam]
  );
  const lastFilterRef = useRef(filterKey);
  const lastPageRef = useRef(page);

  // Fetch products with server-side filtering
  useEffect(() => {
    let ignore = false;

    if (!vendorId) return;

    const fetchProducts = async () => {
      setLoading(true);

      try {
        if (filterKey !== lastFilterRef.current && page !== 1) {
          setProducts([]);
          setPageParam("1");
          lastFilterRef.current = filterKey;
          lastPageRef.current = 1;
          return;
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Pre-fetch product IDs from product_categories if category filter is active
        let categoryProductIds = null;
        if (selectedCategories.length > 0) {
          const { data: catRows } = await supabase
            .from("product_categories")
            .select("product_id")
            .in("category_id", selectedCategories);
          categoryProductIds = new Set(
            (catRows || []).map((r) => r.product_id).filter(Boolean)
          );
        }

        let query = supabase
          .from("products")
          .select(
            `
            id,
            product_code,
            name,
            price,
            service_charge,
            images,
            variations,
            description,
            stock_qty,
            category_id,
            avg_rating,
            review_count,
            is_featured,
            purchase_count,
            product_categories (category_id)
          `,
            { count: "exact" }
          )
          .eq("vendor_id", vendorId)
          .eq("status", "approved")
          .eq("active", true);

        if (searchQuery && searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery.trim()}%`);
        }

        if (selectedCategories.length > 0) {
          const catIds = selectedCategories.join(",");
          if (categoryProductIds && categoryProductIds.size > 0) {
            const allIds = [...categoryProductIds].join(",");
            query = query.or(
              `category_id.in.(${catIds}),id.in.(${allIds})`
            );
          } else {
            query = query.in("category_id", selectedCategories);
          }
        }

        if (ratingParam) {
          const minRating = parseFloat(ratingParam);
          if (!Number.isNaN(minRating) && minRating > 0) {
            query = query.gte("avg_rating", minRating);
          }
        }

        if (minPriceParam) {
          const min = parseFloat(minPriceParam);
          if (!Number.isNaN(min)) query = query.gte("price", min);
        }

        if (maxPriceParam) {
          const max = parseFloat(maxPriceParam);
          if (!Number.isNaN(max)) query = query.lte("price", max);
        }

        switch (sortBy) {
          case "popular":
            query = query
              .order("purchase_count", { ascending: false })
              .order("review_count", { ascending: false });
            break;
          case "best_rated":
            query = query
              .order("avg_rating", { ascending: false })
              .order("review_count", { ascending: false });
            break;
          case "newest":
            query = query.order("created_at", { ascending: false });
            break;
          case "price_low":
            query = query.order("price", { ascending: true });
            break;
          case "price_high":
            query = query.order("price", { ascending: false });
            break;
          case "name_asc":
            query = query.order("name", { ascending: true });
            break;
          case "name_desc":
            query = query.order("name", { ascending: false });
            break;
          case "featured":
          default:
            query = query
              .order("is_featured", { ascending: false })
              .order("purchase_count", { ascending: false })
              .order("avg_rating", { ascending: false });
            break;
        }

        const { data, error, count } = await query.range(from, to);
        if (ignore || error) return;

        const nextRaw = Array.isArray(data) ? data : [];
        const nextMapped = nextRaw.map(mapProduct).filter((p) => p?.id);
        setProducts(nextMapped);
        setTotalCount(count || 0);
        lastFilterRef.current = filterKey;
        lastPageRef.current = page;
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      ignore = true;
    };
  }, [
    supabase,
    vendorId,
    page,
    pageSize,
    filterKey,
    searchQuery,
    categoryFilter,
    sortBy,
    minPriceParam,
    maxPriceParam,
    ratingParam,
    selectedCategories,
    setPageParam,
  ]);

  const totalPages = useMemo(() => {
    const calc = Math.ceil(totalCount / pageSize);
    return calc > 0 ? calc : 1;
  }, [totalCount, pageSize]);

  const setPage = useCallback(
    (value) => {
      const next = Number(value);
      const normalized = Number.isFinite(next) && next > 0 ? next : 1;
      setPageParam(String(normalized));
    },
    [setPageParam]
  );

  // Filter action helpers
  const setSearchQuery = useCallback(
    (val) => {
      setSearchParam(val || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam]
  );

  const setCategoryFilter = useCallback(
    (val) => {
      setCategoryParam(val || "");
      setPageParam("1");
    },
    [setCategoryParam, setPageParam]
  );

  const setSortBy = useCallback(
    (val) => {
      setSortParam(val || "newest");
      setPageParam("1");
    },
    [setSortParam, setPageParam]
  );

  const toggleCategory = useCallback(
    (catId) => {
      const current = categoryFilter ? categoryFilter.split(",").filter(Boolean) : [];
      const next = current.includes(catId)
        ? current.filter((id) => id !== catId)
        : [...current, catId];
      setCategoryParam(next.join(",") || "");
      setPageParam("1");
    },
    [categoryFilter, setCategoryParam, setPageParam]
  );

  const toggleParentCategory = useCallback(
    (parentId) => {
      const childIds = categories
        .filter((c) => c.parent_category_id === parentId)
        .map((c) => c.id);
      const allIds = [parentId, ...childIds];
      const current = categoryFilter ? categoryFilter.split(",").filter(Boolean) : [];
      const allSelected = allIds.every((id) => current.includes(id));
      const next = allSelected
        ? current.filter((id) => !allIds.includes(id))
        : [...new Set([...current, ...allIds])];
      setCategoryParam(next.join(",") || "");
      setPageParam("1");
    },
    [categories, categoryFilter, setCategoryParam, setPageParam]
  );

  const setAndApplyPriceRange = useCallback(
    ({ min, max }) => {
      setPriceRange({ min, max });
      setMinPriceParam(min ? String(min) : "");
      setMaxPriceParam(max ? String(max) : "");
      setPageParam("1");
    },
    [setMinPriceParam, setMaxPriceParam, setPageParam]
  );

  const setRatingFilter = useCallback(
    (val) => {
      setRatingParam(val || "");
      setPageParam("1");
    },
    [setRatingParam, setPageParam]
  );

  const clearFilters = useCallback(() => {
    setSearchParam("");
    setCategoryParam("");
    setSortParam("newest");
    setMinPriceParam("");
    setMaxPriceParam("");
    setRatingParam("");
    setPageParam("1");
    setPriceRange({ min: "", max: "" });
  }, [
    setSearchParam,
    setCategoryParam,
    setSortParam,
    setMinPriceParam,
    setMaxPriceParam,
    setRatingParam,
    setPageParam,
  ]);

  const applyFilters = useCallback(() => {
    setPageParam("1");
  }, [setPageParam]);

  const hasActiveFilters =
    searchQuery ||
    selectedCategories.length > 0 ||
    priceRange.min ||
    priceRange.max ||
    ratingParam;

  const value = useMemo(
    () => ({
      vendor,
      vendorLoading,
      categories,
      categoriesLoading,
      products,
      productsLoading: loading,
      totalPages,
      page,
      setPage,
      // Filters
      searchQuery,
      setSearchQuery,
      categoryFilter,
      setCategoryFilter,
      sortBy,
      setSortBy,
      priceRange,
      setPriceRange,
      applyFilters,
      clearFilters,
      hasActiveFilters,
      ratingFilter: ratingParam,
      setRatingFilter,
      selectedCategories,
      toggleCategory,
      toggleParentCategory,
      setAndApplyPriceRange,
    }),
    [
      vendor,
      vendorLoading,
      categories,
      categoriesLoading,
      products,
      loading,
      totalPages,
      page,
      setPage,
      searchQuery,
      categoryFilter,
      sortBy,
      priceRange,
      applyFilters,
      clearFilters,
      hasActiveFilters,
      ratingParam,
      setRatingFilter,
      selectedCategories,
      toggleCategory,
      toggleParentCategory,
      setAndApplyPriceRange,
    ]
  );

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) {
    throw new Error(
      "useStorefront must be used within StorefrontProvider"
    );
  }
  return ctx;
}
