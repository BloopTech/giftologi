"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useProductDetail } from "./context";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { getGuestIdentifier } from "../../../utils/guest";
import Footer from "../../../components/footer";
import ProductPageViewTracker from "../../../components/ProductPageViewTracker";
import {
  Store,
  MapPin,
  BadgeCheck,
  AlertTriangle,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
  Heart,
  Share2,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Check,
  X,
} from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

const COLOR_OPTIONS = [
  "Black",
  "White",
  "Gray",
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Pink",
  "Brown",
  "Gold",
  "Silver",
];

const COLOR_SWATCHES = {
  Black: "#111827",
  White: "#F9FAFB",
  Gray: "#9CA3AF",
  Red: "#EF4444",
  Orange: "#F97316",
  Yellow: "#FACC15",
  Green: "#22C55E",
  Blue: "#3B82F6",
  Purple: "#8B5CF6",
  Pink: "#EC4899",
  Brown: "#A16207",
  Gold: "#D4AF37",
  Silver: "#CBD5F5",
};

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

export default function ProductCodeDetailContent() {
  const { vendor, product, loading, relatedProducts, reviews, submitReview } =
    useProductDetail();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isAuthed, setIsAuthed] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [cartFeedback, setCartFeedback] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const router = useRouter();

  const isClosed = (vendor?.shop_status || "").toLowerCase() === "closed";
  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setIsAuthed(!!user);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const variations = useMemo(
    () => (Array.isArray(product?.variations) ? product.variations : []),
    [product?.variations],
  );

  const variationOptions = useMemo(() => {
    return variations
      .map((variation, index) => ({
        key: String(variation?.id || variation?.sku || index),
        label:
          variation?.label ||
          [variation?.color, variation?.size].filter(Boolean).join(" / ") ||
          `Option ${index + 1}`,
        price: variation?.price,
        stock_qty: variation?.stock_qty ?? null,
        color: variation?.color,
        size: variation?.size,
        sku: variation?.sku,
        raw: variation,
      }))
      .filter((option) => option.label);
  }, [variations]);

  const hasColor = useMemo(
    () => variationOptions.some((option) => option.color),
    [variationOptions],
  );
  const hasSize = useMemo(
    () => variationOptions.some((option) => option.size),
    [variationOptions],
  );

  const colorOptions = useMemo(() => {
    if (!hasColor) return [];
    const filtered = selectedSize
      ? variationOptions.filter((opt) => opt.size === selectedSize)
      : variationOptions;
    return Array.from(
      new Set(filtered.map((opt) => opt.color).filter(Boolean)),
    );
  }, [hasColor, selectedSize, variationOptions]);

  const sizeOptions = useMemo(() => {
    if (!hasSize) return [];
    const filtered = selectedColor
      ? variationOptions.filter((opt) => opt.color === selectedColor)
      : variationOptions;
    return Array.from(new Set(filtered.map((opt) => opt.size).filter(Boolean)));
  }, [hasSize, selectedColor, variationOptions]);

  const matchingOptions = useMemo(() => {
    if (!hasColor && !hasSize) return variationOptions;
    return variationOptions.filter(
      (option) =>
        (!selectedColor || option.color === selectedColor) &&
        (!selectedSize || option.size === selectedSize),
    );
  }, [hasColor, hasSize, selectedColor, selectedSize, variationOptions]);

  const selectedVariation = useMemo(() => {
    if (selectedVariantKey) {
      return (
        variationOptions.find((option) => option.key === selectedVariantKey) ||
        null
      );
    }
    if (matchingOptions.length === 1) return matchingOptions[0];
    if (!hasSize && selectedColor && matchingOptions.length)
      return matchingOptions[0];
    if (!hasColor && selectedSize && matchingOptions.length)
      return matchingOptions[0];
    return null;
  }, [
    hasColor,
    hasSize,
    matchingOptions,
    selectedColor,
    selectedSize,
    selectedVariantKey,
    variationOptions,
  ]);

  const selectionRequired = variationOptions.length > 0;
  const selectionComplete = !selectionRequired || !!selectedVariation;

  const effectiveStock = useMemo(() => {
    if (selectedVariation && selectedVariation.stock_qty != null) {
      return Number(selectedVariation.stock_qty);
    }
    return product?.stock ?? 0;
  }, [selectedVariation, product?.stock]);

  const isOutOfStock = product && effectiveStock <= 0;
  const canPurchase = !isClosed && !isOutOfStock;

  const handleQuantityChange = useCallback(
    (delta) => {
      setQuantity((prev) => {
        const next = prev + delta;
        if (next < 1) return 1;
        if (next > effectiveStock) return effectiveStock;
        return next;
      });
    },
    [effectiveStock],
  );

  useEffect(() => {
    setSelectedColor("");
    setSelectedSize("");
    setSelectedVariantKey("");
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariation?.key]);

  useEffect(() => {
    if (variationOptions.length !== 1) return;
    const [option] = variationOptions;
    setSelectedVariantKey(option.key);
    setSelectedColor(option.color || "");
    setSelectedSize(option.size || "");
  }, [variationOptions]);

  useEffect(() => {
    if (!selectedVariantKey) return;
    const option = variationOptions.find(
      (opt) => opt.key === selectedVariantKey,
    );
    if (!option) return;
    if (option.color && option.color !== selectedColor) {
      setSelectedColor(option.color);
    }
    if (option.size && option.size !== selectedSize) {
      setSelectedSize(option.size);
    }
  }, [selectedVariantKey, selectedColor, selectedSize, variationOptions]);

  const handleBuyNow = useCallback(() => {
    if (!canPurchase || !selectionComplete) return;
    const params = new URLSearchParams({
      product: product?.id || "",
      qty: String(quantity),
    });
    if (selectedVariation?.key) {
      params.set("variant", selectedVariation.key);
    }
    router.push(`/storefront/${vendor?.slug}/checkout?${params.toString()}`);
  }, [
    canPurchase,
    router,
    vendor?.slug,
    product?.id,
    quantity,
    selectedVariation?.key,
    selectionComplete,
  ]);

  const handleAddToCart = useCallback(async () => {
    if (!canPurchase || !selectionComplete) return;
    setCartFeedback(null);
    setIsAddingToCart(true);
    try {
      const guestBrowserId = await getGuestIdentifier();
      const response = await fetch("/api/storefront/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorSlug: vendor?.slug,
          productId: product?.id,
          quantity,
          variationKey: selectedVariation?.key || null,
          variation: selectedVariation?.raw || null,
          guestBrowserId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to add item to cart.");
      }
      setCartFeedback({
        type: "success",
        message:
          "Added to cart. You can continue shopping or checkout anytime.",
      });
    } catch (error) {
      setCartFeedback({
        type: "error",
        message: error?.message || "Unable to add item to cart.",
      });
    } finally {
      setIsAddingToCart(false);
    }
  }, [
    canPurchase,
    selectionComplete,
    vendor?.slug,
    product?.id,
    quantity,
    selectedVariation?.key,
    selectedVariation?.raw,
  ]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Check out ${product?.name} at ${vendor?.business_name}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [product?.name, vendor?.business_name]);

  const handleSubmitReview = useCallback(
    async (event) => {
      event.preventDefault();

      // Redirect guests to login, then back to this product page
      if (!isAuthed) {
        const currentPath = `/storefront/${vendor?.slug}/${product?.product_code || product?.id}`;
        router.push(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      if (!submitReview) return;
      setReviewError(null);
      setReviewSuccess(null);
      setReviewSubmitting(true);

      const { data, error } = await submitReview({
        rating: reviewRating,
        comment: reviewComment,
      });

      if (error) {
        setReviewError(error);
      } else {
        setReviewSuccess("Review submitted. Thanks for the feedback!");
        setReviewComment("");
      }

      setReviewSubmitting(false);
    },
    [
      isAuthed,
      reviewComment,
      reviewRating,
      submitReview,
      router,
      vendor?.slug,
      product?.product_code,
      product?.id,
    ],
  );

  const openGallery = useCallback((index) => {
    setGalleryIndex(index);
    setShowGallery(true);
  }, []);

  const closeGallery = useCallback(() => {
    setShowGallery(false);
  }, []);

  const prevImage = useCallback(() => {
    setGalleryIndex(
      (prev) => (prev - 1 + product?.images.length) % product?.images.length,
    );
  }, [product?.images]);

  const nextImage = useCallback(() => {
    setGalleryIndex((prev) => (prev + 1) % product?.images.length);
  }, [product?.images]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!showGallery) return;
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    },
    [showGallery, closeGallery, prevImage, nextImage],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const averageRating =
    reviews?.length > 0
      ? reviews?.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews?.length
      : 0;

  if (loading) {
    return <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950" />;
  }

  if (!vendor || !product) {
    return <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950" />;
  }

  const serviceCharge = Number(product?.serviceCharge || 0);
  const selectedPrice =
    selectedVariation?.price != null
      ? Number(selectedVariation.price) + serviceCharge
      : null;
  const basePrice = product?.basePrice ?? product?.rawPrice ?? null;

  const effectiveSalePrice =
    product?.isOnSale && product?.salePrice != null ? product.salePrice : null;
  const priceLabel =
    selectedPrice != null
      ? formatPrice(selectedPrice)
      : effectiveSalePrice != null
        ? formatPrice(effectiveSalePrice)
        : product?.variationPriceRange
          ? `${formatPrice(product.variationPriceRange.min)} - ${formatPrice(product.variationPriceRange.max)}`
          : product.price;
  const showStrikethrough =
    product?.isOnSale && !selectedVariation && product?.originalPriceFormatted;
  const showBasePrice =
    selectedPrice != null &&
    Number.isFinite(basePrice) &&
    basePrice !== selectedPrice;

  return (
    <div className="w-full pt-24 dark:text-white bg-[#FAFAFA] dark:bg-gray-950 min-h-screen font-brasley-medium">
      {product?.id && <ProductPageViewTracker productId={product.id} />}
      <div className="mx-auto max-w-6xl w-full py-6 px-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link
                href={`/storefront/${vendor.slug}`}
                className="hover:text-[#A5914B] transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="size-4" />
                Back to {vendor.business_name}
              </Link>
            </li>
          </ol>
        </nav>

        {/* Closed Shop Banner */}
        {isClosed && (
          <div className="w-full rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3 mb-6">
            <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <p className="text-red-800 font-semibold text-sm">
                This shop is currently closed
              </p>
              <p className="text-red-700 text-xs mt-1">
                This vendor has closed their shop and is no longer accepting
                orders.
              </p>
            </div>
          </div>
        )}

        <main className="flex flex-col lg:flex-row gap-8">
          {/* Product Images */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm">
              <ImageWithFallback
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover cursor-pointer"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                onClick={() => openGallery(selectedImage)}
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-600 text-white px-4 py-2 rounded-full font-semibold">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {product?.images?.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product?.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx
                        ? "border-[#A5914B] ring-2 ring-[#A5914B]/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <ImageWithFallback
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      width={80}
                      height={80}
                      priority
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:w-1/2 flex flex-col">
            {/* Vendor Badge */}
            <Link
              href={`/storefront/${vendor.slug}`}
              className="flex items-center gap-2 mb-4 group"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                <ImageWithFallback
                  src={logoSrc}
                  alt={vendor.business_name}
                  width={40}
                  height={40}
                  priority
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 group-hover:text-[#A5914B] transition-colors flex items-center gap-1">
                  {vendor.business_name}
                  {vendor.verified && (
                    <BadgeCheck className="size-4 text-blue-500" />
                  )}
                </span>
                {Array.isArray(vendor?.category_chips) &&
                  vendor.category_chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vendor.category_chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#A5914B]/10 text-[#A5914B] rounded-full text-xs font-medium"
                        >
                          <Store className="size-3" />
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </Link>

            {/* Product Title & Price */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {product.name}
            </h1>

            {/* Rating */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-4 ${
                        star <= Math.round(averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating.toFixed(1)} ({reviews.length} reviews)
                </span>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-[#A5914B]">
                  {priceLabel}
                </div>
                {showStrikethrough && (
                  <div className="text-xl text-gray-400 line-through">
                    {product.originalPriceFormatted}
                  </div>
                )}
                {product?.isOnSale &&
                  product?.discountPercent > 0 &&
                  !selectedVariation && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {product.discountPercent}% OFF
                    </span>
                  )}
              </div>
              {product?.variationPriceRange &&
                !selectedVariation &&
                !product?.isOnSale && (
                  <p className="text-xs text-gray-500 mt-1">
                    Price varies by option.
                  </p>
                )}
              {showBasePrice && (
                <p className="text-xs text-gray-500 mt-1">
                  Base price {formatPrice(basePrice)}
                </p>
              )}
            </div>

            {/* Category Pill */}
            {product.category && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#A5914B]/10 text-[#A5914B] rounded-full text-sm font-medium">
                  <Store className="size-3.5" />
                  {product.category.name}
                </span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">
                  Description
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              {effectiveStock > 0 ? (
                <>
                  <Check className="size-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    In Stock ({effectiveStock} available)
                  </span>
                  {selectedVariation && selectedVariation.stock_qty != null && (
                    <span className="text-xs text-gray-500">
                      for {selectedVariation.label}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-red-600 font-medium">
                  {selectedVariation
                    ? `Out of Stock (${selectedVariation.label})`
                    : "Out of Stock"}
                </span>
              )}
            </div>

            {variationOptions.length > 0 && (
              <div className="mb-6 space-y-4">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Choose a variation
                  </h2>

                  {!hasColor && !hasSize ? (
                    <div className="flex flex-wrap gap-2">
                      {variationOptions.map((option) => {
                        const isSelected = selectedVariantKey === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() =>
                              setSelectedVariantKey(
                                isSelected ? "" : option.key,
                              )
                            }
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              isSelected
                                ? "border-[#A5914B] bg-[#A5914B]/10 text-[#8B7A3F]"
                                : "border-gray-200 text-gray-600 hover:border-[#A5914B]/50"
                            }`}
                          >
                            {option.label}
                            {option.price != null
                              ? ` · ${formatPrice(Number(option.price) + serviceCharge)}`
                              : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hasColor && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-gray-600">
                            Color
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(colorOptions.length
                              ? colorOptions
                              : COLOR_OPTIONS
                            ).map((color) => {
                              const isSelected = selectedColor === color;
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected ? "" : color;
                                    setSelectedColor(next);
                                    setSelectedVariantKey("");
                                    if (
                                      next &&
                                      selectedSize &&
                                      !sizeOptions.includes(selectedSize)
                                    ) {
                                      setSelectedSize("");
                                    }
                                  }}
                                  className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? "border-[#A5914B] bg-[#A5914B]/10 text-[#8B7A3F]"
                                      : "border-gray-200 text-gray-600 hover:border-[#A5914B]/50"
                                  }`}
                                >
                                  <span
                                    className="h-3 w-3 rounded-full border"
                                    style={{
                                      background:
                                        COLOR_SWATCHES[color] || "#E5E7EB",
                                      borderColor:
                                        color === "White"
                                          ? "#E5E7EB"
                                          : "transparent",
                                    }}
                                  />
                                  {color}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {hasSize && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-gray-600">
                            Size
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(sizeOptions.length
                              ? sizeOptions
                              : SIZE_OPTIONS
                            ).map((size) => {
                              const isSelected = selectedSize === size;
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected ? "" : size;
                                    setSelectedSize(next);
                                    setSelectedVariantKey("");
                                  }}
                                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? "border-[#A5914B] bg-[#A5914B]/10 text-[#8B7A3F]"
                                      : "border-gray-200 text-gray-600 hover:border-[#A5914B]/50"
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectionComplete && selectedVariation ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#A5914B]/30 bg-[#A5914B]/10 px-2 py-1 text-[#8B7A3F]">
                        Selected: {selectedVariation.label}
                      </span>
                      {selectedVariation.price != null && (
                        <span className="font-semibold text-[#A5914B]">
                          {formatPrice(
                            Number(selectedVariation.price || 0) +
                              serviceCharge,
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-red-500">
                      Select a variation to continue.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {canPurchase && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-gray-700">
                  Quantity:
                </span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= effectiveStock}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {canPurchase ? (
                <>
                  <button
                    onClick={handleAddToCart}
                    disabled={!selectionComplete || isAddingToCart}
                    className="flex-1 border border-[#A5914B] text-[#8B7A3F] font-semibold py-3 px-6 rounded-xl hover:bg-[#A5914B]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="size-5" />
                    {isAddingToCart ? "Adding..." : "Add to Cart"}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!selectionComplete}
                    className="flex-1 bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="size-5" />
                    Buy Now
                  </button>
                  <button
                    onClick={() => {
                      if (!isAuthed) return;
                      setIsWishlisted(!isWishlisted);
                    }}
                    disabled={!isAuthed}
                    className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 p-3 rounded-xl border transition-colors ${
                      isWishlisted
                        ? "bg-red-50 border-red-200 text-red-500"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                    aria-label={
                      isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                    }
                  >
                    <Heart
                      className={`size-5 ${isWishlisted ? "fill-current" : ""}`}
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="cursor-pointer p-3 rounded-xl border border-gray-300 text-gray-600 hover:border-gray-400 transition-colors"
                    aria-label="Share product"
                  >
                    <Share2 className="size-5" />
                  </button>
                </>
              ) : (
                <div className="flex-1 bg-gray-200 text-gray-500 font-semibold py-3 px-6 rounded-xl text-center cursor-not-allowed">
                  {isClosed ? "Shop Closed" : "Out of Stock"}
                </div>
              )}
            </div>

            {cartFeedback && (
              <div
                className={`mb-6 rounded-xl border px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                  cartFeedback.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                <span>{cartFeedback.message}</span>
                {cartFeedback.type === "success" && vendor?.slug && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/storefront/${vendor.slug}/checkout?cart=1`)
                    }
                    className="text-xs font-semibold text-[#8B7A3F] hover:text-[#6F6136]"
                  >
                    Checkout cart
                  </button>
                )}
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex flex-col items-center text-center gap-1">
                <Truck className="size-5 text-[#A5914B]" />
                <span className="text-xs text-gray-600">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Shield className="size-5 text-[#A5914B]" />
                <span className="text-xs text-gray-600">Secure Payment</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <RotateCcw className="size-5 text-[#A5914B]" />
                <span className="text-xs text-gray-600">Easy Returns</span>
              </div>
            </div>
          </div>
        </main>

        {/* Reviews Section */}
        <section className="mt-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="lg:w-[360px]">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Leave a review
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Share your experience with other shoppers.
                </p>
                {!isAuthed && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    You&apos;ll be redirected to sign in when you submit.
                  </div>
                )}
                <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Rating
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1"
                          disabled={reviewSubmitting}
                        >
                          <Star
                            className={`size-5 ${
                              star <= reviewRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Comment
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A5914B]"
                      placeholder="Tell us what you loved about this product."
                      disabled={reviewSubmitting}
                    />
                  </div>
                  {reviewError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                      {reviewError}
                    </div>
                  )}
                  {reviewSuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                      {reviewSuccess}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="w-full rounded-full bg-primary border border-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reviewSubmitting ? "Submitting..." : "Submit review"}
                  </button>
                </form>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Customer Reviews
                </h2>
                <span className="text-xs text-gray-500">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </div>
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  No reviews yet. Be the first to share your feedback.
                </div>
              ) : (
                <div className="grid gap-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {review.reviewer?.image ? (
                            <ImageWithFallback
                              src={review.reviewer.image}
                              alt=""
                              width={40}
                              height={40}
                              priority
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {(
                                review.reviewer?.firstname?.[0] || "A"
                              ).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">
                              {review.reviewer?.firstname || "Anonymous"}{" "}
                              {review.reviewer?.lastname?.[0] || ""}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`size-3 ${
                                  star <= (review.rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              More from {vendor.business_name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/storefront/${vendor.slug}/${p.id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square relative bg-gray-50">
                    <ImageWithFallback
                      src={p.image}
                      alt={p.name}
                      fill
                      priority
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                      {p.name}
                    </p>
                    <p className="text-sm font-bold text-[#A5914B]">
                      {p.price}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="mt-12">
        <Footer />
      </div>
      {/* Gallery Modal */}
      {showGallery && product?.images && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          {/* Close Button */}
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close gallery"
          >
            <X className="size-6 cursor-pointer" />
          </button>

          {/* Left Arrow */}
          {product.images.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Right Arrow */}
          {product.images.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Image */}
          <div className="relative max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center">
            <ImageWithFallback
              src={product.images[galleryIndex]}
              alt={`${product.name} - Image ${galleryIndex + 1}`}
              fill
              className="object-contain"
              priority
              sizes="90vw"
            />
          </div>

          {/* Image Counter */}
          {product.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {galleryIndex + 1} / {product.images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
