"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient as createSupabaseClient } from "../../utils/supabase/client";

const GuestRegistryCodeContext = createContext();

const GUEST_BROWSER_ID_KEY = "giftologi_guest_browser_id";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

const getOrCreateGuestBrowserId = () => {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(GUEST_BROWSER_ID_KEY);
  if (existing) return existing;

  let nextId;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    nextId = crypto.randomUUID();
  } else {
    nextId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  try {
    window.localStorage.setItem(GUEST_BROWSER_ID_KEY, nextId);
  } catch {
    // ignore storage failures
  }

  return nextId;
};

const getGoogleAnalyticsClientId = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!window.gtag || !GA_MEASUREMENT_ID) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    try {
      window.gtag("get", GA_MEASUREMENT_ID, "client_id", (clientId) => {
        if (!resolved) {
          resolved = true;
          resolve(clientId || null);
        }
      });
    } catch (error) {
      resolved = true;
      resolve(null);
    }

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1000);
  });
};

const getGuestIdentifier = async () => {
  const gaClientId = await getGoogleAnalyticsClientId();
  if (gaClientId) {
    return `ga_${gaClientId}`;
  }
  return getOrCreateGuestBrowserId();
};

const getDerivedShippingRegionId = (shippingAddress, regions) => {
  const city = String(shippingAddress?.city || "").toLowerCase();
  const state = String(shippingAddress?.stateProvince || "").toLowerCase();
  const combined = `${city} ${state}`.trim();
  const source = Array.isArray(regions) && regions.length > 0 ? regions : [];

  if (!combined) return source[0]?.id || "";

  const match = source.find((region) => {
    const name = String(region?.name || "").toLowerCase();
    if (!name) return false;
    return combined.includes(name) || name.includes(combined);
  });

  return match?.id || source[0]?.id || "";
};

// Purchase flow steps
const PURCHASE_STEPS = {
  IDLE: "idle",
  PRODUCT_DETAIL: "product_detail",
  GIFTER_INFO: "gifter_info",
  ADD_MESSAGE: "add_message",
  PROCESSING: "processing",
  COMPLETE: "complete",
};

