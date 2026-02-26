"use client";
import React, {
  useState,
  useCallback,
  useActionState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Minus,
  Plus,
  CreditCard,
  Truck,
  MapPin,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Gift,
} from "lucide-react";
import { getAramexRateQuote, processStorefrontCheckout } from "./actions";
import { getGuestIdentifier } from "../../../utils/guest";
import { getDeviceFingerprint } from "../../../utils/fingerprint";
import { computeShipmentWeight } from "../../../utils/shipping/weights";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";


const formatPrice = (value) => {
  if (value === null || value === undefined) return "GHS 0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS 0.00";
  return `GHS ${num.toFixed(2)}`;
};

export default function CheckoutContent({
  vendor,
  product,
  initialQuantity,
  selectedVariation,
  cartMode = false,
  registryId = null,
  userProfile = null,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [shippingRegions, setShippingRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [zonesState, setZonesState] = useState({
    loading: true,
    error: null,
  });
  const [shippingQuote, setShippingQuote] = useState({
    amount: null,
    loading: false,
    error: null,
  });
  const [guestBrowserId, setGuestBrowserId] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState({
    applied: false,
    loading: false,
    error: null,
    promo: null,
    discount: null,
    discountedSubtotal: null,
    discountedGiftWrapFee: null,
  });
  const [cartState, setCartState] = useState({
    items: [],
    subtotal: 0,
    registryId: null,
    loading: false,
    error: null,
  });
  const [cartActionState, setCartActionState] = useState({
    loading: false,
    itemId: null,
    error: null,
  });
  const [giftWrapOptions, setGiftWrapOptions] = useState([]);
  const [giftWrapState, setGiftWrapState] = useState({
    loading: false,
    error: null,
  });
  const [selectedGiftWrapOptionId, setSelectedGiftWrapOptionId] = useState("");
  const [formData, setFormData] = useState({
    firstName: userProfile?.firstname || "",
    lastName: userProfile?.lastname || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    address: userProfile?.address_street || "",
    city: userProfile?.address_city || "",
    digitalAddress: userProfile?.digital_address || "",
    notes: "",
  });
  const [availableCities, setAvailableCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [registryShipping, setRegistryShipping] = useState(null);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";
  const basePrice = Number(product?.rawPrice ?? product?.basePrice);
  const serviceCharge = Number(product?.serviceCharge || 0);
  const variationPrice = Number(selectedVariation?.price);
  const unitPrice = Number.isFinite(variationPrice)
    ? variationPrice + serviceCharge
    : Number.isFinite(basePrice)
      ? basePrice
      : 0;
  const cartItems = useMemo(
    () => (cartMode ? cartState.items : []),
    [cartMode, cartState.items],
  );
  const giftWrapOptionMap = useMemo(() => {
    const map = new Map();
    (giftWrapOptions || []).forEach((option) => {
      if (option?.id) map.set(option.id, option);
    });
    return map;
  }, [giftWrapOptions]);
  const giftWrapFee = useMemo(() => {
    if (cartMode) {
      return cartItems.reduce((sum, item) => {
        const option = giftWrapOptionMap.get(item?.gift_wrap_option_id);
        const fee = Number(option?.fee || 0);
        return sum + fee * (item?.quantity || 0);
      }, 0);
    }
    if (!selectedGiftWrapOptionId) return 0;
    const option = giftWrapOptionMap.get(selectedGiftWrapOptionId);
    const fee = Number(option?.fee || 0);
    return fee * quantity;
  }, [
    cartMode,
    cartItems,
    giftWrapOptionMap,
    selectedGiftWrapOptionId,
    quantity,
  ]);
  const cartSubtotal = Number(cartState.subtotal) || 0;
  const subtotal = cartMode ? cartSubtotal : unitPrice * quantity;
  const hasShippableItems = useMemo(() => {
    if (cartMode) {
      return cartItems.some((i) => i.product?.is_shippable !== false);
    }
    return product?.is_shippable !== false;
  }, [cartMode, cartItems, product?.is_shippable]);

  const fallbackShippingFee = Number(selectedRegion?.fee) || 0;
  const rawShippingFee = Number.isFinite(shippingQuote.amount)
    ? shippingQuote.amount
    : fallbackShippingFee;
  const shippingFee = hasShippableItems ? rawShippingFee : 0;
  const selectedRegionName = selectedRegion?.name || "";
  const promoDiscount = promoState.applied
    ? Number(promoState.discount?.totalDiscount || 0)
    : 0;
  const discountedSubtotal =
    promoState.applied && Number.isFinite(promoState.discountedSubtotal)
      ? Number(promoState.discountedSubtotal)
      : subtotal;
  const discountedGiftWrapFee =
    promoState.applied && Number.isFinite(promoState.discountedGiftWrapFee)
      ? Number(promoState.discountedGiftWrapFee)
      : giftWrapFee;

  const [state, formAction, isPending] = useActionState(
    processStorefrontCheckout,
    { success: false, error: null },
  );

  const effectiveStock = useMemo(() => {
    if (selectedVariation && selectedVariation.stock_qty != null) {
      return Number(selectedVariation.stock_qty);
    }
    return Number(product?.stock ?? 0);
  }, [selectedVariation, product?.stock]);

  const handleQuantityChange = useCallback(
    (delta) => {
      setQuantity((prev) => {
        const next = prev + delta;
        if (next < 1) return 1;
        if (effectiveStock > 0 && next > effectiveStock) return effectiveStock;
        return next;
      });
    },
    [effectiveStock],
  );

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const resolveSelectedRegion = useCallback((regions, current) => {
    if (!Array.isArray(regions) || regions.length === 0) return current || null;
    if (current?.id) {
      const match = regions.find((region) => region.id === current.id);
      if (match) return match;
    }
    if (current?.name) {
      const match = regions.find((region) => region.name === current.name);
      if (match) return match;
    }
    return regions[0];
  }, []);

  const handleRegionChange = useCallback(
    (e) => {
      const region = shippingRegions.find((r) => r.id === e.target.value);
      if (region) {
        setSelectedRegion(region);
      }
    },
    [shippingRegions]
  );

  useEffect(() => {
    let active = true;
    const loadZones = async () => {
      const countryCode = vendor?.address_country || "GH";
      setZonesState({ loading: true, error: null });
      try {
        const response = await fetch(
          `/api/shipping/aramex/zones?country=${encodeURIComponent(countryCode)}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.details ||
              payload?.error ||
              "Failed to load shipping zones.",
          );
        }
        const zones = Array.isArray(payload?.zones) ? payload.zones : [];
        if (active && zones.length > 0) {
          setShippingRegions(zones);
          setSelectedRegion((prev) => {
            if (prev) return resolveSelectedRegion(zones, prev);
            if (userProfile?.address_state) {
              const match = zones.find(
                (z) =>
                  z.name.toLowerCase() ===
                  userProfile.address_state.toLowerCase(),
              );
              if (match) return match;
            }
            return zones[0];
          });
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
  }, [resolveSelectedRegion, vendor?.address_country, userProfile?.address_state]);

  // Load cities when selected region changes
  useEffect(() => {
    if (!selectedRegion?.name) {
      setAvailableCities([]);
      setFormData((prev) => ({ ...prev, city: "" }));
      return;
    }
    let cancelled = false;
    const loadCities = async () => {
      setCitiesLoading(true);
      try {
        const stateCode = selectedRegion.aramex_code || selectedRegion.name || "";
        const response = await fetch(
          `/api/shipping/cities?country=GH&stateCode=${encodeURIComponent(stateCode)}`,
        );
        const data = await response.json();
        if (!cancelled) {
          if (data.success && data.cities && data.cities.length > 0) {
            setAvailableCities(data.cities);
            setFormData((prev) =>
              data.cities.includes(prev.city) ? prev : { ...prev, city: "" },
            );
          } else {
            setAvailableCities([]);
            setFormData((prev) => ({ ...prev, city: "" }));
          }
        }
      } catch (error) {
        console.error("Failed to load cities:", error);
        if (!cancelled) {
          setAvailableCities([]);
          setFormData((prev) => ({ ...prev, city: "" }));
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };
    loadCities();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion?.id, selectedRegion?.aramex_code, selectedRegion?.name]);

  useEffect(() => {
    if (!cartMode) return;
    let active = true;
    const resolveGuestId = async () => {
      const id = await getGuestIdentifier();
      if (active && id) setGuestBrowserId(id);
    };
    const resolveFingerprint = async () => {
      const fp = await getDeviceFingerprint();
      if (active && fp) setDeviceFingerprint(fp);
    };
    resolveGuestId();
    resolveFingerprint();
    return () => {
      active = false;
    };
  }, [cartMode]);

  useEffect(() => {
    const codeParam = searchParams.get("promo") || "";
    if (!codeParam) return;
    setPromoCode(codeParam);
  }, [searchParams]);

  const resetPromoState = useCallback(() => {
    setPromoState({
      applied: false,
      loading: false,
      error: null,
      promo: null,
      discount: null,
      discountedSubtotal: null,
      discountedGiftWrapFee: null,
    });
  }, []);

  const lastCartDepsRef = useRef({
    subtotal: cartState.subtotal,
    giftWrapFee,
    quantity,
    selectedGiftWrapOptionId,
  });
  useEffect(() => {
    const prev = lastCartDepsRef.current;
    const changed =
      prev.subtotal !== cartState.subtotal ||
      prev.giftWrapFee !== giftWrapFee ||
      prev.quantity !== quantity ||
      prev.selectedGiftWrapOptionId !== selectedGiftWrapOptionId;
    lastCartDepsRef.current = {
      subtotal: cartState.subtotal,
      giftWrapFee,
      quantity,
      selectedGiftWrapOptionId,
    };
    if (changed && promoState.applied) {
      resetPromoState();
    }
  }, [
    cartMode,
    cartState.subtotal,
    giftWrapFee,
    quantity,
    selectedGiftWrapOptionId,
    resetPromoState,
    promoState.applied,
  ]);

  useEffect(() => {
    let active = true;
    const loadGiftWrapOptions = async () => {
      setGiftWrapState({ loading: true, error: null });
      try {
        const response = await fetch("/api/gift-wrap-options");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message || "Failed to load gift wrap options.",
          );
        }
        if (!active) return;
        setGiftWrapOptions(
          Array.isArray(payload?.options) ? payload.options : [],
        );
        setGiftWrapState({ loading: false, error: null });
      } catch (error) {
        if (!active) return;
        setGiftWrapState({
          loading: false,
          error: error?.message || "Failed to load gift wrap options.",
        });
      }
    };

    loadGiftWrapOptions();
    return () => {
      active = false;
    };
  }, []);

  const fetchCart = useCallback(
    async (shouldAbort) => {
      if (!cartMode) return;
      // Registry carts are fetched by registry_id; storefront carts by vendor_slug
      if (!registryId && !vendor?.slug) return;
      setCartState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const url = new URL("/api/storefront/cart", window.location.origin);
        if (registryId) {
          url.searchParams.set("registry_id", registryId);
        } else {
          url.searchParams.set("vendor_slug", vendor.slug);
        }
        if (guestBrowserId) {
          url.searchParams.set("guest_browser_id", guestBrowserId);
        }
        const response = await fetch(url.toString(), { method: "GET" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load cart.");
        }
        if (shouldAbort?.()) return;
        setCartState({
          items: Array.isArray(payload?.items) ? payload.items : [],
          subtotal: Number(payload?.subtotal) || 0,
          registryId: payload?.cart?.registry_id || registryId || null,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (shouldAbort?.()) return;
        setCartState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || "Failed to load cart.",
        }));
      }
    },
    [cartMode, vendor?.slug, registryId, guestBrowserId],
  );

  useEffect(() => {
    if (!cartMode) return;
    if (!registryId && !vendor?.slug) return;
    let cancelled = false;
    fetchCart(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [cartMode, vendor?.slug, registryId, guestBrowserId, fetchCart]);

  // Fetch registry shipping data when a registry cart is detected
  const isRegistryCart = Boolean(cartState.registryId);
  useEffect(() => {
    if (!isRegistryCart || registryShipping) return;
    let cancelled = false;
    const loadRegistryShipping = async () => {
      setRegistryLoading(true);
      try {
        const response = await fetch(
          `/api/registry/shipping?registry_id=${encodeURIComponent(cartState.registryId)}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message || "Failed to load registry shipping.",
          );
        }
        if (cancelled) return;
        setRegistryShipping(payload);
        // Pre-fill shipping form with host's delivery address
        const addr = payload?.shippingAddress;
        if (addr) {
          setFormData((prev) => ({
            ...prev,
            address: addr.streetAddress || prev.address,
            city: addr.city || prev.city,
            digitalAddress: addr.digitalAddress || prev.digitalAddress,
          }));
          // Match the region from the host's address
          const state = (addr.stateProvince || "").toLowerCase();
          const city = (addr.city || "").toLowerCase();
          const combined = `${city} ${state}`.trim();
          if (combined) {
            setSelectedRegion((prev) => {
              const match = shippingRegions.find((r) => {
                const name = (r.name || "").toLowerCase();
                return combined.includes(name) || name.includes(combined);
              });
              return match || prev;
            });
          }
        }
      } catch (error) {
        console.error("Registry shipping error:", error);
      } finally {
        if (!cancelled) setRegistryLoading(false);
      }
    };
    loadRegistryShipping();
    return () => {
      cancelled = true;
    };
  }, [isRegistryCart, cartState.registryId, registryShipping, shippingRegions]);

  const updateCartItemQuantity = useCallback(
    async (itemId, nextQuantity) => {
      if (!itemId) return;
      setCartActionState({ loading: true, itemId, error: null });
      try {
        const response = await fetch("/api/storefront/cart", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartItemId: itemId,
            quantity: nextQuantity,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to update cart.");
        }
        await fetchCart();
        setCartActionState({ loading: false, itemId: null, error: null });
      } catch (error) {
        setCartActionState({
          loading: false,
          itemId: null,
          error: error?.message || "Failed to update cart.",
        });
      }
    },
    [fetchCart],
  );

  const updateCartItemGiftWrap = useCallback(
    async (itemId, optionId) => {
      if (!itemId) return;
      setCartActionState({ loading: true, itemId, error: null });
      try {
        const response = await fetch("/api/storefront/cart", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartItemId: itemId,
            giftWrapOptionId: optionId || null,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to update gift wrap.");
        }
        await fetchCart();
        setCartActionState({ loading: false, itemId: null, error: null });
      } catch (error) {
        setCartActionState({
          loading: false,
          itemId: null,
          error: error?.message || "Failed to update gift wrap.",
        });
      }
    },
    [fetchCart],
  );

  const handleRemoveItem = useCallback(
    (itemId) => {
      updateCartItemQuantity(itemId, 0);
    },
    [updateCartItemQuantity],
  );

  const totalPieces = useMemo(() => {
    if (cartMode) {
      return cartItems.reduce(
        (sum, item) => sum + (Number(item?.quantity) || 0),
        0,
      );
    }
    return quantity;
  }, [cartMode, cartItems, quantity]);
  const totalWeight = useMemo(() => {
    if (cartMode) {
      const shippable = cartItems.filter(
        (i) => i.product?.is_shippable !== false,
      );
      return computeShipmentWeight(shippable);
    }
    if (product?.is_shippable === false) return 0;
    return computeShipmentWeight([
      {
        quantity,
        weight_kg: product?.weightKg ?? product?.weight_kg,
      },
    ]);
  }, [
    cartMode,
    cartItems,
    product?.is_shippable,
    product?.weightKg,
    product?.weight_kg,
    quantity,
  ]);
  const handlePromoInputChange = useCallback(
    (event) => {
      const value = event.target.value;
      setPromoCode(value);
      if (promoState.applied) {
        resetPromoState();
      }
    },
    [promoState.applied, resetPromoState],
  );
  const cartHasItems = cartItems.length > 0;
  const cartLoading = cartMode && cartState.loading;
  const cartUpdating = cartMode && cartActionState.loading;

  // Form validation - check if all required fields are filled
  const isFormValid = useMemo(() => {
    // Personal info always required
    const personalInfoValid = 
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.phone.trim();

    // Shipping info required only if there are shippable items
    const shippingInfoValid = !hasShippableItems || (
      selectedRegion?.id &&
      formData.city &&
      formData.address.trim()
    );

    return personalInfoValid && shippingInfoValid;
  }, [formData, selectedRegion, hasShippableItems]);
  const applyPromoCode = useCallback(
    async (overrideCode) => {
      const code = (overrideCode ?? promoCode).trim();
      if (!code) {
        setPromoState((prev) => ({
          ...prev,
          applied: false,
          loading: false,
          error: "Enter a promo code.",
        }));
        return;
      }

      setPromoState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const payload = {
          code,
          vendorId: vendor?.id,
          cartMode,
          guestBrowserId: guestBrowserId || null,
          deviceFingerprint: deviceFingerprint || null,
        };

        if (!cartMode) {
          payload.productId = product?.id;
          payload.quantity = quantity;
          payload.unitPrice = unitPrice;
          payload.giftWrapOptionId = selectedGiftWrapOptionId || null;
        }

        const response = await fetch("/api/promos/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.valid) {
          throw new Error(data?.error || "Promo code is invalid.");
        }

        setPromoState({
          applied: true,
          loading: false,
          error: null,
          promo: data.promo || null,
          discount: data.discount || null,
          discountedSubtotal: Number(data.discountedSubtotal) || 0,
          discountedGiftWrapFee: Number(data.discountedGiftWrapFee) || 0,
        });
      } catch (error) {
        setPromoState({
          applied: false,
          loading: false,
          error: error?.message || "Promo code is invalid.",
          promo: null,
          discount: null,
          discountedSubtotal: null,
          discountedGiftWrapFee: null,
        });
      }
    },
    [
      promoCode,
      vendor?.id,
      cartMode,
      guestBrowserId,
      deviceFingerprint,
      product?.id,
      quantity,
      unitPrice,
      selectedGiftWrapOptionId,
    ],
  );

  useEffect(() => {
    const codeParam = searchParams.get("promo") || "";
    if (!codeParam || promoState.applied || promoState.loading) return;
    if (cartMode && (cartLoading || cartUpdating)) return;
    if (!cartMode && !product?.id) return;
    applyPromoCode(codeParam);
  }, [
    searchParams,
    promoState.applied,
    promoState.loading,
    cartMode,
    cartLoading,
    cartUpdating,
    product?.id,
    applyPromoCode,
  ]);
  const originAddress = useMemo(
    () => ({
      line1: vendor?.address_street || "",
      line2: vendor?.digital_address || "",
      city: vendor?.address_city || "",
      state: vendor?.address_state || "",
      postalCode: "",
      countryCode: vendor?.address_country || "GH",
    }),
    [vendor],
  );
  const destinationAddress = useMemo(
    () => ({
      line1: formData.address || "",
      line2: formData.digitalAddress || "",
      city: formData.city || "",
      state: selectedRegion?.aramex_code || selectedRegion?.name || formData.region || "",
      postalCode: "",
      countryCode: vendor?.address_country || "GH",
    }),
    [
      formData.address,
      formData.city,
      formData.digitalAddress,
      selectedRegion?.aramex_code,
      formData.region,
      selectedRegion?.name,
      vendor?.address_country,
    ],
  );
  useEffect(() => {
    if (cartMode && (cartLoading || cartUpdating)) return;
    if (!originAddress.line1 || !originAddress.city) return;
    if (
      !destinationAddress.line1 ||
      !destinationAddress.city ||
      !destinationAddress.state
    ) {
      setShippingQuote((prev) => ({ ...prev, amount: null, error: null }));
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setShippingQuote({ amount: null, loading: true, error: null });
      try {
        const payload = await getAramexRateQuote({
          origin: originAddress,
          destination: destinationAddress,
          shipment: {
            weight: Math.max(1, totalWeight || totalPieces || 1),
            numberOfPieces: Math.max(1, totalPieces || 1),
            goodsValue: subtotal,
            currency: "GHS",
          },
        });
        if (!payload?.success) {
          throw new Error(
            payload?.error ||
              payload?.details ||
              "Failed to fetch shipping rate.",
          );
        }
        if (!cancelled) {
          setShippingQuote({
            amount: Number(payload?.amount) || null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setShippingQuote({
            amount: null,
            loading: false,
            error: error?.message || "Failed to fetch shipping rate.",
          });
        }
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    cartMode,
    cartLoading,
    cartUpdating,
    originAddress,
    destinationAddress,
    subtotal,
    totalWeight,
    totalPieces,
  ]);
  const total = discountedSubtotal + shippingFee + discountedGiftWrapFee;

  if (state.success && state.checkoutUrl) {
    const callbackParams = new URLSearchParams();
    if (state?.token) callbackParams.set("token", state.token);
    if (state?.orderCode) callbackParams.set("order-id", state.orderCode);
    const callbackHref = `/storefront/${vendor?.slug}/checkout/callback?${callbackParams.toString()}`;
    const payableAmount = Number(state?.payableAmount);
    const amountToPay = Number.isFinite(payableAmount) ? payableAmount : total;

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 pt-24">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-3xl w-full text-center">
          <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Created!
          </h1>
          <p className="text-gray-600 mb-4">
            Continue to ExpressPay in a secure browser tab to complete your payment.
          </p>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F8F4E7] px-4 py-2 border border-[#E9DFC0]">
            <span className="text-xs uppercase tracking-wide text-[#7A6A35] font-semibold">
              Amount to pay
            </span>
            <span className="text-sm font-bold text-[#A5914B]">
              {formatPrice(amountToPay)}
            </span>
          </div>
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            Some browsers block embedded payment windows for security reasons.
            Use the button below to continue directly on ExpressPay.
          </div>
          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <Link
              href={state.checkoutUrl}
              className="inline-block w-full bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors"
            >
              Continue to secure payment
            </Link>
            <Link
              href={state.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Open payment in new tab
            </Link>
            <Link
              href={callbackHref}
              className="inline-block w-full bg-[#111827] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#1F2937] transition-colors"
            >
              Check payment status
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Order Reference: {state.orderCode}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950 font-brasley-medium w-full">
      <div className="mx-auto max-w-6xl w-full py-6 px-4 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={
              cartMode
                ? `/storefront/${vendor.slug}`
                : `/storefront/${vendor.slug}/${product?.id}`
            }
            className="flex items-center gap-2 text-gray-600 hover:text-[#A5914B] transition-colors"
          >
            <ChevronLeft className="size-5" />
            <span className="text-sm font-medium">
              {cartMode ? "Back to Store" : "Back to Product"}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-green-600" />
            <span className="text-sm text-gray-600">Secure Checkout</span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
          Checkout
        </h1>

        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Form */}
          <div className="lg:w-2/3 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="size-5 text-[#A5914B]" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Mail className="size-4 inline mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Phone className="size-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
                    placeholder="0244123456"
                  />
                </div>
              </div>
            </div>

            {/* Registry info banner */}
            {isRegistryCart && registryShipping && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-3">
                <MapPin className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Registry Gift for {registryShipping.hostName || "the host"}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Shipping to the host&apos;s delivery address. These fields
                    cannot be changed.
                  </p>
                </div>
              </div>
            )}

            {/* Gift Message (registry carts only) */}
            {isRegistryCart && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="size-5 text-[#A5914B]" />
                  Gift Message (Optional)
                </h2>
                <textarea
                  name="giftMessage"
                  rows={3}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors resize-none"
                  placeholder="Add a personal message for the host..."
                />
              </div>
            )}

            {/* Shipping Address */}
            {!hasShippableItems ? (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-3">
                <Gift className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    No Shipping Required
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Your order contains only non-shippable items. No shipping
                    address or fee is needed.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="size-5 text-[#A5914B]" />
                    Shipping Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="region"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Region *
                      </label>
                      <Select
                        value={selectedRegion?.id || ""}
                        onValueChange={(value) => {
                          const region = shippingRegions.find((r) => r.id === value);
                          if (region) {
                            setSelectedRegion(region);
                          }
                        }}
                        disabled={
                          isRegistryCart ||
                          zonesState.loading ||
                          shippingRegions.length === 0
                        }
                      >
                        <SelectTrigger 
                          className={`w-full ${
                            isRegistryCart ||
                            zonesState.loading ||
                            shippingRegions.length === 0
                              ? "bg-gray-50 text-gray-600 cursor-not-allowed"
                              : "bg-white"
                          }`}
                        >
                          <SelectValue
                            placeholder={
                              zonesState.loading
                                ? "Loading zones..."
                                : shippingRegions.length === 0
                                  ? "No delivery zones available"
                                  : "Select region"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingRegions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No delivery zones available
                            </div>
                          ) : (
                            shippingRegions.map((region) => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-2">
                        {zonesState.loading
                          ? "Loading delivery zones from Aramex..."
                          : zonesState.error
                            ? zonesState.error
                            : shippingQuote.loading
                              ? "Calculating shipping rate..."
                              : shippingQuote.amount
                                ? `Shipping: ${formatPrice(shippingQuote.amount)} (based on weight & destination)`
                                : shippingQuote.error
                                  ? "Could not calculate rate. Please check your address."
                                  : "Enter your address to calculate shipping."}
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="city"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        City/Town *
                      </label>
                      {citiesLoading ? (
                        <div className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600">
                          Loading cities...
                        </div>
                      ) : (
                        <Select
                          value={formData.city}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, city: value }))
                          }
                          disabled={isRegistryCart || availableCities.length === 0}
                        >
                          <SelectTrigger 
                            className={`w-full ${isRegistryCart || availableCities.length === 0 ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"}`}
                          >
                            <SelectValue placeholder={availableCities.length === 0 ? "Select a region first" : "Select your city"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="address"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Street Address *
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        required
                        readOnly={isRegistryCart}
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none transition-colors ${isRegistryCart ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B]"}`}
                        placeholder="123 Main Street, East Legon"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="digitalAddress"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Ghana Post Digital Address
                      </label>
                      <input
                        type="text"
                        id="digitalAddress"
                        name="digitalAddress"
                        readOnly={isRegistryCart}
                        value={formData.digitalAddress}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none transition-colors ${isRegistryCart ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B]"}`}
                        placeholder="GA-123-4567"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="notes"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Delivery Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        readOnly={isRegistryCart}
                        value={formData.notes}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none transition-colors resize-none ${isRegistryCart ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B]"}`}
                        placeholder="Any special delivery instructions..."
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 flex items-start gap-3">
                  <Truck className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Delivery by Aramex
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Estimated delivery: 2-5 business days depending on your
                      location. You will receive tracking information via email.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>

              {/* Vendor */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                {isRegistryCart ? (
                  <>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-amber-50">
                      <Gift className="size-5 text-[#A5914B]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      Registry Gift Purchase
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                      <ImageWithFallback
                        src={logoSrc}
                        alt={vendor.business_name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                        priority
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {vendor.business_name}
                    </span>
                  </>
                )}
              </div>

              {/* Product / Cart Items */}
              <div className="py-4 border-b border-gray-100 space-y-4">
                {cartMode ? (
                  cartLoading ? (
                    <div className="text-sm text-gray-500">Loading cart...</div>
                  ) : cartState.error ? (
                    <div className="text-sm text-red-600">
                      {cartState.error}
                    </div>
                  ) : cartHasItems ? (
                    <div className="space-y-4">
                      {cartItems.map((item) => {
                        const itemImage =
                          item?.product?.images?.[0] || "/host/toaster.png";
                        const itemName = item?.product?.name || "Product";
                        const itemPrice = Number(item?.price || 0);
                        const itemTotal = itemPrice * (item.quantity || 0);
                        const isUpdating =
                          cartActionState.loading &&
                          cartActionState.itemId === item.id;
                        return (
                          <div key={item.id} className="flex gap-4">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                              <ImageWithFallback
                                src={itemImage}
                                alt={itemName}
                                width={64}
                                height={64}
                                className="object-contain w-full h-full p-1"
                                priority
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {itemName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item?.variation?.label
                                    ? `Variant: ${item.variation.label}`
                                    : ""}
                                </p>
                              </div>
                              {giftWrapOptions.length ? (
                                <div className="space-y-1">
                                  <label className="text-xs text-gray-500">
                                    Gift wrap
                                  </label>
                                  <Select
                                    value={item?.gift_wrap_option_id || ""}
                                    onValueChange={(value) =>
                                      updateCartItemGiftWrap(
                                        item.id,
                                        value,
                                      )
                                    }
                                    disabled={
                                      isUpdating || giftWrapState.loading
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="No gift wrap" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {giftWrapOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {option.name} (+{formatPrice(option.fee)})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : giftWrapState.loading ? (
                                <p className="text-xs text-gray-400">
                                  Loading gift wrap options...
                                </p>
                              ) : giftWrapState.error ? (
                                <p className="text-xs text-red-500">
                                  {giftWrapState.error}
                                </p>
                              ) : null}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center border border-gray-200 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartItemQuantity(
                                        item.id,
                                        (item.quantity || 1) - 1,
                                      )
                                    }
                                    disabled={
                                      isUpdating || (item.quantity || 1) <= 1
                                    }
                                    className="p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="w-8 text-center text-sm font-medium">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartItemQuantity(
                                        item.id,
                                        (item.quantity || 0) + 1,
                                      )
                                    }
                                    disabled={isUpdating}
                                    className="p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  disabled={isUpdating}
                                  className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                                {isUpdating && (
                                  <Loader2 className="size-4 animate-spin text-gray-400" />
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-[#A5914B]">
                              {formatPrice(itemTotal)}
                            </div>
                          </div>
                        );
                      })}
                      {cartActionState.error && (
                        <p className="text-xs text-red-600">
                          {cartActionState.error}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Your cart is empty.
                    </div>
                  )
                ) : (
                  <>
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.name}
                          width={80}
                          height={80}
                          className="object-contain w-full h-full p-1"
                          priority
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-[#A5914B] font-semibold">
                            {formatPrice(unitPrice)}
                          </p>
                          {product?.isOnSale &&
                            product?.originalPrice &&
                            !selectedVariation && (
                              <p className="text-xs text-gray-400 line-through">
                                {product.originalPrice}
                              </p>
                            )}
                        </div>
                        {selectedVariation?.label && (
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedVariation.label}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-gray-600">Quantity:</span>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          className="p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(1)}
                          disabled={quantity >= effectiveStock}
                          className="p-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                    {giftWrapOptions.length ? (
                      <div className="mt-4 space-y-2">
                        <label className="text-sm text-gray-600">
                          Gift wrap
                        </label>
                        <Select
                          value={selectedGiftWrapOptionId}
                          onValueChange={(value) =>
                            setSelectedGiftWrapOptionId(value)
                          }
                          disabled={giftWrapState.loading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No gift wrap" />
                          </SelectTrigger>
                          <SelectContent>
                            {giftWrapOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name} (+{formatPrice(option.fee)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : giftWrapState.loading ? (
                      <p className="mt-3 text-xs text-gray-500">
                        Loading gift wrap options...
                      </p>
                    ) : giftWrapState.error ? (
                      <p className="mt-3 text-xs text-red-500">
                        {giftWrapState.error}
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              {/* Totals */}
              <div className="py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Weight</span>
                  <span className="font-medium">
                    {totalWeight > 0
                      ? `${totalWeight.toFixed(2)} kg`
                      : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {formatPrice(shippingFee)}
                  </span>
                </div>
                {giftWrapFee > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gift wrapping</span>
                    <span className="font-medium">
                      {formatPrice(giftWrapFee)}
                    </span>
                  </div>
                ) : null}
                {promoState.applied && promoDiscount > 0 ? (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Promo ({promoState.promo?.code || promoCode})</span>
                    <span className="font-semibold">
                      -{formatPrice(promoDiscount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-[#A5914B]">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="pb-4 border-b border-gray-100 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Promo code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={handlePromoInputChange}
                    placeholder="Enter promo code"
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#A5914B] focus:ring-2 focus:ring-[#A5914B]/20"
                  />
                  <button
                    type="button"
                    onClick={() => applyPromoCode()}
                    disabled={
                      promoState.loading ||
                      (cartMode && (cartLoading || cartUpdating))
                    }
                    className="rounded-xl border border-[#A5914B] px-4 text-sm font-semibold text-[#A5914B] transition hover:bg-[#A5914B]/10 disabled:opacity-50"
                  >
                    {promoState.loading ? "Applying" : "Apply"}
                  </button>
                </div>
                {promoState.applied ? (
                  <div className="flex items-center justify-between text-xs text-green-700">
                    <span>
                      {promoState.promo?.percent_off ||
                        promoState.discount?.percentOff}
                      % off applied to eligible items
                    </span>
                    <button
                      type="button"
                      onClick={resetPromoState}
                      className="text-[#A5914B] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : promoState.error ? (
                  <p className="text-xs text-red-600">{promoState.error}</p>
                ) : null}
              </div>

              {/* Hidden fields */}
              <input type="hidden" name="vendorId" value={vendor.id} />
              <input type="hidden" name="vendorSlug" value={vendor.slug} />
              {cartMode ? (
                <>
                  <input type="hidden" name="cartMode" value="1" />
                  <input
                    type="hidden"
                    name="guestBrowserId"
                    value={guestBrowserId}
                  />
                  <input type="hidden" name="subtotal" value={subtotal} />
                  <input type="hidden" name="giftWrapFee" value={giftWrapFee} />
                </>
              ) : (
                <>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="quantity" value={quantity} />
                  <input type="hidden" name="subtotal" value={subtotal} />
                  <input
                    type="hidden"
                    name="giftWrapOptionId"
                    value={selectedGiftWrapOptionId}
                  />
                  <input
                    type="hidden"
                    name="variantKey"
                    value={selectedVariation?.key || ""}
                  />
                  <input
                    type="hidden"
                    name="variation"
                    value={
                      selectedVariation?.raw
                        ? JSON.stringify(selectedVariation.raw)
                        : ""
                    }
                  />
                </>
              )}
              <input type="hidden" name="giftWrapFee" value={giftWrapFee} />
              <input type="hidden" name="shippingFee" value={shippingFee} />
              <input
                type="hidden"
                name="shippingRegion"
                value={selectedRegionName}
              />
              <input type="hidden" name="city" value={formData.city || ""} />
              <input
                type="hidden"
                name="hasShippableItems"
                value={hasShippableItems ? "1" : "0"}
              />
              <input
                type="hidden"
                name="deviceFingerprint"
                value={deviceFingerprint}
              />
              <input type="hidden" name="total" value={total} />
              <input
                type="hidden"
                name="promoCode"
                value={promoState.applied ? promoCode : ""}
              />
              {isRegistryCart && (
                <>
                  <input
                    type="hidden"
                    name="registryId"
                    value={cartState.registryId}
                  />
                  <input type="hidden" name="giftMessage" value={giftMessage} />
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isPending ||
                  !isFormValid ||
                  (cartMode && (!cartHasItems || cartLoading || cartUpdating))
                }
                className="cursor-pointer w-full mt-4 bg-primary border border-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-white hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-5" />
                    Pay {formatPrice(total)}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secured by ExpressPay. Your payment information is encrypted.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
