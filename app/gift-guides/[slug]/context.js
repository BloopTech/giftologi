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
import { useParams, useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { createClient as createSupabaseClient } from "@/app/utils/supabase/client";
import { getOrCreateGuestBrowserId } from "@/app/utils/guest";

const GuideDetailContext = createContext();

const SORT_OPTIONS = new Set([
  "guide",
  "relevance",
  "newest",
  "price_low",
  "price_high",
  "name_asc",
  "name_desc",
  "rating",
  "popular",
]);

const TYPE_OPTIONS = new Set(["all", "physical", "treat", "digital"]);

const normalizeSort = (value) =>
  SORT_OPTIONS.has(value) ? value : "guide";

const normalizeType = (value) =>
  TYPE_OPTIONS.has(value) ? value : "all";

const isSaleActive = (product) => {
  const salePrice = Number(product?.sale_price);
  if (!Number.isFinite(salePrice) || salePrice <= 0) return false;
  const now = Date.now();
  const startsAt = product?.sale_starts_at
    ? new Date(product.sale_starts_at).getTime()
    : null;
  const endsAt = product?.sale_ends_at
    ? new Date(product.sale_ends_at).getTime()
    : null;
  if (startsAt && !Number.isNaN(startsAt) && now < startsAt) return false;
  if (endsAt && !Number.isNaN(endsAt) && now > endsAt) return false;
  return true;
};

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
  if (!prices.length) {
    return { min: null, max: null };
  }
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

const mapGuideItemProduct = (item) => {
  const product = item?.product;
  if (!product?.id) return null;

  const images = Array.isArray(product.images) ? product.images : [];
  const vendor = product.vendor || {};
  const serviceCharge = Number(product.service_charge || 0);
  const variations = normalizeVariations(product.variations);
  const variationStats = getVariationPriceStats(variations, serviceCharge);
  const basePrice = Number(product.price);
  const baseWithCharge = Number.isFinite(basePrice)
    ? basePrice + serviceCharge
    : serviceCharge;
  const displayPrice =
    variationStats.min != null && Number.isFinite(variationStats.min)
      ? variationStats.min
      : Number.isFinite(baseWithCharge)
      ? baseWithCharge
      : null;

  const onSale = isSaleActive(product);
  const salePriceWithCharge = onSale
    ? Number(product.sale_price) + serviceCharge
    : null;
  const discountPercent =
    onSale && displayPrice > 0
      ? Math.round(((displayPrice - salePriceWithCharge) / displayPrice) * 100)
      : 0;

  return {
    id: product.id,
    productCode: product.product_code || null,
    name: product.name || "Product",
    description: product.description || "",
    image: images[0] || "/host/toaster.png",
    images,
    price: onSale ? formatPrice(salePriceWithCharge) : formatPrice(displayPrice),
    originalPrice: onSale ? formatPrice(displayPrice) : null,
    rawPrice: onSale ? salePriceWithCharge : displayPrice,
    rawOriginalPrice: onSale ? displayPrice : null,
    isOnSale: onSale,
    discountPercent,
    basePrice: Number.isFinite(baseWithCharge) ? baseWithCharge : null,
    serviceCharge,
    variations,
    variationPriceRange:
      variationStats.min != null && variationStats.max != null
        ? variationStats
        : null,
    stock: Number(product.stock_qty || 0),
    avgRating: Number(product.avg_rating) || 0,
    reviewCount: Number(product.review_count) || 0,
    purchaseCount: Number(product.purchase_count) || 0,
    product_type: product.product_type || "physical",
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.business_name,
      verified: vendor.verified,
      logo: vendor.logo_url,
    },
    editorNote: item?.editor_note || "",
  };
};

export function GuideDetailProvider({ children }) {
  const value = useGuideDetailProviderValue();
  return (
    <GuideDetailContext.Provider value={value}>
      {children}
    </GuideDetailContext.Provider>
  );
}

export function useGuideDetailContext() {
  return useContext(GuideDetailContext);
}

const buildLabelMap = (arr) => {
  const map = {};
  (arr || []).forEach((item) => {
    if (item.value && item.label) map[item.value] = item.label;
  });
  return map;
};

