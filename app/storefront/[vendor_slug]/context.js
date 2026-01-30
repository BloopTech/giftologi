"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const StorefrontProductsContext = createContext(null);

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
    name: product?.name || "Product",
    image: images[0] || "/host/toaster.png",
    price: formatPrice(product?.price),
    rawPrice: product?.price,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
  };
};

export function StorefrontProductsProvider({
  vendorSlug,
  initialProducts,
  initialPage = 1,
  pageSize = 12,
  children,
}) {
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
      const url = new URL("/api/storefront/vendor-products", window.location.origin);
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

  const value = useMemo(
    () => ({ products, loading, hasMore, loadMore }),
    [products, loading, hasMore, loadMore]
  );

  return (
    <StorefrontProductsContext.Provider value={value}>
      {children}
    </StorefrontProductsContext.Provider>
  );
}

export function useStorefrontProducts() {
  const ctx = useContext(StorefrontProductsContext);
  if (!ctx) {
    throw new Error(
      "useStorefrontProducts must be used within StorefrontProductsProvider"
    );
  }
  return ctx;
}
