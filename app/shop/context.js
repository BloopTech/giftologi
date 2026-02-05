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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryState, parseAsString } from "nuqs";

import { createClient as createSupabaseClient } from "../utils/supabase/client";
import {
  getProductSessionId,
  getOrCreateProductSessionId,
} from "../utils/guest";

const ShopContext = createContext(null);

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

const getVariationPriceStats = (variations) => {
  const prices = (variations || [])
    .map((variation) => Number(variation?.price))
    .filter((value) => Number.isFinite(value));
  if (!prices.length) {
    return { min: null, max: null };
  }
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

const mapProduct = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const vendor = product?.vendor || {};
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
  const variations = normalizeVariations(product?.variations);
  const variationStats = getVariationPriceStats(variations);
  const basePrice = Number(product?.price);
  const displayPrice =
    variationStats.min != null && Number.isFinite(variationStats.min)
      ? variationStats.min
      : Number.isFinite(basePrice)
      ? basePrice
      : null;
  return {
    id: product?.id,
    productCode: product?.product_code || null,
    name: product?.name || "Product",
    image: images[0] || "/host/toaster.png",
    images,
    price: formatPrice(displayPrice),
    rawPrice: displayPrice,
    basePrice: Number.isFinite(basePrice) ? basePrice : null,
    variationPriceRange:
      variationStats.min != null && variationStats.max != null
        ? variationStats
        : null,
    variations,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
    categoryId: product?.category_id || null,
    categoryIds: mergedCategoryIds,
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.business_name,
      verified: vendor.verified,
      status: vendor.shop_status,
    },
  };
};

