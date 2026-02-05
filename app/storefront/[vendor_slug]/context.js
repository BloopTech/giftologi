"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getProductSessionId,
  getOrCreateProductSessionId,
} from "../../utils/guest";

const StorefrontContext = createContext(null);

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

const mapProduct = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
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
  return {
    id: product?.id,
    product_code: product?.product_code || null,
    name: product?.name || "Product",
    image: images[0] || "/host/toaster.png",
    price: formatPrice(product?.price),
    rawPrice: product?.price,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
    categoryId: product?.category_id || null,
    categoryIds: mergedCategoryIds,
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
  initialProducts,
  initialPage = 1,
  pageSize = 12,
  children,
}) {
  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [products, setProducts] = useState(() =>
    Array.isArray(initialProducts) ? initialProducts : []
  );
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    Array.isArray(initialProducts) ? initialProducts.length >= pageSize : false
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

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    if (!vendorSlug) return;

    const nextPage = page + 1;
    setLoading(true);

    try {
      const url = new URL(
        "/api/storefront/vendor-products",
        window.location.origin
      );
      url.searchParams.set("vendor_slug", vendorSlug);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("limit", String(pageSize));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setHasMore(false);
        return;
      }

      const body = await res.json().catch(() => ({}));
      const nextRaw = Array.isArray(body?.products) ? body.products : [];
      const nextMapped = nextRaw.map(mapProduct).filter((p) => p?.id);

      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        nextMapped.forEach((p) => {
          if (!existing.has(p.id)) merged.push(p);
        });
        return merged;
      });

      setPage(nextPage);
      setHasMore(nextRaw.length >= pageSize);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, pageSize, vendorSlug]);

  useEffect(() => {
    if (!vendorSlug) return;

    setProducts([]);
    setPage(0);
    setHasMore(true);
  }, [vendorSlug]);

  const fetchFeaturedProducts = useCallback(async ({ page = 1, append = false } = {}) => {
    if (!vendorSlug) return;
    setFeaturedLoading(true);
    try {
      const url = new URL("/api/product/featured", window.location.origin);
      url.searchParams.set("vendor_slug", vendorSlug);
      url.searchParams.set("limit", "6");
      url.searchParams.set("page", String(page));
      url.searchParams.set("include_closed", "true");

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
  }, [vendorSlug]);

  const loadMoreFeaturedProducts = useCallback(async () => {
    if (featuredLoading || !featuredHasMore) return;
    const nextPage = featuredPage + 1;
    await fetchFeaturedProducts({ page: nextPage, append: true });
  }, [fetchFeaturedProducts, featuredHasMore, featuredLoading, featuredPage]);

  const fetchRecommendedProducts = useCallback(async ({ page = 1, append = false } = {}) => {
    if (!vendorSlug) return;
    setRecommendedLoading(true);
    try {
      const url = new URL("/api/product/recommended", window.location.origin);
      url.searchParams.set("vendor_slug", vendorSlug);
      url.searchParams.set("limit", "6");
      url.searchParams.set("page", String(page));
      url.searchParams.set("include_closed", "true");

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
  }, [vendorSlug]);

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
    if (!vendorSlug) return;
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
      url.searchParams.set("vendor_slug", vendorSlug);
      url.searchParams.set("limit", "6");
      url.searchParams.set("page", String(page));
      url.searchParams.set("session_id", sessionId);
      url.searchParams.set("include_closed", "true");

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
  }, [vendorSlug]);

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

  useEffect(() => {
    if (!vendorSlug) return;
    if (loading) return;
    if (products.length > 0) return;
    if (!hasMore) return;
    if (page !== 0) return;

    loadMore();
  }, [vendorSlug, hasMore, loadMore, loading, page, products.length]);

  useEffect(() => {
    let cancelled = false;
    if (!vendorSlug) {
      setVendor(null);
      setVendorLoading(false);
      return;
    }

    setVendorLoading(true);
    (async () => {
      try {
        const url = new URL("/api/storefront/vendor", window.location.origin);
        url.searchParams.set("vendor_slug", vendorSlug);
        const res = await fetch(url.toString(), { method: "GET" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const nextVendor = body?.vendor || null;
        if (nextVendor) {
          nextVendor.category_chips = parseCategoryChips(nextVendor.category);
        }
        setVendor(nextVendor);
      } finally {
        if (!cancelled) setVendorLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorSlug]);

  useEffect(() => {
    let cancelled = false;
    if (!vendorSlug) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    setCategoriesLoading(true);
    (async () => {
      try {
        const url = new URL(
          "/api/storefront/vendor-categories",
          window.location.origin
        );
        url.searchParams.set("vendor_slug", vendorSlug);
        const res = await fetch(url.toString(), { method: "GET" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        setCategories(Array.isArray(body?.categories) ? body.categories : []);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorSlug]);

  const value = useMemo(
    () => ({
      vendor,
      vendorLoading,
      categories,
      categoriesLoading,
      products,
      productsLoading: loading,
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
    }),
    [
      vendor,
      vendorLoading,
      categories,
      categoriesLoading,
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
