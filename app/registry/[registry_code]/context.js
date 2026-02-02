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

const SHIPPING_REGIONS = [
  { id: "accra", name: "Greater Accra", fee: 25 },
  { id: "kumasi", name: "Ashanti Region", fee: 35 },
  { id: "takoradi", name: "Western Region", fee: 40 },
  { id: "tamale", name: "Northern Region", fee: 50 },
  { id: "cape_coast", name: "Central Region", fee: 35 },
  { id: "ho", name: "Volta Region", fee: 40 },
  { id: "other", name: "Other Regions", fee: 55 },
];

const DEFAULT_SHIPPING_REGION_ID = SHIPPING_REGIONS[0]?.id || "";

const getShippingRegionById = (regionId) =>
  SHIPPING_REGIONS.find((region) => region.id === regionId) ||
  SHIPPING_REGIONS[0] ||
  null;

const getDerivedShippingRegionId = (shippingAddress) => {
  const city = String(shippingAddress?.city || "").toLowerCase();
  const state = String(shippingAddress?.stateProvince || "").toLowerCase();
  const combined = `${city} ${state}`.trim();

  if (!combined) return DEFAULT_SHIPPING_REGION_ID;

  if (combined.includes("accra") || combined.includes("greater accra")) return "accra";
  if (combined.includes("kumasi") || combined.includes("ashanti")) return "kumasi";
  if (
    combined.includes("takoradi") ||
    combined.includes("western region") ||
    combined.includes("western")
  )
    return "takoradi";
  if (combined.includes("tamale") || combined.includes("northern")) return "tamale";
  if (combined.includes("cape coast") || combined.includes("central")) return "cape_coast";
  if (combined.includes("ho") || combined.includes("volta")) return "ho";

  return "other";
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

  const [error, setError] = useState(null);

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
        product:products(
          id,
          name,
          price,
          images,
          category_id,
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

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

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

          return {
            id: item.id,
            productId: product.id,
            title: product.name || "Gift item",
            image: images[0] || "/host/toaster.png",
            price: formatPrice(product.price),
            rawPrice: product.price,
            desired: item.quantity_needed ?? 0,
            purchased: item.purchased_qty ?? 0,
            categoryId: product.category_id,
            categoryIds: mergedCategoryIds,
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
  }, [registryCode, supabase, router, formatPrice]);

  useEffect(() => {
    if (initialRegistry) return;
    if (!registryCode) return;
    refresh();
  }, [initialRegistry, registryCode, refresh]);

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

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  const derivedDefaultShippingRegionId = useMemo(
    () => getDerivedShippingRegionId(shippingAddress),
    [shippingAddress]
  );

  // Handle message submission and initiate payment
  const handleMessageSubmit = useCallback(
    async (payload) => {
      const message =
        typeof payload === "string" ? payload : payload?.message || "";
      const shippingRegionId =
        typeof payload === "string"
          ? derivedDefaultShippingRegionId
          : payload?.shippingRegionId || derivedDefaultShippingRegionId;
      const shippingRegion = getShippingRegionById(shippingRegionId);

      const unitPrice = Number(selectedProduct?.rawPrice);
      const subtotal = Number.isFinite(unitPrice)
        ? unitPrice * purchaseQuantity
        : 0;
      const shippingFee = Number(shippingRegion?.fee) || 0;
      const totalAmount = subtotal + shippingFee;

      setGiftMessage(message);
      setAddMessageOpen(false);
      setPurchaseStep(PURCHASE_STEPS.PROCESSING);
      setIsProcessing(true);
      setError(null);

      try {
        const guestIdentifier = await getGuestIdentifier();
        const response = await fetch("/api/registry/payment/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registryId: registry?.id,
            registryItemId: selectedProduct?.id,
            productId: selectedProduct?.productId,
            quantity: purchaseQuantity,
            amount: totalAmount,
            currency: "GHS",
            gifterInfo,
            message,
            shippingRegionId,
            guestBrowserId: guestIdentifier,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Payment initialization failed");
        }

        // Redirect to ExpressPay checkout
        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error("Payment error:", err);
        setError(err.message || "Failed to process payment");
        setIsProcessing(false);
        setPurchaseStep(PURCHASE_STEPS.IDLE);
      }
    },
    [registry?.id, selectedProduct, purchaseQuantity, gifterInfo, derivedDefaultShippingRegionId],
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
  }, [products, categoryFilter, sortBy]);

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
      shippingRegions: SHIPPING_REGIONS,
      defaultShippingRegionId: derivedDefaultShippingRegionId,
      categories,
      refresh,
      isLoading,

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

      // Filter states
      categoryFilter,
      setCategoryFilter,
      sortBy,
      setSortBy,

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
      categoryFilter,
      sortBy,
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
