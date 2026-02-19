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
  Store,
  Trash2,
  Gift,
} from "lucide-react";
import { processShopCheckout, getShopAramexRateQuote } from "./actions";
import { getOrCreateGuestBrowserId } from "../../utils/guest";
import { getDeviceFingerprint } from "../../utils/fingerprint";
import { computeShipmentWeight } from "../../utils/shipping/weights";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/Select";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "GHS 0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS 0.00";
  return `GHS ${num.toFixed(2)}`;
};

export default function ShopCheckoutContent({ userProfile = null }) {
  const [shippingRegions, setShippingRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [zonesState, setZonesState] = useState({ loading: true, error: null });
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

  const [vendorGroups, setVendorGroups] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState(null);
  const [cartActionState, setCartActionState] = useState({
    loading: false,
    itemId: null,
    error: null,
  });
  const [availableCities, setAvailableCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

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

  // Flatten all items from all vendor groups
  const allItems = useMemo(
    () => vendorGroups.flatMap((g) => g.items),
    [vendorGroups],
  );

  const subtotal = useMemo(
    () => allItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
    [allItems],
  );

  const totalPieces = useMemo(
    () => allItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [allItems],
  );

  const shippableItems = useMemo(
    () => allItems.filter((i) => i.is_shippable !== false),
    [allItems],
  );

  const totalWeight = useMemo(
    () =>
      computeShipmentWeight(
        shippableItems.map((i) => ({
          quantity: i.quantity,
          weight_kg: i.weight_kg ?? null,
        })),
      ),
    [shippableItems],
  );

  const hasShippableItems = shippableItems.length > 0;

  const fallbackShippingFee = Number(selectedRegion?.fee) || 0;
  const rawShippingFee = Number.isFinite(shippingQuote.amount)
    ? shippingQuote.amount
    : fallbackShippingFee;
  const shippingFee = hasShippableItems ? rawShippingFee : 0;
  const promoDiscount = promoState.applied
    ? Number(promoState.discount?.totalDiscount || 0)
    : 0;
  const discountedSubtotal =
    promoState.applied && Number.isFinite(promoState.discountedSubtotal)
      ? Number(promoState.discountedSubtotal)
      : subtotal;
  const total = discountedSubtotal + shippingFee;
  const cartHasItems = allItems.length > 0;

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

  const [state, formAction, isPending] = useActionState(processShopCheckout, {
    success: false,
    error: null,
  });

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

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

  const applyPromoCode = useCallback(async () => {
    const code = promoCode.trim();
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
      const response = await fetch("/api/shop/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          guestBrowserId: guestBrowserId || null,
          deviceFingerprint: deviceFingerprint || null,
        }),
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
  }, [promoCode, guestBrowserId, deviceFingerprint]);

  const resolveSelectedRegion = useCallback((regions, current) => {
    if (!Array.isArray(regions) || regions.length === 0) return current || null;
    if (current?.id) {
      const match = regions.find((r) => r.id === current.id);
      if (match) return match;
    }
    return regions[0];
  }, []);

  const handleRegionChange = useCallback(
    (e) => {
      const region = shippingRegions.find((r) => r.id === e.target.value);
      if (region) setSelectedRegion(region);
    },
    [shippingRegions],
  );

  // Fetch cart details
  const fetchCartDetails = useCallback(async (shouldAbort) => {
    setCartLoading(true);
    setCartError(null);
    try {
      const gid = getOrCreateGuestBrowserId();
      if (gid) setGuestBrowserId(gid);
      getDeviceFingerprint().then((fp) => {
        if (fp) setDeviceFingerprint(fp);
      });
      const url = new URL("/api/shop/cart-details", window.location.origin);
      if (gid) url.searchParams.set("guestBrowserId", gid);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load cart.");
      const body = await res.json();
      if (shouldAbort?.()) return;
      setVendorGroups(body.vendors || []);
    } catch (err) {
      if (shouldAbort?.()) return;
      setCartError(err?.message || "Failed to load cart.");
    } finally {
      if (!shouldAbort?.()) setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCartDetails(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchCartDetails]);

  // Reset promo when cart subtotal actually changes (not when applied state changes)
  const lastSubtotalRef = useRef(subtotal);
  useEffect(() => {
    if (subtotal !== lastSubtotalRef.current) {
      lastSubtotalRef.current = subtotal;
      if (promoState.applied) {
        resetPromoState();
      }
    }
  }, [subtotal, promoState.applied, resetPromoState]);

  // Load shipping zones
  useEffect(() => {
    let active = true;
    const loadZones = async () => {
      setZonesState({ loading: true, error: null });
      try {
        const response = await fetch(`/api/shipping/aramex/zones?country=GH`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload?.details || "Failed to load shipping zones.");
        const zones = Array.isArray(payload?.zones) ? payload.zones : [];
        if (active && zones.length > 0) {
          setShippingRegions(zones);
          setSelectedRegion((prev) => resolveSelectedRegion(zones, prev));
        }
        if (active) setZonesState({ loading: false, error: null });
      } catch (error) {
        if (active)
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
  }, [resolveSelectedRegion]);

  // Load cities when region changes
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
          `/api/shipping/cities?country=GH&stateCode=${encodeURIComponent(stateCode)}`
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

  // Aramex rate quote
  const destinationAddress = useMemo(
    () => ({
      line1: formData.address || "",
      line2: formData.digitalAddress || "",
      city: formData.city || "",
      state: selectedRegion?.aramex_code || selectedRegion?.name || "",
      postalCode: "",
      countryCode: "GH",
    }),
    [
      formData.address,
      formData.city,
      formData.digitalAddress,
      selectedRegion?.aramex_code,
      selectedRegion?.name,
    ],
  );

  useEffect(() => {
    if (cartLoading || !cartHasItems) return;
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
        // Use Accra as default origin for multi-vendor
        const payload = await getShopAramexRateQuote({
          origin: {
            line1: "Accra",
            line2: "",
            city: "Accra",
            state: "Greater Accra",
            postalCode: "",
            countryCode: "GH",
          },
          destination: destinationAddress,
          shipment: {
            weight: Math.max(1, totalWeight || totalPieces || 1),
            numberOfPieces: Math.max(1, totalPieces || 1),
            goodsValue: subtotal,
            currency: "GHS",
          },
        });
        if (!payload?.success)
          throw new Error(payload?.error || "Failed to fetch shipping rate.");
        if (!cancelled)
          setShippingQuote({
            amount: Number(payload?.amount) || null,
            loading: false,
            error: null,
          });
      } catch (error) {
        if (!cancelled)
          setShippingQuote({
            amount: null,
            loading: false,
            error: error?.message || "Failed to fetch rate.",
          });
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    cartLoading,
    cartHasItems,
    destinationAddress,
    subtotal,
    totalWeight,
    totalPieces,
  ]);

  // Cart item quantity update
  const updateItemQuantity = useCallback(
    async (cartItemId, nextQuantity) => {
      if (!cartItemId) return;
      setCartActionState({ loading: true, itemId: cartItemId, error: null });
      try {
        const response = await fetch("/api/storefront/cart", {
          method: nextQuantity === 0 ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            nextQuantity === 0
              ? { cartItemId }
              : { cartItemId, quantity: nextQuantity },
          ),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to update cart.");
        }
        await fetchCartDetails();
        setCartActionState({ loading: false, itemId: null, error: null });
      } catch (error) {
        setCartActionState({
          loading: false,
          itemId: null,
          error: error?.message || "Failed to update cart.",
        });
      }
    },
    [fetchCartDetails],
  );

  // Payment success redirect
  if (state.success && state.checkoutUrl) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Created!
          </h1>
          <p className="text-gray-600 mb-6">
            Your order has been created. You will be redirected to complete
            payment.
          </p>
          <Link
            href={state.checkoutUrl}
            className="inline-block w-full bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors"
          >
            Proceed to Payment
          </Link>
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
            href="/shop"
            className="flex items-center gap-2 text-gray-600 hover:text-[#A5914B] transition-colors"
          >
            <ChevronLeft className="size-5" />
            <span className="text-sm font-medium">Back to Shop</span>
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

            {!hasShippableItems ? (
              /* No shippable items: no shipping needed */
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-3">
                <Gift className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Digital Treat — No Shipping Required
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Your order contains only treats (intangible gifts). No
                    shipping address or fee is needed. You will receive details
                    via email after payment.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Shipping Address */}
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
                        disabled={zonesState.loading || shippingRegions.length === 0}
                      >
                        <SelectTrigger
                          className={`w-full ${
                            zonesState.loading || shippingRegions.length === 0
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
                          ? "Loading delivery zones..."
                          : zonesState.error
                            ? "Using default shipping zones."
                            : shippingQuote.loading
                              ? "Calculating Aramex rate..."
                              : shippingQuote.amount
                                ? `Aramex rate: ${formatPrice(shippingQuote.amount)}`
                                : shippingQuote.error
                                  ? "Aramex rate unavailable, using standard shipping."
                                  : "Enter your address to get an Aramex rate."}
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
                          disabled={availableCities.length === 0}
                        >
                          <SelectTrigger className={`w-full ${availableCities.length === 0 ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"}`}>
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
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
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
                        value={formData.digitalAddress}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors"
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
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-colors resize-none"
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

              {/* Cart Items grouped by vendor */}
              <div className="border-b border-gray-100 pb-4 space-y-5">
                {cartLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 text-[#A5914B] animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">
                      Loading cart...
                    </span>
                  </div>
                ) : cartError ? (
                  <div className="text-sm text-red-600">{cartError}</div>
                ) : !cartHasItems ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Your cart is empty.
                  </div>
                ) : (
                  vendorGroups.map((group) => (
                    <div key={group.vendor.slug}>
                      {/* Vendor header */}
                      <div className="flex items-center gap-2 mb-3">
                        {group.vendor.logo ? (
                          <ImageWithFallback
                            src={group.vendor.logo}
                            alt={group.vendor.name}
                            width={20}
                            height={20}
                            priority
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <Store className="size-4 text-gray-400" />
                        )}
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {group.vendor.name}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-3">
                        {group.items.map((item) => {
                          const isUpdating =
                            cartActionState.loading &&
                            cartActionState.itemId === item.cartItemId;
                          return (
                            <div
                              key={item.cartItemId}
                              className={`flex gap-3 ${isUpdating ? "opacity-50" : ""}`}
                            >
                              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                                {item.image ? (
                                  <ImageWithFallback
                                    src={item.image}
                                    alt={item.name}
                                    width={56}
                                    height={56}
                                    className="object-contain w-full h-full p-0.5"
                                    priority
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Store className="size-4 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {item.name}
                                </p>
                                {item.variation && (
                                  <p className="text-xs text-gray-500">
                                    {item.variation.label ||
                                      [
                                        item.variation.color,
                                        item.variation.size,
                                      ]
                                        .filter(Boolean)
                                        .join(" / ")}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center border border-gray-200 rounded-md">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateItemQuantity(
                                          item.cartItemId,
                                          (item.quantity || 1) - 1,
                                        )
                                      }
                                      disabled={
                                        isUpdating || (item.quantity || 1) <= 1
                                      }
                                      className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    >
                                      <Minus className="size-3" />
                                    </button>
                                    <span className="w-6 text-center text-xs font-medium">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateItemQuantity(
                                          item.cartItemId,
                                          (item.quantity || 0) + 1,
                                        )
                                      }
                                      disabled={isUpdating}
                                      className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    >
                                      <Plus className="size-3" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItemQuantity(item.cartItemId, 0)
                                    }
                                    disabled={isUpdating}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                  {isUpdating && (
                                    <Loader2 className="size-3 animate-spin text-gray-400" />
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-[#A5914B] whitespace-nowrap">
                                {formatPrice(item.price * (item.quantity || 1))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                {cartActionState.error && (
                  <p className="text-xs text-red-600">
                    {cartActionState.error}
                  </p>
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
                {promoState.applied && promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Promo ({promoState.promo?.code || promoCode})</span>
                    <span className="font-semibold">
                      -{formatPrice(promoDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-[#A5914B]">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Promo code */}
              <div className="pb-4 border-b border-gray-100 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Promo code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      if (promoState.applied) resetPromoState();
                    }}
                    placeholder="Enter promo code"
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#A5914B] focus:ring-2 focus:ring-[#A5914B]/20"
                  />
                  <button
                    type="button"
                    onClick={applyPromoCode}
                    disabled={promoState.loading || cartLoading}
                    className="rounded-xl border border-[#A5914B] px-4 text-sm font-semibold text-[#A5914B] transition hover:bg-[#A5914B]/10 disabled:opacity-50 cursor-pointer"
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
                      className="text-[#A5914B] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : promoState.error ? (
                  <p className="text-xs text-red-600">{promoState.error}</p>
                ) : null}
              </div>

              {/* Hidden fields */}
              <input
                type="hidden"
                name="guestBrowserId"
                value={guestBrowserId}
              />
              <input
                type="hidden"
                name="deviceFingerprint"
                value={deviceFingerprint}
              />
              <input type="hidden" name="subtotal" value={subtotal} />
              <input type="hidden" name="shippingFee" value={shippingFee} />
              <input
                type="hidden"
                name="shippingRegion"
                value={selectedRegion?.name || ""}
              />
              <input type="hidden" name="city" value={formData.city || ""} />
              <input type="hidden" name="total" value={total} />
              <input
                type="hidden"
                name="promoCode"
                value={promoState.applied ? promoCode : ""}
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  isPending ||
                  !isFormValid ||
                  !cartHasItems ||
                  cartLoading ||
                  cartActionState.loading
                }
                className="cursor-pointer w-full mt-4 bg-primary border border-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-white hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-5" /> Pay {formatPrice(total)}
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