export const GuestRegistryCodeProvider = ({
  children,
  registryCode,
  registryPrivacy,
  tokenValid,
  initialRegistry,
  initialEvent,
  initialHost,
  initialProducts,
  initialShippingAddress,
  initialCategories,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const formatPrice = useCallback((value) => {
    if (value === null || value === undefined) return "";
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return `GHS ${num.toFixed(2)}`;
  }, []);

  // Registry data
  const [registry, setRegistry] = useState(initialRegistry);
  const [event, setEvent] = useState(initialEvent);
  const [host, setHost] = useState(initialHost);
  const [products, setProducts] = useState(initialProducts || []);
  const [shippingAddress, setShippingAddress] = useState(
    initialShippingAddress,
  );
  const [categories, setCategories] = useState(initialCategories || []);
  const [shippingRegions, setShippingRegions] = useState([]);
  const [zonesState, setZonesState] = useState({
    loading: true,
    error: null,
  });

  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isLoading, setIsLoading] = useState(
    !initialRegistry && Boolean(registryCode),
  );

  const refresh = useCallback(async () => {
    if (!registryCode) return;
    setIsLoading(true);
    setError(null);

    const { data: registryData, error: registryError } = await supabase
      .from("registries")
      .select(
        `
        id,
        title,
        registry_code,
        cover_photo,
        deadline,
        welcome_note,
        category_ids,
        price_range_min,
        price_range_max,
        event:events(
          id,
          host_id,
          type,
          title,
          date,
          cover_photo,
          location,
          description
        )
      `,
      )
      .eq("registry_code", registryCode)
      .maybeSingle();

    if (registryError) {
      console.error("Failed to load registry:", registryError);
      setError(registryError.message || "Unable to load registry.");
      setIsLoading(false);
      return;
    }

    if (!registryData) {
      // Registry exists (server confirmed) but RLS blocked access → access denied
      if (registryPrivacy === "invite-only") {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }
      router.replace("/404");
      setIsLoading(false);
      return;
    }

    const eventData = Array.isArray(registryData.event)
      ? registryData.event[0]
      : registryData.event;

    let hostProfile = null;
    if (eventData?.host_id) {
      const { data } = await supabase
        .from("profiles")
        .select("id, firstname, lastname, email, image")
        .eq("id", eventData.host_id)
        .maybeSingle();
      hostProfile = data;
    }

    const { data: registryItems, error: registryItemsError } = await supabase
      .from("registry_items")
      .select(
        `
        id,
        quantity_needed,
        purchased_qty,
        priority,
        notes,
        color,
        size,
        product:products(
          id,
          name,
          price,
          weight_kg,
          service_charge,
          images,
          vendor_id,
          category_id,
          sale_price,
          sale_starts_at,
          sale_ends_at,
          vendor:vendors(slug),
          product_categories (category_id)
        )
      `,
      )
      .eq("registry_id", registryData.id);

    if (registryItemsError) {
      setError(registryItemsError.message || "Unable to load registry items.");
      setIsLoading(false);
      return;
    }

    // Only fetch categories that are in this registry's denormalized category_ids
    const registryCategoryIds = Array.isArray(registryData.category_ids)
      ? registryData.category_ids.filter(Boolean)
      : [];

    let categoriesData = [];
    if (registryCategoryIds.length > 0) {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .in("id", registryCategoryIds)
        .order("name");
      categoriesData = data || [];
    }

    const productsData = Array.isArray(registryItems)
      ? registryItems.map((item) => {
          const product = item.product || {};
          const images = Array.isArray(product.images) ? product.images : [];
          const relatedCategoryIds = Array.isArray(product.product_categories)
            ? product.product_categories
                .map((entry) => entry?.category_id)
                .filter(Boolean)
            : [];
          const mergedCategoryIds = [
            ...new Set(
              [...relatedCategoryIds, product.category_id].filter(Boolean),
            ),
          ];

          const serviceCharge = Number(product.service_charge || 0);
          const basePrice = Number(product.price);
          const totalPrice = Number.isFinite(basePrice)
            ? basePrice + serviceCharge
            : serviceCharge;

          // Sale pricing
          let onSale = false;
          let effectivePrice = totalPrice;
          const rawSalePrice = Number(product.sale_price);
          if (Number.isFinite(rawSalePrice) && rawSalePrice > 0) {
            const now = Date.now();
            const sStarts = product.sale_starts_at ? new Date(product.sale_starts_at).getTime() : null;
            const sEnds = product.sale_ends_at ? new Date(product.sale_ends_at).getTime() : null;
            const saleActive =
              (!sStarts || (!Number.isNaN(sStarts) && now >= sStarts)) &&
              (!sEnds || (!Number.isNaN(sEnds) && now <= sEnds));
            if (saleActive) {
              onSale = true;
              effectivePrice = rawSalePrice + serviceCharge;
            }
          }
          const discountPercent =
            onSale && totalPrice > 0
              ? Math.round(((totalPrice - effectivePrice) / totalPrice) * 100)
              : 0;

          return {
            id: item.id,
            productId: product.id,
            title: product.name || "Gift item",
            image: images[0] || "/host/toaster.png",
            price: formatPrice(effectivePrice),
            rawPrice: effectivePrice,
            originalPrice: onSale ? formatPrice(totalPrice) : null,
            rawOriginalPrice: onSale ? totalPrice : null,
            isOnSale: onSale,
            discountPercent,
            desired: item.quantity_needed ?? 0,
            purchased: item.purchased_qty ?? 0,
            priority: item.priority || null,
            notes: item.notes || null,
            color: item.color || null,
            size: item.size || null,
            vendorId: product.vendor_id,
            vendorSlug: product.vendor?.slug || null,
            categoryId: product.category_id,
            categoryIds: mergedCategoryIds,
            serviceCharge,
            weightKg: product.weight_kg ?? null,
          };
        })
      : [];

    const { data: deliveryAddress } = await supabase
      .from("delivery_addresses")
      .select("*")
      .eq("registry_id", registryData.id)
      .maybeSingle();

    const shipping = deliveryAddress
      ? {
          name: hostProfile
            ? `${hostProfile.firstname || ""} ${hostProfile.lastname || ""}`.trim()
            : null,
          streetAddress: deliveryAddress.street_address || null,
          streetAddress2: deliveryAddress.street_address_2 || null,
          city: deliveryAddress.city || null,
          stateProvince: deliveryAddress.state_province || null,
          postalCode: deliveryAddress.postal_code || null,
          gpsLocation: deliveryAddress.gps_location || null,
          digitalAddress: deliveryAddress.digital_address || null,
        }
      : null;

    setRegistry(registryData);
    setEvent(eventData || null);
    setHost(hostProfile || null);
    setProducts(productsData);
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    setShippingAddress(shipping);
    setIsLoading(false);
  }, [registryCode, registryPrivacy, supabase, router, formatPrice]);

  useEffect(() => {
    if (initialRegistry) return;
    if (!registryCode) return;
    refresh();
  }, [initialRegistry, registryCode, refresh]);

  useEffect(() => {
    let active = true;
    const loadZones = async () => {
      const countryCode = shippingAddress?.countryCode || "GH";
      setZonesState({ loading: true, error: null });
      try {
        const response = await fetch(
          `/api/shipping/aramex/zones?country=${encodeURIComponent(countryCode)}`
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.details || payload?.error || "Failed to load shipping zones."
          );
        }
        const zones = Array.isArray(payload?.zones) ? payload.zones : [];
        if (active && zones.length > 0) {
          setShippingRegions(zones);
        }
        if (active) {
          setZonesState({ loading: false, error: null });
        }
      } catch (error) {
        if (!active) return;
        setZonesState({
          loading: false,
          error: error?.message || "Failed to load shipping zones.",
        });
      }
    };

    loadZones();

    return () => {
      active = false;
    };
  }, [shippingAddress?.countryCode]);

  // Modal states
  const [welcomeNoteOpen, setWelcomeNoteOpen] = useState(false);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [gifterInfoOpen, setGifterInfoOpen] = useState(false);
  const [addMessageOpen, setAddMessageOpen] = useState(false);
  const [purchaseCompleteOpen, setPurchaseCompleteOpen] = useState(false);

  // Purchase flow state
  const [purchaseStep, setPurchaseStep] = useState(PURCHASE_STEPS.IDLE);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [gifterInfo, setGifterInfo] = useState(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [addingProductId, setAddingProductId] = useState(null);

  // Set of product IDs already in the cart for this registry
  const cartProductIds = useMemo(
    () => new Set(cartItems.map((i) => i.product_id).filter(Boolean)),
    [cartItems],
  );

  // Fetch existing cart for this registry on mount so widget persists across refreshes
  useEffect(() => {
    if (!registry?.id) return;
    let cancelled = false;
    const loadCart = async () => {
      setCartLoading(true);
      try {
        const guestIdentifier = await getGuestIdentifier();
        const url = new URL("/api/storefront/cart", window.location.origin);
        url.searchParams.set("registry_id", registry.id);
        if (guestIdentifier) {
          url.searchParams.set("guest_browser_id", guestIdentifier);
        }
        const response = await fetch(url.toString(), { method: "GET" });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok) {
          const items = Array.isArray(payload?.items) ? payload.items : [];
          setCartItems(items);
          setCartCount(items.reduce((sum, i) => sum + (i.quantity || 0), 0));
        }
      } catch (err) {
        console.error("Failed to load registry cart:", err);
      } finally {
        if (!cancelled) setCartLoading(false);
      }
    };
    loadCart();
    return () => { cancelled = true; };
  }, [registry?.id]);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [hideFullyPurchased, setHideFullyPurchased] = useState(false);

  const derivedDefaultShippingRegionId = useMemo(
    () => getDerivedShippingRegionId(shippingAddress, shippingRegions),
    [shippingAddress, shippingRegions]
  );

  const openProductDetail = useCallback((product) => {
    if (!product) return;
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setProductDetailOpen(true);
  }, []);

  const closeProductDetail = useCallback(() => {
    setProductDetailOpen(false);
    setSelectedProduct(null);
  }, []);

  // Add a product to the guest cart
  const addToCart = useCallback(
    async (product, quantity = 1) => {
      if (!product || !registry?.id) return;
      const productId = product.productId || product.id;

      // Prevent duplicate adds — product already in this registry's cart
      if (cartProductIds.has(productId)) return;
      const vendorSlug = product.vendorSlug;
      const vendorId = product.vendorId;
      if (!vendorSlug && !vendorId) {
        setError("Vendor not found for this gift.");
        return;
      }

      setAddingProductId(productId);
      setError(null);

      try {
        const guestIdentifier = await getGuestIdentifier();
        const response = await fetch("/api/storefront/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId,
            vendorSlug,
            productId,
            registryItemId: product.id,
            registryId: registry.id,
            quantity,
            guestBrowserId: guestIdentifier,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Failed to add item to cart.");
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        setCartItems(items);
        setCartCount(items.reduce((sum, i) => sum + (i.quantity || 0), 0));
      } catch (err) {
        console.error("Add to cart error:", err);
        setError(err.message || "Failed to add item to cart.");
      } finally {
        setAddingProductId(null);
      }
    },
    [registry?.id, cartProductIds],
  );

  const startBuyThis = useCallback(
    (product) => {
      if (!product) return;
      setProductDetailOpen(false);
      addToCart(product, 1);
    },
    [addToCart],
  );

  // Remove a product from the cart by product ID
  const removeFromCart = useCallback(
    async (productId) => {
      if (!productId || !registry?.id) return;

      // Find the cart item for this product
      const cartItem = cartItems.find(
        (item) => item.product_id === productId || item.product?.id === productId
      );
      if (!cartItem?.id) return;

      setAddingProductId(productId);
      setError(null);

      try {
        const response = await fetch("/api/storefront/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartItemId: cartItem.id,
            quantity: 0,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Failed to remove item from cart.");
        }

        // Refresh cart to reflect removal
        const guestIdentifier = await getGuestIdentifier();
        const url = new URL("/api/storefront/cart", window.location.origin);
        url.searchParams.set("registry_id", registry.id);
        if (guestIdentifier) {
          url.searchParams.set("guest_browser_id", guestIdentifier);
        }
        const getResponse = await fetch(url.toString(), { method: "GET" });
        const payload = await getResponse.json().catch(() => ({}));
        if (getResponse.ok) {
          const items = Array.isArray(payload?.items) ? payload.items : [];
          setCartItems(items);
          setCartCount(items.reduce((sum, i) => sum + (i.quantity || 0), 0));
        }
      } catch (err) {
        console.error("Remove from cart error:", err);
        setError(err.message || "Failed to remove item from cart.");
      } finally {
        setAddingProductId(null);
      }
    },
    [registry?.id, cartItems],
  );

  const startBuyMultiple = useCallback(
    (product) => {
      if (!product) return;
      const remaining = Math.max(1, (product.desired || 0) - (product.purchased || 0));
      setProductDetailOpen(false);
      addToCart(product, remaining);
    },
    [addToCart],
  );

  // Navigate to checkout — use first product's vendor slug for the URL,
  // pass registry_id so the checkout fetches the unified registry cart.
  const goToCheckout = useCallback(() => {
    if (cartCount === 0) return;
    // Try registry products first, then fall back to cart items (which include vendor data)
    const vendorSlug =
      products.find((p) => p.vendorSlug)?.vendorSlug ||
      cartItems.find((i) => i.product?.vendor?.slug)?.product?.vendor?.slug;
    if (!vendorSlug) {
      setError("Vendor not found.");
      return;
    }
    router.push(
      `/storefront/${vendorSlug}/checkout?cart=1&registry_id=${encodeURIComponent(registry?.id)}`
    );
  }, [cartCount, products, cartItems, registry?.id, router]);

  const handleGifterInfoSubmit = useCallback((payload) => {
    setGifterInfo(payload || null);
    setGifterInfoOpen(false);
    setAddMessageOpen(true);
  }, []);

  const handleGifterInfoSkip = useCallback(() => {
    setGifterInfo(null);
    setGifterInfoOpen(false);
    setAddMessageOpen(true);
  }, []);

  // Handle message submission and initiate payment
  const handleMessageSubmit = useCallback(
    async (payload) => {
      const message =
        typeof payload === "string" ? payload : payload?.message || "";
      const shippingRegionId =
        typeof payload === "string"
          ? derivedDefaultShippingRegionId
          : payload?.shippingRegionId || derivedDefaultShippingRegionId;
      const promoCode =
        typeof payload === "string" ? "" : payload?.promoCode || "";
      setGiftMessage(message);
      setAddMessageOpen(false);
      setPurchaseStep(PURCHASE_STEPS.PROCESSING);
      setIsProcessing(true);
      setError(null);

      try {
        const guestIdentifier = await getGuestIdentifier();
        const vendorSlug = selectedProduct?.vendorSlug;
        const vendorId = selectedProduct?.vendorId;
        if (!vendorSlug && !vendorId) {
          throw new Error("Vendor not found for this gift.");
        }

        const response = await fetch("/api/storefront/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vendorId,
            vendorSlug,
            productId: selectedProduct?.productId,
            registryItemId: selectedProduct?.id,
            registryId: registry?.id || null,
            quantity: purchaseQuantity,
            guestBrowserId: guestIdentifier,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to add item to cart.");
        }

        const promoParam = promoCode
          ? `&promo=${encodeURIComponent(promoCode)}`
          : "";
        const registryParam = registry?.id
          ? `&registry_id=${encodeURIComponent(registry.id)}`
          : "";
        router.push(`/storefront/${vendorSlug}/checkout?cart=1${registryParam}${promoParam}`);
      } catch (err) {
        console.error("Payment error:", err);
        setError(err.message || "Failed to add item to cart");
        setIsProcessing(false);
        setPurchaseStep(PURCHASE_STEPS.IDLE);
      }
    },
    [selectedProduct, purchaseQuantity, derivedDefaultShippingRegionId, registry?.id, router],
  );

  // Skip message and initiate payment
  const handleMessageSkip = useCallback(
    (payload) => {
      handleMessageSubmit(payload || "");
    },
    [handleMessageSubmit],
  );

  // Handle purchase complete actions
  const handleTrackOrder = useCallback(
    (orderId) => {
      setPurchaseCompleteOpen(false);
      // Could navigate to order tracking page
      router.push(`/order/${orderId}`);
    },
    [router],
  );

  const handleContinueShopping = useCallback(() => {
    setPurchaseCompleteOpen(false);
    setCompletedOrderId(null);
    setSelectedProduct(null);
    setGifterInfo(null);
    setGiftMessage("");
    setPurchaseStep(PURCHASE_STEPS.IDLE);
    // Refresh products to get updated quantities
    router.refresh();
  }, [router]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Apply category filter
    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter((p) => {
        const ids = Array.isArray(p.categoryIds)
          ? p.categoryIds
          : p.categoryId
            ? [p.categoryId]
            : [];
        return ids.includes(categoryFilter);
      });
    }

    // Apply price range filter
    const minVal = priceMin !== "" ? parseFloat(priceMin) : null;
    const maxVal = priceMax !== "" ? parseFloat(priceMax) : null;
    if (minVal !== null && Number.isFinite(minVal)) {
      result = result.filter((p) => (p.rawPrice ?? 0) >= minVal);
    }
    if (maxVal !== null && Number.isFinite(maxVal)) {
      result = result.filter((p) => (p.rawPrice ?? 0) <= maxVal);
    }

    // Apply availability filter — hide fully purchased items
    if (hideFullyPurchased) {
      result = result.filter(
        (p) => (p.desired ?? 0) === 0 || (p.purchased ?? 0) < (p.desired ?? 0)
      );
    }

    // Apply sorting
    if (sortBy === "price_low") {
      result.sort((a, b) => {
        const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, "") || "0");
        const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, "") || "0");
        return priceA - priceB;
      });
    } else if (sortBy === "price_high") {
      result.sort((a, b) => {
        const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, "") || "0");
        const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, "") || "0");
        return priceB - priceA;
      });
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortBy === "available") {
      result.sort((a, b) => {
        const remainingA = (a.desired || 0) - (a.purchased || 0);
        const remainingB = (b.desired || 0) - (b.purchased || 0);
        return remainingB - remainingA;
      });
    }

    return result;
  }, [products, categoryFilter, sortBy, priceMin, priceMax, hideFullyPurchased]);

  // Host display name
  const hostDisplayName = useMemo(() => {
    if (!host) return "";
    return host.firstname
      ? `${host.firstname}${host.lastname ? ` ${host.lastname}` : ""}`
      : host.email || "";
  }, [host]);

  const value = useMemo(
    () => ({
      // Data
      registry,
      event,
      host,
      hostDisplayName,
      products: filteredProducts,
      allProducts: products,
      shippingAddress,
      shippingRegions,
      defaultShippingRegionId: derivedDefaultShippingRegionId,
      zonesState,
      categories,
      refresh,
      isLoading,
      accessDenied,

      // Modal states
      welcomeNoteOpen,
      setWelcomeNoteOpen,
      productDetailOpen,
      setProductDetailOpen,
      gifterInfoOpen,
      setGifterInfoOpen,
      addMessageOpen,
      setAddMessageOpen,
      purchaseCompleteOpen,
      setPurchaseCompleteOpen,

      // Purchase flow
      purchaseStep,
      selectedProduct,
      purchaseQuantity,
      setPurchaseQuantity,
      gifterInfo,
      giftMessage,
      completedOrderId,
      isProcessing,
      error,
      setError,

      // Cart state
      cartItems,
      cartCount,
      cartLoading,
      addingProductId,
      cartProductIds,
      addToCart,
      removeFromCart,
      goToCheckout,

      // Filter states
      categoryFilter,
      setCategoryFilter,
      sortBy,
      setSortBy,
      priceMin,
      setPriceMin,
      priceMax,
      setPriceMax,
      hideFullyPurchased,
      setHideFullyPurchased,

      // Actions
      openProductDetail,
      closeProductDetail,
      startBuyThis,
      startBuyMultiple,
      handleGifterInfoSubmit,
      handleGifterInfoSkip,
      handleMessageSubmit,
      handleMessageSkip,
      handleTrackOrder,
      handleContinueShopping,
    }),
    [
      registry,
      event,
      host,
      hostDisplayName,
      filteredProducts,
      products,
      shippingAddress,
      derivedDefaultShippingRegionId,
      shippingRegions,
      zonesState,
      categories,
      welcomeNoteOpen,
      productDetailOpen,
      gifterInfoOpen,
      addMessageOpen,
      purchaseCompleteOpen,
      purchaseStep,
      selectedProduct,
      purchaseQuantity,
      gifterInfo,
      giftMessage,
      completedOrderId,
      isProcessing,
      error,
      accessDenied,
      cartItems,
      cartCount,
      cartLoading,
      addingProductId,
      cartProductIds,
      addToCart,
      removeFromCart,
      goToCheckout,
      categoryFilter,
      sortBy,
      priceMin,
      priceMax,
      hideFullyPurchased,
      openProductDetail,
      closeProductDetail,
      startBuyThis,
      startBuyMultiple,
      handleGifterInfoSubmit,
      handleGifterInfoSkip,
      handleMessageSubmit,
      handleMessageSkip,
      handleTrackOrder,
      handleContinueShopping,
    ],
  );

  return (
    <GuestRegistryCodeContext.Provider value={value}>
      {children}
    </GuestRegistryCodeContext.Provider>
  );
};

export const useGuestRegistryCodeContext = () =>
  useContext(GuestRegistryCodeContext);