export function ShopProvider({
  children,
  initialProducts,
  initialCategories,
  activeRegistry,
  hostProfile,
  initialSearchParams,
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const pageSize = 24;

  // Products state
  const [products, setProducts] = useState(() =>
    Array.isArray(initialProducts) ? initialProducts.map(mapProduct) : []
  );
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    Array.isArray(initialProducts) ? initialProducts.length >= pageSize : false
  );
  const [categories, setCategories] = useState(
    Array.isArray(initialCategories) ? initialCategories : []
  );

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredPage, setFeaturedPage] = useState(1);
  const [featuredHasMore, setFeaturedHasMore] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const [recommendedHasMore, setRecommendedHasMore] = useState(false);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);
  const [recentlyViewedPage, setRecentlyViewedPage] = useState(1);
  const [recentlyViewedHasMore, setRecentlyViewedHasMore] = useState(false);

  // Registry items state
  const [registryItems, setRegistryItems] = useState([]);

  // Filter states
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(initialSearchParams?.q || "")
  );
  const [categoryParam, setCategoryParam] = useQueryState(
    "category",
    parseAsString.withDefault(initialSearchParams?.category || "all")
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
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault(initialSearchParams?.page || "1")
  );
  const searchQuery = searchParam || "";
  const categoryFilter = categoryParam || "all";
  const sortBy = sortParam || "newest";
  const page = useMemo(() => {
    const num = Number.parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 1;
    return num;
  }, [pageParam]);
  const [priceRange, setPriceRange] = useState({
    min: minPriceParam || "",
    max: maxPriceParam || "",
  });

  // Registry state
  const [registry, setRegistry] = useState(activeRegistry);

  // Product detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);

  // Add to registry modal
  const [addToRegistryOpen, setAddToRegistryOpen] = useState(false);
  const [addToRegistryProduct, setAddToRegistryProduct] = useState(null);

  useEffect(() => {
    setPriceRange({
      min: minPriceParam || "",
      max: maxPriceParam || "",
    });
  }, [minPriceParam, maxPriceParam]);

  useEffect(() => {
    let ignore = false;

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");

      if (ignore || error) return;
      setCategories(Array.isArray(data) ? data : []);
    };

    fetchCategories();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const fetchFeaturedProducts = useCallback(async ({ page = 1, append = false } = {}) => {
    setFeaturedLoading(true);
    try {
      const url = new URL("/api/product/featured", window.location.origin);
      url.searchParams.set("limit", "8");
      url.searchParams.set("page", String(page));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (!append) setFeaturedProducts([]);
        setFeaturedHasMore(false);
        return;
      }

      const body = await res.json().catch(() => ({}));
      const next = Array.isArray(body?.products) ? body.products : [];
      const mapped = next.map(mapProduct).filter((p) => p?.id);
      setFeaturedHasMore(!!body?.has_more);
      setFeaturedPage(page);
      setFeaturedProducts((prev) => {
        if (!append) return mapped;
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        mapped.forEach((p) => {
          if (!existing.has(p.id)) merged.push(p);
        });
        return merged;
      });
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  const loadMoreFeaturedProducts = useCallback(async () => {
    if (featuredLoading || !featuredHasMore) return;
    const nextPage = featuredPage + 1;
    await fetchFeaturedProducts({ page: nextPage, append: true });
  }, [fetchFeaturedProducts, featuredHasMore, featuredLoading, featuredPage]);

  const fetchRecommendedProducts = useCallback(async ({ page = 1, append = false } = {}) => {
    setRecommendedLoading(true);
    try {
      const url = new URL("/api/product/recommended", window.location.origin);
      url.searchParams.set("limit", "8");
      url.searchParams.set("page", String(page));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (!append) setRecommendedProducts([]);
        setRecommendedHasMore(false);
        return;
      }

      const body = await res.json().catch(() => ({}));
      const next = Array.isArray(body?.products) ? body.products : [];
      const mapped = next.map(mapProduct).filter((p) => p?.id);
      setRecommendedHasMore(!!body?.has_more);
      setRecommendedPage(page);
      setRecommendedProducts((prev) => {
        if (!append) return mapped;
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        mapped.forEach((p) => {
          if (!existing.has(p.id)) merged.push(p);
        });
        return merged;
      });
    } finally {
      setRecommendedLoading(false);
    }
  }, []);

  const loadMoreRecommendedProducts = useCallback(async () => {
    if (recommendedLoading || !recommendedHasMore) return;
    const nextPage = recommendedPage + 1;
    await fetchRecommendedProducts({ page: nextPage, append: true });
  }, [
    fetchRecommendedProducts,
    recommendedHasMore,
    recommendedLoading,
    recommendedPage,
  ]);

  const fetchRecentlyViewedProducts = useCallback(async ({ page = 1, append = false } = {}) => {
    setRecentlyViewedLoading(true);
    try {
      const sessionId = getProductSessionId() || getOrCreateProductSessionId();
      if (!sessionId) {
        if (!append) setRecentlyViewedProducts([]);
        setRecentlyViewedHasMore(false);
        return;
      }

      const url = new URL(
        "/api/product/recently-viewed",
        window.location.origin
      );
      url.searchParams.set("limit", "8");
      url.searchParams.set("page", String(page));
      url.searchParams.set("session_id", sessionId);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (!append) setRecentlyViewedProducts([]);
        setRecentlyViewedHasMore(false);
        return;
      }

      const body = await res.json().catch(() => ({}));
      const next = Array.isArray(body?.products) ? body.products : [];
      const mapped = next.map(mapProduct).filter((p) => p?.id);
      setRecentlyViewedHasMore(!!body?.has_more);
      setRecentlyViewedPage(page);
      setRecentlyViewedProducts((prev) => {
        if (!append) return mapped;
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        mapped.forEach((p) => {
          if (!existing.has(p.id)) merged.push(p);
        });
        return merged;
      });
    } finally {
      setRecentlyViewedLoading(false);
    }
  }, []);

  const loadMoreRecentlyViewedProducts = useCallback(async () => {
    if (recentlyViewedLoading || !recentlyViewedHasMore) return;
    const nextPage = recentlyViewedPage + 1;
    await fetchRecentlyViewedProducts({ page: nextPage, append: true });
  }, [
    fetchRecentlyViewedProducts,
    recentlyViewedHasMore,
    recentlyViewedLoading,
    recentlyViewedPage,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    fetchFeaturedProducts({ page: 1, append: false });
    fetchRecommendedProducts({ page: 1, append: false });
    fetchRecentlyViewedProducts({ page: 1, append: false });

    const handleProductViewed = () => {
      fetchRecentlyViewedProducts({ page: 1, append: false });
    };

    window.addEventListener("product-viewed", handleProductViewed);
    return () => {
      window.removeEventListener("product-viewed", handleProductViewed);
    };
  }, [
    fetchFeaturedProducts,
    fetchRecommendedProducts,
    fetchRecentlyViewedProducts,
  ]);

  const filterKey = useMemo(
    () =>
      [searchQuery, categoryFilter, sortBy, minPriceParam, maxPriceParam].join(
        "|"
      ),
    [searchQuery, categoryFilter, sortBy, minPriceParam, maxPriceParam]
  );
  const lastFilterRef = useRef(filterKey);
  const lastPageRef = useRef(page);

  useEffect(() => {
    let ignore = false;

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

        let query = supabase
          .from("products")
          .select(
            `
            id,
            product_code,
            name,
            price,
            images,
            variations,
            description,
            stock_qty,
            category_id,
            product_categories (category_id),
            vendor:vendors!inner(
              id,
              slug,
              business_name,
              verified,
              shop_status
            )
          `
          )
          .eq("status", "approved")
          .eq("active", true)
          .eq("vendor.shop_status", "active")
          .gt("stock_qty", 0);

        if (searchQuery && searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery.trim()}%`);
        }

        if (categoryFilter && categoryFilter !== "all") {
          query = query.or(
            `category_id.eq.${categoryFilter},product_categories.category_id.eq.${categoryFilter}`,
          );
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
          case "newest":
          default:
            query = query.order("created_at", { ascending: false });
            break;
        }

        const { data, error } = await query.range(from, to);
        if (ignore || error) return;

        const nextRaw = Array.isArray(data) ? data : [];
        const nextMapped = nextRaw.map(mapProduct).filter((p) => p?.id);
        const shouldReplace =
          filterKey !== lastFilterRef.current || page <= 1 || page <= lastPageRef.current;

        if (shouldReplace) {
          setProducts(nextMapped);
        } else {
          setProducts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            nextMapped.forEach((p) => {
              if (!existing.has(p.id)) merged.push(p);
            });
            return merged;
          });
        }

        setHasMore(nextRaw.length >= pageSize);
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
    page,
    pageSize,
    filterKey,
    searchQuery,
    categoryFilter,
    sortBy,
    minPriceParam,
    maxPriceParam,
    setPageParam,
  ]);

  // Fetch registry items if user has a registry
  const fetchRegistryItems = useCallback(async () => {
    if (!registry?.id) return;

    try {
      const { data: items, error } = await supabase
        .from("registry_items")
        .select("product_id, id, quantity_needed, purchased_qty")
        .eq("registry_id", registry.id);

      if (error) throw error;
      setRegistryItems(items || []);
    } catch (err) {
      console.error("Failed to fetch registry items:", err);
    }
  }, [registry?.id, supabase]);

  // Fetch registry items when registry changes or after actions
  useEffect(() => {
    fetchRegistryItems();
  }, [fetchRegistryItems]);

  // Refresh registry items after add/remove operations
  useEffect(() => {
    // This will be triggered when registryItems change from server actions
    const handleStorageChange = () => {
      fetchRegistryItems();
    };

    window.addEventListener('registry-item-updated', handleStorageChange);
    return () => window.removeEventListener('registry-item-updated', handleStorageChange);
  }, [fetchRegistryItems]);

  // Load more products
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setPageParam(String(page + 1));
  }, [loading, hasMore, page, setPageParam]);

  // Search/filter products
  const applyFilters = useCallback(async () => {
    setMinPriceParam(priceRange.min || "");
    setMaxPriceParam(priceRange.max || "");
    setPageParam("1");
  }, [priceRange, setMinPriceParam, setMaxPriceParam, setPageParam]);

  // Open product detail
  const openProductDetail = useCallback((product) => {
    setSelectedProduct(product);
    setProductDetailOpen(true);
  }, []);

  // Close product detail
  const closeProductDetail = useCallback(() => {
    setProductDetailOpen(false);
    setSelectedProduct(null);
  }, []);

  // Open add to registry modal
  const openAddToRegistry = useCallback(
    (product) => {
      if (!registry) {
        toast.error("Please create a registry first to add gifts");
        router.push("/dashboard/h");
        return;
      }
      setAddToRegistryProduct(product);
      setAddToRegistryOpen(true);
    },
    [registry, router]
  );

  // Close add to registry modal
  const closeAddToRegistry = useCallback(() => {
    setAddToRegistryOpen(false);
    setAddToRegistryProduct(null);
  }, []);

  // Check if product is in registry
  const isProductInRegistry = useCallback(
    (productId) => {
      return registryItems.some((item) => item.product_id === productId);
    },
    [registryItems]
  );

  // Get registry item for product
  const getRegistryItem = useCallback(
    (productId) => {
      return registryItems.find((item) => item.product_id === productId);
    },
    [registryItems]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchParam("");
    setCategoryParam("all");
    setSortParam("newest");
    setMinPriceParam("");
    setMaxPriceParam("");
    setPageParam("1");
    setPriceRange({ min: "", max: "" });
  }, [
    setSearchParam,
    setCategoryParam,
    setSortParam,
    setMinPriceParam,
    setMaxPriceParam,
    setPageParam,
  ]);

  const setSearchQuery = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam]
  );

  const setCategoryFilter = useCallback(
    (value) => {
      setCategoryParam(value || "all");
      setPageParam("1");
    },
    [setCategoryParam, setPageParam]
  );

  const setSortBy = useCallback(
    (value) => {
      setSortParam(value || "newest");
      setPageParam("1");
    },
    [setSortParam, setPageParam]
  );

  const hasActiveFilters =
    searchQuery ||
    (categoryFilter && categoryFilter !== "all") ||
    priceRange.min ||
    priceRange.max;

  const value = useMemo(
    () => ({
      // Products
      products,
      loading,
      hasMore,
      loadMore,

      // Surfaces
      featuredProducts,
      featuredLoading,
      featuredHasMore,
      loadMoreFeaturedProducts,
      recommendedProducts,
      recommendedLoading,
      recommendedHasMore,
      loadMoreRecommendedProducts,
      recentlyViewedProducts,
      recentlyViewedLoading,
      recentlyViewedHasMore,
      loadMoreRecentlyViewedProducts,

      // Filters
      searchQuery,
      setSearchQuery,
      categoryFilter,
      setCategoryFilter,
      sortBy,
      setSortBy,
      priceRange,
      setPriceRange,
      categories,
      applyFilters,
      clearFilters,
      hasActiveFilters,

      // Registry
      registry,
      hostProfile,
      isHost: hostProfile?.role === "host",
      registryItems,
      isProductInRegistry,
      getRegistryItem,

      // Product detail modal
      selectedProduct,
      productDetailOpen,
      openProductDetail,
      closeProductDetail,

      // Add to registry modal
      addToRegistryOpen,
      addToRegistryProduct,
      openAddToRegistry,
      closeAddToRegistry
    }),
    [
      products,
      loading,
      hasMore,
      loadMore,
      featuredProducts,
      featuredLoading,
      featuredHasMore,
      loadMoreFeaturedProducts,
      recommendedProducts,
      recommendedLoading,
      recommendedHasMore,
      loadMoreRecommendedProducts,
      recentlyViewedProducts,
      recentlyViewedLoading,
      recentlyViewedHasMore,
      loadMoreRecentlyViewedProducts,
      searchQuery,
      categoryFilter,
      sortBy,
      priceRange,
      categories,
      applyFilters,
      clearFilters,
      hasActiveFilters,
      registry,
      hostProfile,
      registryItems,
      isProductInRegistry,
      getRegistryItem,
      selectedProduct,
      productDetailOpen,
      openProductDetail,
      closeProductDetail,
      addToRegistryOpen,
      addToRegistryProduct,
      openAddToRegistry,
      closeAddToRegistry
    ]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error("useShop must be used within ShopProvider");
  }
  return ctx;
}
