"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import {
  PiSparkle,
  PiMagnifyingGlass,
  PiStar,
  PiStarFill,
  PiStorefront,
  PiShoppingCart,
  PiSortAscending,
} from "react-icons/pi";
import Footer from "../components/footer";

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Most Popular" },
  { id: "best_rated", label: "Best Rated" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "name_asc", label: "Name: A – Z" },
];

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

function TreatCard({ product }) {
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
      <div className="aspect-square relative bg-[#F3F4F6]">
        {images[0] ? (
          <ImageWithFallback
            src={images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PiSparkle className="w-10 h-10 text-[#D1D5DB]" />
          </div>
        )}

        <span className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          TREAT
        </span>

        {onSale && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            SALE
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs text-[#111827] font-medium line-clamp-2 min-h-[2.25rem]">
          {product.name}
        </p>

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

        {vendor.business_name && (
          <Link
            href={`/storefront/${vendor.slug}`}
            className="inline-flex items-center gap-1 mt-2 text-[10px] text-[#6B7280] hover:text-[#A5914B] transition"
          >
            <PiStorefront className="w-3 h-3" />
            {vendor.business_name}
          </Link>
        )}

        {stock <= 0 && (
          <p className="text-[10px] text-red-500 font-medium mt-2">
            Out of stock
          </p>
        )}

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

export default function TreatsContent() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [localSearch, setLocalSearch] = useState("");

  const fetchTreats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        sort: sortBy,
        limit: "20",
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/treats?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load treats");
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, searchQuery]);

  useEffect(() => {
    fetchTreats();
  }, [fetchTreats]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [localSearch, searchQuery]);

  return (
    <>
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-1.5 rounded-full text-xs font-medium mb-4">
              <PiSparkle className="w-4 h-4" />
              Experiences & Services
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] font-brasley-medium">
              Treats
            </h1>
            <p className="text-sm text-[#6B7280] mt-2 max-w-md mx-auto">
              Gift unforgettable experiences — spa visits, cinema tickets, dining
              vouchers, and more.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8 max-w-2xl mx-auto">
            <div className="relative flex-1 w-full">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search treats..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#D1D5DB] rounded-xl outline-none focus:border-[#A5914B] transition bg-white"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="py-2.5 px-3 text-sm border border-[#D1D5DB] rounded-xl outline-none focus:border-[#A5914B] bg-white transition min-w-[160px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Results count */}
          {!loading && !error && (
            <p className="text-xs text-[#6B7280] mb-4">
              {total} {total === 1 ? "treat" : "treats"} found
            </p>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-[#E5E7EB]" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-3/4 bg-[#E5E7EB] rounded" />
                    <div className="h-3 w-1/2 bg-[#E5E7EB] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={fetchTreats}
                className="mt-3 text-sm text-[#A5914B] hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <PiSparkle className="w-12 h-12 mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-sm text-[#6B7280]">
                {searchQuery
                  ? "No treats match your search."
                  : "No treats available yet. Check back soon!"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <TreatCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 text-xs border border-[#D1D5DB] rounded-lg disabled:opacity-40 hover:bg-[#F9FAFB] transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#6B7280]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 text-xs border border-[#D1D5DB] rounded-lg disabled:opacity-40 hover:bg-[#F9FAFB] transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
