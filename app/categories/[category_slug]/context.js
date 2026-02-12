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

import { createClient as createSupabaseClient } from "../../utils/supabase/client";
import { getOrCreateGuestBrowserId } from "../../utils/guest";
import { ShopContext } from "../../shop/context";

const CategoryShopContext = createContext(null);

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

const isSaleActive = (product) => {
  const salePrice = Number(product?.sale_price);
  if (!Number.isFinite(salePrice) || salePrice <= 0) return false;
  const now = Date.now();
  const startsAt = product?.sale_starts_at ? new Date(product.sale_starts_at).getTime() : null;
  const endsAt = product?.sale_ends_at ? new Date(product.sale_ends_at).getTime() : null;
  if (startsAt && !Number.isNaN(startsAt) && now < startsAt) return false;
  if (endsAt && !Number.isNaN(endsAt) && now > endsAt) return false;
  return true;
};

const mapProduct = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const vendor = product?.vendor || {};
  const serviceCharge = Number(product?.service_charge || 0);
  const relatedCategoryIds = Array.isArray(product?.product_categories)
    ? product.product_categories.map((entry) => entry?.category_id).filter(Boolean)
    : [];
  const mergedCategoryIds = [
    ...new Set([...relatedCategoryIds, product?.category_id].filter(Boolean)),
  ];
  const variations = normalizeVariations(product?.variations);
  const variationStats = getVariationPriceStats(variations, serviceCharge);
  const basePrice = Number(product?.price);
  const baseWithCharge = Number.isFinite(basePrice) ? basePrice + serviceCharge : serviceCharge;
  const displayPrice =
    variationStats.min != null && Number.isFinite(variationStats.min)
      ? variationStats.min
      : Number.isFinite(baseWithCharge)
      ? baseWithCharge
      : null;

  const onSale = isSaleActive(product);
  const salePriceWithCharge = onSale ? Number(product.sale_price) + serviceCharge : null;
  const discountPercent =
    onSale && displayPrice > 0
      ? Math.round(((displayPrice - salePriceWithCharge) / displayPrice) * 100)
      : 0;

  return {
    id: product?.id,
    productCode: product?.product_code || null,
    name: product?.name || "Product",
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
    variationPriceRange:
      variationStats.min != null && variationStats.max != null ? variationStats : null,
    variations,
    description: product?.description || "",
    stock: product?.stock_qty ?? 0,
    avgRating: Number(product?.avg_rating) || 0,
    reviewCount: Number(product?.review_count) || 0,
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

export function CategoryShopProvider({
  children,
  category,
  subcategories,
  activeRegistry,
  hostProfile,
  initialSearchParams,
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const pageSize = 24;

  // The parent category + its subcategory IDs for querying
  const allCategoryIds = useMemo(() => {
    const ids = [category?.id, ...(subcategories || []).map((s) => s.id)].filter(Boolean);
    return [...new Set(ids)];
  }, [category, subcategories]);

  // Products state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Registry items state
  const [registryItems, setRegistryItems] = useState([]);

  // Filter states — subcategory filter within this category
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(initialSearchParams?.q || "")
  );
  const [subcategoryParam, setSubcategoryParam] = useQueryState(
    "sub",
    parseAsString.withDefault(initialSearchParams?.sub || "")
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
  const [onSaleParam, setOnSaleParam] = useQueryState(
    "onSale",
    parseAsString.withDefault(initialSearchParams?.onSale || "")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault(initialSearchParams?.page || "1")
  );

  const searchQuery = searchParam || "";
  const sortBy = sortParam || "newest";
  const selectedSubcategories = useMemo(
    () => (subcategoryParam ? subcategoryParam.split(",").filter(Boolean) : []),
    [subcategoryParam]
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

  // Registry state
  const [registry, setRegistry] = useState(activeRegistry);

  // Cart action states
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [buyingProductId, setBuyingProductId] = useState(null);
  const [removingFromCartId, setRemovingFromCartId] = useState(null);
  const [cartItemMap, setCartItemMap] = useState(new Map());

  // Product detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);

  // Add to registry modal
  const [addToRegistryOpen, setAddToRegistryOpen] = useState(false);
  const [addToRegistryProduct, setAddToRegistryProduct] = useState(null);

  useEffect(() => {
    setPriceRange({ min: minPriceParam || "", max: maxPriceParam || "" });
  }, [minPriceParam, maxPriceParam]);

  // Fetch cart items
  useEffect(() => {
    let ignore = false;
    const fetchCartItems = async () => {
      try {
        const guestBrowserId = getOrCreateGuestBrowserId();
        const url = new URL("/api/shop/cart-product-ids", window.location.origin);
        if (guestBrowserId) url.searchParams.set("guestBrowserId", guestBrowserId);
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const body = await res.json();
        const map = new Map();
        (body.items || []).forEach((item) => {
          map.set(item.productId, {
            cartItemId: item.cartItemId,
            cartId: item.cartId,
            vendorSlug: item.vendorSlug,
          });
        });
        if (!ignore) setCartItemMap(map);
      } catch {
        // ignore
      }
    };
    fetchCartItems();
    return () => { ignore = true; };
  }, [supabase]);

  // Build filter key
  const filterKey = useMemo(
    () =>
      [searchQuery, subcategoryParam, sortBy, minPriceParam, maxPriceParam, ratingParam, onSaleParam].join("|"),
    [searchQuery, subcategoryParam, sortBy, minPriceParam, maxPriceParam, ratingParam, onSaleParam]
  );
  const lastFilterRef = useRef(filterKey);
  const lastPageRef = useRef(page);

  // Fetch products scoped to this category + subcategories
  useEffect(() => {
    let ignore = false;

    const fetchProducts = async () => {
      if (!allCategoryIds.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

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

        // Determine which category IDs to query
        let queryCategoryIds = allCategoryIds;
        if (selectedSubcategories.length > 0) {
          queryCategoryIds = selectedSubcategories;
        }

        // Pre-fetch product IDs from product_categories
        const { data: catRows } = await supabase
          .from("product_categories")
          .select("product_id")
          .in("category_id", queryCategoryIds);
        const categoryProductIds = new Set(
          (catRows || []).map((r) => r.product_id).filter(Boolean)
        );

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
            sale_price,
            sale_starts_at,
            sale_ends_at,
            product_categories (category_id),
            vendor:vendors!inner(
              id,
              slug,
              business_name,
              verified,
              shop_status
            )
          `,
            { count: "exact" }
          )
          .eq("status", "approved")
          .eq("active", true)
          .eq("vendor.verified", true)
          .eq("vendor.shop_status", "active")
          .gt("stock_qty", 0);

        // Category scope: products whose category_id matches OR that appear in product_categories
        const catIds = queryCategoryIds.join(",");
        if (categoryProductIds.size > 0) {
          const pcIds = [...categoryProductIds].join(",");
          query = query.or(`category_id.in.(${catIds}),id.in.(${pcIds})`);
        } else {
          query = query.in("category_id", queryCategoryIds);
        }

        if (onSaleParam === "true") {
          query = query
            .not("sale_price", "is", null)
            .gt("sale_price", 0)
            .lte("sale_starts_at", new Date().toISOString())
            .gte("sale_ends_at", new Date().toISOString());
        }

        if (searchQuery && searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery.trim()}%`);
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
    return () => { ignore = true; };
  }, [
    supabase,
    page,
    pageSize,
    filterKey,
    searchQuery,
    subcategoryParam,
    sortBy,
    minPriceParam,
    maxPriceParam,
    ratingParam,
    onSaleParam,
    allCategoryIds,
    selectedSubcategories,
    setPageParam,
  ]);

  // Fetch registry items
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

  useEffect(() => { fetchRegistryItems(); }, [fetchRegistryItems]);

  useEffect(() => {
    const handler = () => fetchRegistryItems();
    window.addEventListener("registry-item-updated", handler);
    return () => window.removeEventListener("registry-item-updated", handler);
  }, [fetchRegistryItems]);

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

  const applyFilters = useCallback(async () => {
    setMinPriceParam(priceRange.min || "");
    setMaxPriceParam(priceRange.max || "");
    setPageParam("1");
  }, [priceRange, setMinPriceParam, setMaxPriceParam, setPageParam]);

  // Product detail
  const openProductDetail = useCallback((product) => {
    setSelectedProduct(product);
    setProductDetailOpen(true);
  }, []);
  const closeProductDetail = useCallback(() => {
    setProductDetailOpen(false);
    setSelectedProduct(null);
  }, []);

  // Add to registry
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
  const closeAddToRegistry = useCallback(() => {
    setAddToRegistryOpen(false);
    setAddToRegistryProduct(null);
  }, []);

  // Add to cart
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
        setCartItemMap((prev) => {
          const next = new Map(prev);
          const cartItemId = body?.items?.[body.items.length - 1]?.id || `temp-${product.id}`;
          next.set(product.id, { cartItemId, cartId: body?.cart?.id, vendorSlug: product.vendor.slug });
          return next;
        });
        toast.success(`${product.name} added to cart`);
      } catch {
        toast.error("Failed to add to cart");
      } finally {
        setAddingToCartId(null);
      }
    },
    [cartItemMap]
  );

  // Remove from cart
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
        toast.success("Removed from cart");
      } catch {
        toast.error("Failed to remove from cart");
      } finally {
        setRemovingFromCartId(null);
      }
    },
    [cartItemMap]
  );

  const isInCart = useCallback((productId) => cartItemMap.has(productId), [cartItemMap]);

  // Buy now
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
        router.push(`/storefront/${product.vendor.slug}/checkout?cart=1`);
      } catch {
        toast.error("Failed to process purchase");
      } finally {
        setBuyingProductId(null);
      }
    },
    [router]
  );

  // Subcategory toggles (used as category filter within this page)
  const toggleCategory = useCallback(
    (catId) => {
      const current = subcategoryParam ? subcategoryParam.split(",").filter(Boolean) : [];
      const next = current.includes(catId)
        ? current.filter((id) => id !== catId)
        : [...current, catId];
      setSubcategoryParam(next.length > 0 ? next.join(",") : "");
      setPageParam("1");
    },
    [subcategoryParam, setSubcategoryParam, setPageParam]
  );

  const toggleParentCategory = useCallback(
    (parentId, childIds = []) => {
      const current = subcategoryParam ? subcategoryParam.split(",").filter(Boolean) : [];
      const allIds = [parentId, ...childIds];
      const allSelected = allIds.every((id) => current.includes(id));
      let next;
      if (allSelected) {
        next = current.filter((id) => !allIds.includes(id));
      } else {
        const set = new Set([...current, ...allIds]);
        next = [...set];
      }
      setSubcategoryParam(next.length > 0 ? next.join(",") : "");
      setPageParam("1");
    },
    [subcategoryParam, setSubcategoryParam, setPageParam]
  );

  const setAndApplyPriceRange = useCallback(
    ({ min, max }) => {
      const minStr = min > 0 ? String(min) : "";
      const maxStr = max < 10000 ? String(max) : "";
      setPriceRange({ min: minStr, max: maxStr });
      setMinPriceParam(minStr);
      setMaxPriceParam(maxStr);
      setPageParam("1");
    },
    [setMinPriceParam, setMaxPriceParam, setPageParam]
  );

  const cartCount = cartItemMap.size;
  const cartCheckoutUrl = useMemo(() => {
    if (cartItemMap.size === 0) return null;
    for (const entry of cartItemMap.values()) {
      if (entry.vendorSlug) return `/storefront/${entry.vendorSlug}/checkout?cart=1`;
    }
    return null;
  }, [cartItemMap]);

  const isProductInRegistry = useCallback(
    (productId) => registryItems.some((item) => item.product_id === productId),
    [registryItems]
  );

  const getRegistryItem = useCallback(
    (productId) => registryItems.find((item) => item.product_id === productId),
    [registryItems]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchParam("");
    setSubcategoryParam("");
    setSortParam("newest");
    setMinPriceParam("");
    setMaxPriceParam("");
    setRatingParam("");
    setOnSaleParam("");
    setPageParam("1");
    setPriceRange({ min: "", max: "" });
  }, [
    setSearchParam, setSubcategoryParam, setSortParam,
    setMinPriceParam, setMaxPriceParam, setRatingParam, setOnSaleParam, setPageParam,
  ]);

  const setSearchQuery = useCallback(
    (value) => { setSearchParam(value || ""); setPageParam("1"); },
    [setSearchParam, setPageParam]
  );

  const setSortBy = useCallback(
    (value) => { setSortParam(value || "newest"); setPageParam("1"); },
    [setSortParam, setPageParam]
  );

  const setRatingFilter = useCallback(
    (value) => { setRatingParam(value || ""); setPageParam("1"); },
    [setRatingParam, setPageParam]
  );

  const setOnSaleFilter = useCallback(
    (value) => { setOnSaleParam(value ? "true" : ""); setPageParam("1"); },
    [setOnSaleParam, setPageParam]
  );

  const hasActiveFilters =
    searchQuery ||
    selectedSubcategories.length > 0 ||
    priceRange.min ||
    priceRange.max ||
    ratingParam ||
    onSaleParam === "true";

  const value = useMemo(
    () => ({
      // Category info
      category,
      subcategories: subcategories || [],

      // Products
      products,
      loading,
      totalPages,
      page,
      setPage,

      // Filters
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      priceRange,
      setPriceRange,
      applyFilters,
      clearFilters,
      hasActiveFilters,
      ratingFilter: ratingParam,
      setRatingFilter,
      onSaleFilter: onSaleParam === "true",
      setOnSaleFilter,

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
      closeAddToRegistry,

      // Cart actions
      addToCart,
      buyNow,
      removeFromCart,
      isInCart,
      addingToCartId,
      buyingProductId,
      removingFromCartId,
      cartCount,
      cartCheckoutUrl,

      // Subcategory multi-select (uses same interface as shop's category filter)
      selectedCategories: selectedSubcategories,
      toggleCategory,
      toggleParentCategory,
      categories: subcategories || [],

      // Price slider
      setAndApplyPriceRange,
    }),
    [
      category, subcategories,
      products, loading, totalPages, page, setPage,
      searchQuery, sortBy, priceRange,
      applyFilters, clearFilters, hasActiveFilters,
      ratingParam, setRatingFilter, onSaleParam, setOnSaleFilter,
      registry, hostProfile, registryItems, isProductInRegistry, getRegistryItem,
      selectedProduct, productDetailOpen, openProductDetail, closeProductDetail,
      addToRegistryOpen, addToRegistryProduct, openAddToRegistry, closeAddToRegistry,
      addToCart, buyNow, removeFromCart, isInCart,
      addingToCartId, buyingProductId, removingFromCartId,
      cartCount, cartCheckoutUrl,
      selectedSubcategories, toggleCategory, toggleParentCategory,
      setAndApplyPriceRange, cartItemMap,
    ]
  );

  return (
    <CategoryShopContext.Provider value={value}>
      <ShopContext.Provider value={value}>
        {children}
      </ShopContext.Provider>
    </CategoryShopContext.Provider>
  );
}

export function useCategoryShop() {
  const ctx = useContext(CategoryShopContext);
  if (!ctx) {
    throw new Error("useCategoryShop must be used within CategoryShopProvider");
  }
  return ctx;
}