function useGuideDetailProviderValue() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { slug } = useParams();

  const [guide, setGuide] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [sortParam, setSortParam] = useQueryState(
    "sort",
    parseAsString.withDefault("guide")
  );
  const [typeParam, setTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [inStockParam, setInStockParam] = useQueryState(
    "in_stock",
    parseAsString.withDefault("")
  );

  const searchQuery = searchParam || "";
  const sortBy = normalizeSort(sortParam || "guide");
  const typeFilter = normalizeType(typeParam || "all");
  const inStockOnly = inStockParam === "true" || inStockParam === "1";

  const [occasions, setOccasions] = useState([]);
  const [budgetRanges, setBudgetRanges] = useState([]);

  const [hostProfile, setHostProfile] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [registryItems, setRegistryItems] = useState([]);

  const [addingToCartId, setAddingToCartId] = useState(null);
  const [buyingProductId, setBuyingProductId] = useState(null);
  const [removingFromCartId, setRemovingFromCartId] = useState(null);
  const [cartItemMap, setCartItemMap] = useState(new Map());

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);

  const [addToRegistryOpen, setAddToRegistryOpen] = useState(false);
  const [addToRegistryProduct, setAddToRegistryProduct] = useState(null);
  const fetchSequenceRef = useRef(0);

  const occasionLabels = useMemo(() => buildLabelMap(occasions), [occasions]);
  const budgetLabels = useMemo(() => buildLabelMap(budgetRanges), [budgetRanges]);

  const fetchGuideData = useCallback(async () => {
    if (!slug) return;

    const requestId = ++fetchSequenceRef.current;

    setLoading(true);
    setError(null);

    try {
      const guideUrl = new URL(
        `/api/gift-guides/${slug}`,
        window.location.origin
      );

      if (searchQuery.trim()) guideUrl.searchParams.set("q", searchQuery.trim());
      if (sortBy) guideUrl.searchParams.set("sort", sortBy);
      if (typeFilter && typeFilter !== "all") {
        guideUrl.searchParams.set("type", typeFilter);
      }
      if (inStockOnly) guideUrl.searchParams.set("in_stock", "true");
      guideUrl.searchParams.set("_ts", String(Date.now()));

      const [guideRes, lookupsRes] = await Promise.all([
        fetch(guideUrl.toString(), { cache: "no-store" }),
        fetch("/api/gift-guides/lookups", { cache: "no-store" }),
      ]);

      if (!guideRes.ok) throw new Error("Guide not found");

      const guideData = await guideRes.json().catch(() => ({}));
      const lookupsData = lookupsRes.ok
        ? await lookupsRes.json().catch(() => ({}))
        : {};

      if (requestId !== fetchSequenceRef.current) return;

      setGuide(guideData?.guide || null);
      setItems(Array.isArray(guideData?.items) ? guideData.items : []);
      setOccasions(Array.isArray(lookupsData?.occasions) ? lookupsData.occasions : []);
      setBudgetRanges(
        Array.isArray(lookupsData?.budgetRanges) ? lookupsData.budgetRanges : []
      );
    } catch (err) {
      if (requestId !== fetchSequenceRef.current) return;
      setGuide(null);
      setItems([]);
      setError(err?.message || "Failed to load guide");
    } finally {
      if (requestId !== fetchSequenceRef.current) return;
      setLoading(false);
    }
  }, [slug, searchQuery, sortBy, typeFilter, inStockOnly]);

  const fetchCartItems = useCallback(async () => {
    try {
      const guestBrowserId = getOrCreateGuestBrowserId();
      const url = new URL("/api/shop/cart-product-ids", window.location.origin);
      if (guestBrowserId) url.searchParams.set("guestBrowserId", guestBrowserId);
      url.searchParams.set("_ts", String(Date.now()));

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;

      const body = await res.json().catch(() => ({}));
      const map = new Map();
      (body?.items || []).forEach((item) => {
        if (!item?.productId) return;
        map.set(item.productId, {
          cartItemId: item.cartItemId,
          cartId: item.cartId,
          vendorSlug: item.vendorSlug,
        });
      });

      setCartItemMap(map);
    } catch {
      // Ignore cart sync errors.
    }
  }, []);

  const fetchUserRegistryState = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setHostProfile(null);
        setRegistry(null);
        setRegistryItems([]);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, firstname, lastname")
        .eq("id", user.id)
        .maybeSingle();

      setHostProfile(profile || null);

      if (profile?.role !== "host") {
        setRegistry(null);
        setRegistryItems([]);
        return;
      }

      const { data: registries } = await supabase
        .from("registries")
        .select(
          `
          id,
          title,
          registry_code,
          deadline,
          event:events!inner(id, type, date)
        `
        )
        .eq("registry_owner_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const activeRegistry = Array.isArray(registries) && registries.length > 0
        ? {
            ...registries[0],
            event: Array.isArray(registries[0]?.event)
              ? registries[0].event[0]
              : registries[0]?.event,
          }
        : null;

      setRegistry(activeRegistry);
    } catch {
      // Ignore auth/profile hydration issues.
    }
  }, [supabase]);

  const fetchRegistryItems = useCallback(async () => {
    if (!registry?.id) {
      setRegistryItems([]);
      return;
    }

    try {
      const { data: rows } = await supabase
        .from("registry_items")
        .select("id, product_id, quantity_needed, purchased_qty")
        .eq("registry_id", registry.id);

      setRegistryItems(Array.isArray(rows) ? rows : []);
    } catch {
      // Ignore registry sync errors.
    }
  }, [registry?.id, supabase]);

  const setSearchQuery = useCallback(
    (value) => {
      setSearchParam(value || "");
    },
    [setSearchParam]
  );

  const setSortBy = useCallback(
    (value) => {
      setSortParam(normalizeSort(value || "guide"));
    },
    [setSortParam]
  );

  const setTypeFilterValue = useCallback(
    (value) => {
      setTypeParam(normalizeType(value || "all"));
    },
    [setTypeParam]
  );

  const setInStockOnlyValue = useCallback(
    (value) => {
      setInStockParam(value ? "true" : "");
    },
    [setInStockParam]
  );

  const clearFilters = useCallback(() => {
    setSearchParam("");
    setSortParam("guide");
    setTypeParam("all");
    setInStockParam("");
  }, [setInStockParam, setSearchParam, setSortParam, setTypeParam]);

  const addToCart = useCallback(
    async (product) => {
      if (!product?.id || !product?.vendor?.slug) {
        toast.error("Product information is incomplete");
        return;
      }

      if (cartItemMap.has(product.id)) {
        toast("Already in cart", { icon: "🛒" });
        return;
      }

      setAddingToCartId(product.id);

      try {
        const guestBrowserId = getOrCreateGuestBrowserId();
        const res = await fetch("/api/storefront/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorSlug: product.vendor.slug,
            productId: product.id,
            quantity: 1,
            guestBrowserId,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body?.message || "Failed to add to cart");
          return;
        }

        const body = await res.json().catch(() => ({}));
        const matchingCartItem = Array.isArray(body?.items)
          ? body.items.find(
              (item) =>
                item?.product_id === product.id &&
                (!item?.variation || !item?.variation?.key)
            )
          : null;
        const latestCartItem =
          Array.isArray(body?.items) && body.items.length > 0
            ? body.items[body.items.length - 1]
            : null;

        setCartItemMap((prev) => {
          const next = new Map(prev);
          const cartItemId =
            matchingCartItem?.id || latestCartItem?.id || `temp-${product.id}`;
          next.set(product.id, {
            cartItemId,
            cartId: body?.cart?.id,
            vendorSlug: product.vendor.slug,
          });
          return next;
        });

        await fetchCartItems();

        toast.success(`${product.name} added to cart`);
      } catch {
        toast.error("Failed to add to cart");
      } finally {
        setAddingToCartId(null);
      }
    },
    [cartItemMap, fetchCartItems]
  );

  const removeFromCart = useCallback(
    async (productId) => {
      const entry = cartItemMap.get(productId);
      if (!entry?.cartItemId) {
        toast.error("Item not found in cart");
        return;
      }

      setRemovingFromCartId(productId);

      try {
        const res = await fetch("/api/storefront/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId: entry.cartItemId }),
        });

        if (!res.ok) {
          toast.error("Failed to remove from cart");
          return;
        }

        setCartItemMap((prev) => {
          const next = new Map(prev);
          next.delete(productId);
          return next;
        });

        await fetchCartItems();

        toast.success("Removed from cart");
      } catch {
        toast.error("Failed to remove from cart");
      } finally {
        setRemovingFromCartId(null);
      }
    },
    [cartItemMap, fetchCartItems]
  );

  const buyNow = useCallback(
    async (product) => {
      if (!product?.id || !product?.vendor?.slug) {
        toast.error("Product information is incomplete");
        return;
      }

      setBuyingProductId(product.id);

      try {
        const guestBrowserId = getOrCreateGuestBrowserId();
        const res = await fetch("/api/storefront/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorSlug: product.vendor.slug,
            productId: product.id,
            quantity: 1,
            guestBrowserId,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body?.message || "Failed to process purchase");
          return;
        }

        router.push("/shop/checkout");
      } catch {
        toast.error("Failed to process purchase");
      } finally {
        setBuyingProductId(null);
      }
    },
    [router]
  );

  const isInCart = useCallback(
    (productId) => cartItemMap.has(productId),
    [cartItemMap]
  );

  const isProductInRegistry = useCallback(
    (productId) => registryItems.some((item) => item.product_id === productId),
    [registryItems]
  );

  const getRegistryItem = useCallback(
    (productId) => registryItems.find((item) => item.product_id === productId),
    [registryItems]
  );

  const openProductDetail = useCallback((product) => {
    setSelectedProduct(product);
    setProductDetailOpen(true);
  }, []);

  const closeProductDetail = useCallback(() => {
    setSelectedProduct(null);
    setProductDetailOpen(false);
  }, []);

  const openAddToRegistry = useCallback(
    (product) => {
      if (hostProfile?.role !== "host") {
        toast.error("Only hosts can add gifts to a registry");
        return;
      }
      setAddToRegistryProduct(product);
      setAddToRegistryOpen(true);
    },
    [hostProfile?.role]
  );

  const closeAddToRegistry = useCallback(() => {
    setAddToRegistryProduct(null);
    setAddToRegistryOpen(false);
  }, []);

  const mappedProducts = useMemo(
    () => items.map(mapGuideItemProduct).filter(Boolean),
    [items]
  );

  const cartCount = cartItemMap.size;

  const hasActiveFilters =
    !!searchQuery || typeFilter !== "all" || inStockOnly || sortBy !== "guide";

  useEffect(() => {
    fetchGuideData();
  }, [fetchGuideData]);

  useEffect(() => {
    fetchUserRegistryState();
    fetchCartItems();
  }, [fetchCartItems, fetchUserRegistryState]);

  useEffect(() => {
    fetchRegistryItems();
  }, [fetchRegistryItems]);

  useEffect(() => {
    const handleFocus = () => {
      fetchCartItems();
      fetchRegistryItems();
    };
    const handleVisibility = () => {
      if (document.hidden) return;
      fetchCartItems();
      fetchRegistryItems();
    };
    const handleRegistryUpdate = () => {
      fetchRegistryItems();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("registry-item-updated", handleRegistryUpdate);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("registry-item-updated", handleRegistryUpdate);
    };
  }, [fetchCartItems, fetchRegistryItems]);

  return {
    slug,
    guide,
    items,
    products: mappedProducts,
    loading,
    error,
    occasionLabels,
    budgetLabels,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    typeFilter,
    setTypeFilter: setTypeFilterValue,
    inStockOnly,
    setInStockOnly: setInStockOnlyValue,
    clearFilters,
    hasActiveFilters,
    hostProfile,
    registry,
    isHost: hostProfile?.role === "host",
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
    closeAddToRegistry,
    addToCart,
    removeFromCart,
    buyNow,
    isInCart,
    addingToCartId,
    buyingProductId,
    removingFromCartId,
    cartCount,
    refreshCart: fetchCartItems,
  };
}
