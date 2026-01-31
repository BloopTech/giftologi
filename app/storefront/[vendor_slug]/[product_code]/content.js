"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useProductDetail } from "./context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import Footer from "../../../components/footer";
import {
  Store,
  MapPin,
  BadgeCheck,
  AlertTriangle,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Check,
  X
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

export default function ProductCodeDetailContent() {
  const { vendor, product, loading, relatedProducts, reviews } =
    useProductDetail();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isAuthed, setIsAuthed] = useState(false);

  const router = useRouter();

  const isClosed = (vendor?.shop_status || "").toLowerCase() === "closed";
  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";
  const isOutOfStock = product && product?.stock <= 0;
  const canPurchase = !isClosed && !isOutOfStock;

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

  const handleQuantityChange = useCallback(
    (delta) => {
      setQuantity((prev) => {
        const next = prev + delta;
        if (next < 1) return 1;
        if (next > product?.stock) return product?.stock;
        return next;
      });
    },
    [product?.stock],
  );

  const handleBuyNow = useCallback(() => {
    if (!canPurchase || !isAuthed) return;
    router.push(
      `/storefront/${vendor?.slug}/checkout?product=${product?.id}&qty=${quantity}`,
    );
  }, [canPurchase, isAuthed, router, vendor?.slug, product?.id, quantity]);

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

  const openGallery = useCallback((index) => {
    setGalleryIndex(index);
    setShowGallery(true);
  }, []);

  const closeGallery = useCallback(() => {
    setShowGallery(false);
  }, []);

  const prevImage = useCallback(() => {
    setGalleryIndex((prev) => (prev - 1 + product?.images.length) % product?.images.length);
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
    [showGallery, closeGallery, prevImage, nextImage]
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

  return (
    <div className="dark:text-white bg-[#FAFAFA] dark:bg-gray-950 min-h-screen font-poppins">
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
              <Image
                src={product.images[selectedImage] || "/host/toaster.png"}
                alt={product.name}
                fill
                className="object-cover cursor-pointer"
                priority
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
                    <Image
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
                <Image
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
                {Array.isArray(vendor?.category_chips) && vendor.category_chips.length > 0 && (
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

            <div className="text-3xl font-bold text-[#A5914B] mb-6">
              {product.price}
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
              {product.stock > 0 ? (
                <>
                  <Check className="size-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    In Stock ({product.stock} available)
                  </span>
                </>
              ) : (
                <span className="text-sm text-red-600 font-medium">
                  Out of Stock
                </span>
              )}
            </div>

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
                    disabled={quantity >= product.stock}
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
                    onClick={handleBuyNow}
                    disabled={!isAuthed}
                    className="flex-1 bg-[#A5914B] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#8B7A3F] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="size-5" />
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
        {reviews.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Customer Reviews
            </h2>
            <div className="grid gap-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {review.reviewer?.image ? (
                        <Image
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
          </section>
        )}

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
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      priority
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

        <div className="mt-12">
          <Footer />
        </div>
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
            <Image
              src={product.images[galleryIndex] || "/host/toaster.png"}
              alt={`${product.name} - Image ${galleryIndex + 1}`}
              fill
              className="object-contain"
              priority
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
