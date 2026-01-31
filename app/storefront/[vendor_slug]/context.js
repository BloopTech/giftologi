"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const StorefrontContext = createContext(null);

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

const mapProduct = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  return {
    id: product?.id,
    product_code: product?.product_code || null,
    name: product?.name || "Product",
    image: images[0] || "/host/toaster.png",
    price: formatPrice(product?.price),
    rawPrice: product?.price,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
    category_id: product?.category_id || null,
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
