"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ProductDetailContext = createContext(null);

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
    images: images.length > 0 ? images : ["/host/toaster.png"],
    image: images[0] || "/host/toaster.png",
    price: formatPrice(product?.price),
    rawPrice: product?.price,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
    category: product?.category || null,
  };
};

export function ProductDetailProvider({ vendorSlug, productCode, children }) {
  const [vendor, setVendor] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsHasMore, setReviewsHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!vendorSlug || !productCode) {
      setVendor(null);
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const url = new URL("/api/storefront/product", window.location.origin);
        url.searchParams.set("vendor_slug", vendorSlug);
        url.searchParams.set("product_code", productCode);

        const res = await fetch(url.toString(), { method: "GET" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        setVendor(body?.vendor || null);
        setProduct(body?.product ? mapProduct(body.product) : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productCode, vendorSlug]);

  useEffect(() => {
    let cancelled = false;

    setReviews([]);
    setReviewsPage(1);
    setReviewsHasMore(true);

    if (!vendorSlug || !productCode) {
      setReviewsLoading(false);
      return;
    }

    setReviewsLoading(true);
    (async () => {
      try {
        const url = new URL(
          "/api/storefront/product-reviews",
          window.location.origin
        );
        url.searchParams.set("vendor_slug", vendorSlug);
        url.searchParams.set("product_code", productCode);
        url.searchParams.set("page", "1");
        url.searchParams.set("limit", "10");

        const res = await fetch(url.toString(), { method: "GET" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        const next = Array.isArray(body?.reviews) ? body.reviews : [];
        setReviews(next);
        setReviewsHasMore(next.length >= 10);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productCode, vendorSlug]);

  const loadMoreReviews = useCallback(async () => {
    if (reviewsLoading || !reviewsHasMore) return;
    if (!vendorSlug || !productCode) return;

    const nextPage = reviewsPage + 1;
    setReviewsLoading(true);

    try {
      const url = new URL(
        "/api/storefront/product-reviews",
        window.location.origin
      );
      url.searchParams.set("vendor_slug", vendorSlug);
      url.searchParams.set("product_code", productCode);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("limit", "10");

      const res = await fetch(url.toString(), { method: "GET" });
      const body = await res.json().catch(() => ({}));

      const next = Array.isArray(body?.reviews) ? body.reviews : [];
      setReviews((prev) => [...prev, ...next]);
      setReviewsPage(nextPage);
      setReviewsHasMore(next.length >= 10);
    } finally {
      setReviewsLoading(false);
    }
  }, [productCode, reviewsHasMore, reviewsLoading, reviewsPage, vendorSlug]);

  useEffect(() => {
    let cancelled = false;

    if (!vendorSlug || !productCode) {
      setRelatedProducts([]);
      setRelatedLoading(false);
      return;
    }

    setRelatedLoading(true);
    (async () => {
      try {
        const url = new URL(
          "/api/storefront/related-products",
          window.location.origin
        );
        url.searchParams.set("vendor_slug", vendorSlug);
        url.searchParams.set("product_code", productCode);
        url.searchParams.set("limit", "4");

        const res = await fetch(url.toString(), { method: "GET" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        const next = Array.isArray(body?.products) ? body.products : [];
        setRelatedProducts(
          next.map((p) => {
            const images = Array.isArray(p.images) ? p.images : [];
            return {
              id: p.id,
              product_code: p.product_code || null,
              name: p.name || "Product",
              image: images[0] || "/host/toaster.png",
              price: formatPrice(p.price),
              rawPrice: p.price,
              stock: p.stock_qty ?? 0,
            };
          })
        );
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productCode, vendorSlug]);

  const value = useMemo(
    () => ({
      vendor,
      product,
      loading,
      relatedProducts,
      relatedLoading,
      reviews,
      reviewsLoading,
      reviewsHasMore,
      loadMoreReviews,
    }),
    [
      vendor,
      product,
      loading,
      relatedProducts,
      relatedLoading,
      reviews,
      reviewsLoading,
      reviewsHasMore,
      loadMoreReviews,
    ]
  );

  return (
    <ProductDetailContext.Provider value={value}>
      {children}
    </ProductDetailContext.Provider>
  );
}

export function useProductDetail() {
  const ctx = useContext(ProductDetailContext);
  if (!ctx) {
    throw new Error(
      "useProductDetail must be used within a ProductDetailProvider"
    );
  }
  return ctx;
}
