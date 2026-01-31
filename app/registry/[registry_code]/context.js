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
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
  const [categories, setCategories] = useState(initialCategories || []);

  const [error, setError] = useState(null);

  const [isLoading, setIsLoading] = useState(
    !initialRegistry && Boolean(registryCode)
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
        shipping_instructions,
        event:events(
          id,
          host_id,
          type,
          title,
          date,
          cover_photo,
          location,
          description,
          street_address,
          street_address_2,
          city,
          state_province,
          postal_code,
          gps_location
        )
      `
      )
      .eq("registry_code", registryCode)
      .maybeSingle();

    if (registryError || !registryData) {
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
          category_id
        )
      `
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
      : eventData
      ? {
          name: hostProfile
            ? `${hostProfile.firstname || ""} ${hostProfile.lastname || ""}`.trim()
            : null,
          streetAddress: eventData.street_address || null,
          streetAddress2: eventData.street_address_2 || null,
          city: eventData.city || null,
          stateProvince: eventData.state_province || null,
          postalCode: eventData.postal_code || null,
          gpsLocation: eventData.gps_location || null,
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

  // ... rest of the code remains the same ...
  // Check for payment callback on mount
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const orderId = searchParams.get("order");

    if (paymentStatus === "success" && orderId) {
      setCompletedOrderId(orderId);
      setPurchaseCompleteOpen(true);
      // Clean up URL
      router.replace(window.location.pathname, { scroll: false });
    } else if (paymentStatus === "failed" || paymentStatus === "pending") {
      setError(
        paymentStatus === "failed"
          ? "Payment was not successful. Please try again."
          : "Payment is pending. You will be notified once confirmed."
      );
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  // Show welcome note on first visit (using sessionStorage)
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem(
      `welcome_seen_${registry?.id}`
    );
    if (!hasSeenWelcome && registry?.id) {
      setWelcomeNoteOpen(true);
      sessionStorage.setItem(`welcome_seen_${registry?.id}`, "true");
    }
  }, [registry?.id]);

  // Open product detail modal
  const openProductDetail = useCallback((product) => {
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setProductDetailOpen(true);
    setPurchaseStep(PURCHASE_STEPS.PRODUCT_DETAIL);
  }, []);

  // Close product detail and reset
  const closeProductDetail = useCallback(() => {
    setProductDetailOpen(false);
    if (purchaseStep === PURCHASE_STEPS.PRODUCT_DETAIL) {
      setPurchaseStep(PURCHASE_STEPS.IDLE);
      setSelectedProduct(null);
    }
  }, [purchaseStep]);

  // Start buy flow for single item
  const startBuyThis = useCallback((product) => {
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setProductDetailOpen(false);
    setGifterInfoOpen(true);
    setPurchaseStep(PURCHASE_STEPS.GIFTER_INFO);
  }, []);

  // Start buy flow for multiple items
  const startBuyMultiple = useCallback((product) => {
    setSelectedProduct(product);
    // For now, default to 1, could show quantity selector
    setPurchaseQuantity(1);
    setProductDetailOpen(false);
    setGifterInfoOpen(true);
    setPurchaseStep(PURCHASE_STEPS.GIFTER_INFO);
  }, []);

  // Handle gifter info submission
  const handleGifterInfoSubmit = useCallback((info) => {
    setGifterInfo(info);
    setGifterInfoOpen(false);
    setAddMessageOpen(true);
    setPurchaseStep(PURCHASE_STEPS.ADD_MESSAGE);
  }, []);

  // Skip gifter info
  const handleGifterInfoSkip = useCallback(() => {
    setGifterInfo(null);
    setGifterInfoOpen(false);
    setAddMessageOpen(true);
    setPurchaseStep(PURCHASE_STEPS.ADD_MESSAGE);
  }, []);

  // Handle message submission and initiate payment
  const handleMessageSubmit = useCallback(
    async (message) => {
      setGiftMessage(message);
      setAddMessageOpen(false);
      setPurchaseStep(PURCHASE_STEPS.PROCESSING);
      setIsProcessing(true);
      setError(null);

      try {
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
            amount: parseFloat(
              selectedProduct?.price?.replace(/[^0-9.]/g, "") || "0"
            ),
            currency: "GHS",
            gifterInfo,
            message,
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
    [registry?.id, selectedProduct, purchaseQuantity, gifterInfo]
  );

  // Skip message and initiate payment
  const handleMessageSkip = useCallback(() => {
    handleMessageSubmit("");
  }, [handleMessageSubmit]);

  // Handle purchase complete actions
  const handleTrackOrder = useCallback(
    (orderId) => {
      setPurchaseCompleteOpen(false);
      // Could navigate to order tracking page
      router.push(`/order/${orderId}`);
    },
    [router]
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
      result = result.filter((p) => p.categoryId === categoryFilter);
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
      ? `${host.firstname}${host.lastname ? ` & ${host.lastname}` : ""}`
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
    ]
  );

  return (
    <GuestRegistryCodeContext.Provider value={value}>
      {children}
    </GuestRegistryCodeContext.Provider>
  );
};

export const useGuestRegistryCodeContext = () =>
  useContext(GuestRegistryCodeContext);