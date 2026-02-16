"use client";
import React from "react";
import Link from "next/link";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import {
  PiArrowLeft,
  PiGift,
  PiStar,
  PiStarFill,
  PiShoppingCart,
  PiStorefront,
} from "react-icons/pi";
import Footer from "../../components/footer";
import { useGuideDetailContext } from "./context";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

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

function ProductCard({ item }) {
  const product = item.product;
  if (!product) return null;

  const images = Array.isArray(product.images) ? product.images : [];
  const vendor = product.vendor || {};
  const serviceCharge = Number(product.service_charge || 0);
  const basePrice = Number(product.price) + serviceCharge;
  const onSale = isSaleActive(product);
  const salePrice = onSale ? Number(product.sale_price) + serviceCharge : null;
  const displayPrice = onSale ? salePrice : basePrice;
  const stock = product.stock_qty ?? 0;
  const rating = Number(product.avg_rating) || 0;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden hover:border-[#A5914B]/40 hover:shadow-sm transition-all group">
      {/* Image */}
      <div className="aspect-square relative bg-[#F3F4F6]">
        {images[0] ? (
          <ImageWithFallback
            src={images[0]}
            alt={product.name}
            fill
            priority
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PiGift className="w-10 h-10 text-[#D1D5DB]" />
          </div>
        )}

        {onSale && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            SALE
          </span>
        )}

        {product.product_type === "treat" && (
          <span className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            TREAT
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <p className="text-xs text-[#111827] font-medium line-clamp-2 min-h-[2.25rem]">
          {product.name}
        </p>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) =>
              i < Math.round(rating) ? (
                <PiStarFill key={i} className="w-3 h-3 text-[#FBBF24]" />
              ) : (
                <PiStar key={i} className="w-3 h-3 text-[#D1D5DB]" />
              )
            )}
            <span className="text-[10px] text-[#6B7280] ml-1">
              ({product.review_count || 0})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-sm font-bold text-[#111827]">
            {formatPrice(displayPrice)}
          </span>
          {onSale && (
            <span className="text-[10px] text-[#9CA3AF] line-through">
              {formatPrice(basePrice)}
            </span>
          )}
        </div>

        {/* Vendor */}
        {vendor.business_name && (
          <Link
            href={`/storefront/${vendor.slug}`}
            className="inline-flex items-center gap-1 mt-2 text-[10px] text-[#6B7280] hover:text-[#A5914B] transition"
          >
            <PiStorefront className="w-3 h-3" />
            {vendor.business_name}
          </Link>
        )}

        {/* Editor note */}
        {item.editor_note && (
          <p className="text-[10px] text-[#A5914B] mt-2 italic line-clamp-2">
            &quot;{item.editor_note}&quot;
          </p>
        )}

        {/* Stock status */}
        {stock <= 0 && (
          <p className="text-[10px] text-red-500 font-medium mt-2">
            Out of stock
          </p>
        )}

        {/* Shop link */}
        {stock > 0 && vendor.slug && (
          <Link
            href={`/storefront/${vendor.slug}`}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition"
          >
            <PiShoppingCart className="w-3.5 h-3.5" />
            Shop Now
          </Link>
        )}
      </div>
    </div>
  );
}

export default function GuideDetailContent() {
  const { guide, items, loading, error, occasionLabels, budgetLabels } =
    useGuideDetailContext();

  if (loading) {
    return (
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-6 w-48 bg-[#E5E7EB] rounded animate-pulse mb-4" />
          <div className="h-40 bg-[#E5E7EB] rounded-2xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-[#E5E7EB] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !guide) {
    return (
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="text-sm text-red-600">{error || "Guide not found"}</p>
          <Link
            href="/gift-guides"
            className="mt-3 inline-flex items-center gap-1 text-sm text-[#A5914B] hover:underline"
          >
            <PiArrowLeft className="w-4 h-4" /> All Guides
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Back */}
          <Link
            href="/gift-guides"
            className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#A5914B] mb-6 transition"
          >
            <PiArrowLeft className="w-4 h-4" /> Gift Guides
          </Link>

          {/* Hero */}
          {guide.cover_image && (
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden mb-6">
              <Image
                src={guide.cover_image}
                alt={guide.title}
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <h1 className="text-2xl sm:text-3xl font-semibold font-brasley-medium">
                  {guide.title}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  {guide.occasion && (
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      {occasionLabels[guide.occasion] || guide.occasion}
                    </span>
                  )}
                  {guide.budget_range && (
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      {budgetLabels[guide.budget_range] || guide.budget_range}
                    </span>
                  )}
                  <span className="text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!guide.cover_image && (
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] font-brasley-medium">
                {guide.title}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                {guide.occasion && (
                  <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2.5 py-1 rounded-full">
                    {occasionLabels[guide.occasion] || guide.occasion}
                  </span>
                )}
                {guide.budget_range && (
                  <span className="text-xs bg-[#F3F4F6] text-[#374151] px-2.5 py-1 rounded-full">
                    {budgetLabels[guide.budget_range] || guide.budget_range}
                  </span>
                )}
              </div>
            </div>
          )}

          {guide.description && (
            <p className="text-sm text-[#6B7280] mb-8 max-w-2xl">
              {guide.description}
            </p>
          )}

          {/* Products grid */}
          {items.length === 0 ? (
            <div className="text-center py-16">
              <PiGift className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-sm text-[#6B7280]">
                No products in this guide yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
