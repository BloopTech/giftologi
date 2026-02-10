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
  getOrCreateGuestBrowserId,
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

const mapProduct = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const vendor = product?.vendor || {};
  const serviceCharge = Number(product?.service_charge || 0);
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
  const variationStats = getVariationPriceStats(variations, serviceCharge);
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
    productCode: product?.product_code || null,
    name: product?.name || "Product",
    image: images[0] || "/host/toaster.png",
    images,
    price: formatPrice(displayPrice),
    rawPrice: displayPrice,
    basePrice: Number.isFinite(baseWithCharge) ? baseWithCharge : null,
    serviceCharge,
    variationPriceRange:
      variationStats.min != null && variationStats.max != null
        ? variationStats
        : null,
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
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState(
    Array.isArray(initialCategories) ? initialCategories : []
  );

  // Registry items state
  const [registryItems, setRegistryItems] = useState([]);

  // Filter states
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
        .select("id, name, slug, parent_category_id")
        .order("name");

      if (ignore || error) return;
      setCategories(Array.isArray(data) ? data : []);
    };

    fetchCategories();

    // Fetch cart product IDs
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

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filterKey = useMemo(
    () =>
      [searchQuery, categoryFilter, sortBy, minPriceParam, maxPriceParam, ratingParam].join(
        "|"
      ),
    [searchQuery, categoryFilter, sortBy, minPriceParam, maxPriceParam, ratingParam]
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
          .eq("vendor.shop_status", "active")
          .gt("stock_qty", 0);

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
        // Update local cart state
        setCartItemMap((prev) => {
          const next = new Map(prev);
          const cartItemId =
            body?.items?.[body.items.length - 1]?.id || `temp-${product.id}`;
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

  // Check if product is in cart
  const isInCart = useCallback(
    (productId) => cartItemMap.has(productId),
    [cartItemMap]
  );

  // Buy now - add to cart then navigate to checkout
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
        router.push(
          `/storefront/${product.vendor.slug}/checkout?cart=1`
        );
      } catch {
        toast.error("Failed to process purchase");
      } finally {
        setBuyingProductId(null);
      }
    },
    [router]
  );

  // Toggle single category in filter
  const toggleCategory = useCallback(
    (catId) => {
      const current = categoryFilter ? categoryFilter.split(",").filter(Boolean) : [];
      const next = current.includes(catId)
        ? current.filter((id) => id !== catId)
        : [...current, catId];
      setCategoryParam(next.length > 0 ? next.join(",") : "");
      setPageParam("1");
    },
    [categoryFilter, setCategoryParam, setPageParam]
  );

  // Toggle parent category (and all its children)
  const toggleParentCategory = useCallback(
    (parentId, childIds = []) => {
      const current = categoryFilter ? categoryFilter.split(",").filter(Boolean) : [];
      const allIds = [parentId, ...childIds];
      const allSelected = allIds.every((id) => current.includes(id));
      let next;
      if (allSelected) {
        next = current.filter((id) => !allIds.includes(id));
      } else {
        const set = new Set([...current, ...allIds]);
        next = [...set];
      }
      setCategoryParam(next.length > 0 ? next.join(",") : "");
      setPageParam("1");
    },
    [categoryFilter, setCategoryParam, setPageParam]
  );

  // Set and apply price range (for slider onValueCommit)
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

  // Cart derived values
  const cartCount = cartItemMap.size;
  const cartCheckoutUrl = useMemo(() => {
    if (cartItemMap.size === 0) return null;
    // Find the first vendor slug from cart items
    for (const entry of cartItemMap.values()) {
      if (entry.vendorSlug) {
        return `/storefront/${entry.vendorSlug}/checkout?cart=1`;
      }
    }
    return null;
  }, [cartItemMap]);

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

  const setSearchQuery = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam]
  );

  const setCategoryFilter = useCallback(
    (value) => {
      if (Array.isArray(value)) {
        setCategoryParam(value.length > 0 ? value.join(",") : "");
      } else {
        setCategoryParam(value === "all" ? "" : value || "");
      }
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

  const setRatingFilter = useCallback(
    (value) => {
      setRatingParam(value || "");
      setPageParam("1");
    },
    [setRatingParam, setPageParam]
  );

  const hasActiveFilters =
    searchQuery ||
    selectedCategories.length > 0 ||
    priceRange.min ||
    priceRange.max ||
    ratingParam;

  const value = useMemo(
    () => ({
      // Products
      products,
      loading,
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
      categories,
      applyFilters,
      clearFilters,
      hasActiveFilters,
      ratingFilter: ratingParam,
      setRatingFilter,

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

      // Multi-category filter
      selectedCategories,
      toggleCategory,
      toggleParentCategory,

      // Price slider
      setAndApplyPriceRange,
    }),

    [
      products,
      loading,
      totalPages,
      page,
      setPage,
      searchQuery,
      categoryFilter,
      sortBy,
      priceRange,
      categories,
      applyFilters,
      clearFilters,
      hasActiveFilters,
      ratingParam,
      setRatingFilter,
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
      closeAddToRegistry,
      addToCart,
      buyNow,
      removeFromCart,
      isInCart,
      addingToCartId,
      buyingProductId,
      removingFromCartId,
      cartCount,
      cartCheckoutUrl,
      selectedCategories,
      toggleCategory,
      toggleParentCategory,
      setAndApplyPriceRange,
      cartItemMap,
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
