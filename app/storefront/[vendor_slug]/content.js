"use client";
import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../components/footer";
import {
  Store,
  MapPin,
  BadgeCheck,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  Grid3X3,
  LayoutList,
  ChevronDown,
  X,
  Tag,
  Star,
  ShoppingBag,
  Globe,
  Phone,
  Mail,
} from "lucide-react";
import { useStorefront } from "./context";

const SORT_OPTIONS = [
  { id: "newest", label: "Newest First" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "name_asc", label: "Name: A to Z" },
  { id: "name_desc", label: "Name: Z to A" },
];

export default function StorefrontContent() {
  const {
    vendor,
    vendorLoading,
    categories,
    categoriesLoading,
    products,
    productsLoading,
    hasMore,
    loadMore,
  } = useStorefront();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  const isClosed = (vendor?.shop_status || "").toLowerCase() === "closed";
  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = Array.isArray(products) ? [...products] : [];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => {
        const categoryIds = Array.isArray(p.categoryIds)
          ? p.categoryIds
          : p.categoryId
            ? [p.categoryId]
            : [];
        return categoryIds.includes(selectedCategory);
      });
    }

    // Price range filter
    if (priceRange.min !== "") {
      const min = parseFloat(priceRange.min);
      if (!isNaN(min)) {
        result = result.filter((p) => (p.rawPrice || 0) >= min);
      }
    }
    if (priceRange.max !== "") {
      const max = parseFloat(priceRange.max);
      if (!isNaN(max)) {
        result = result.filter((p) => (p.rawPrice || 0) <= max);
      }
    }

    // Sort
    switch (sortBy) {
      case "price_low":
        result.sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0));
        break;
      case "price_high":
        result.sort((a, b) => (b.rawPrice || 0) - (a.rawPrice || 0));
        break;
      case "name_asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name_desc":
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      default:
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy, priceRange]);

  const hasProducts = filteredProducts.length > 0;
  const totalProducts = Array.isArray(products) ? products.length : 0;

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory(null);
    setPriceRange({ min: "", max: "" });
    setSortBy("newest");
  }, []);

  const hasActiveFilters =
    searchQuery || selectedCategory || priceRange.min || priceRange.max;

  if (vendorLoading) {
    return (
      <div className="min-h-screen font-poppins bg-[#FAFAFA] dark:bg-gray-950" />
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen font-poppins bg-[#FAFAFA] dark:bg-gray-950" />
    );
  }

  return (
    <div className="dark:text-white bg-linear-to-b from-[#FAFAFA] to-white dark:from-gray-950 dark:to-gray-900 min-h-screen font-poppins">
      <Link
        href="#storefront-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </Link>

      {/* Hero Header */}
      <div className="relative bg-linear-to-r from-[#A5914B]/10 via-[#A5914B]/5 to-transparent">
        <div className="mx-auto max-w-6xl w-full px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
            {/* Logo */}
            <div className="shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-lg flex items-center justify-center">
                <Image
                  src={logoSrc}
                  alt={vendor?.business_name || "Vendor logo"}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
            </div>

            {/* Vendor Info */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
                  {vendor?.business_name || "Vendor"}
                </h1>
                {vendor?.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    <BadgeCheck className="size-3.5" />
                    Verified
                  </span>
                )}
                {isClosed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    Closed
                  </span>
                )}
              </div>

              {/* Category Pill */}
              {Array.isArray(vendor?.category_chips) && vendor.category_chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {vendor.category_chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#A5914B]/10 text-[#A5914B] rounded-full text-sm font-medium"
                    >
                      <Store className="size-3.5" />
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              {vendor?.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed line-clamp-2 mb-3">
                  {vendor.description}
                </p>
              )}

              {/* Contact & Location Pills */}
              <div className="flex flex-wrap gap-2">
                {(vendor?.address_city || vendor?.address_country) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                    <MapPin className="size-3.5" />
                    {[vendor.address_city, vendor.address_country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {vendor?.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs hover:bg-gray-200 transition-colors"
                  >
                    <Globe className="size-3.5" />
                    Website
                  </a>
                )}
                {vendor?.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs hover:bg-gray-200 transition-colors"
                  >
                    <Phone className="size-3.5" />
                    Contact
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalProducts}
                </p>
                <p className="text-xs text-gray-500">Products</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main
        id="storefront-main-content"
        role="main"
        tabIndex={-1}
        aria-label={`${vendor?.business_name || "Vendor"} storefront`}
        className="mx-auto max-w-6xl w-full px-4 py-6"
      >
        {/* Closed Shop Banner */}
        {isClosed && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 mb-6">
            <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <p className="text-red-800 font-semibold text-sm">
                This shop is currently closed
              </p>
              <p className="text-red-700 text-xs mt-1">
                This vendor has closed their shop and is no longer accepting
                orders. Products are displayed for reference only.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors text-sm font-medium ${
                  showFilters || hasActiveFilters
                    ? "bg-[#A5914B] text-white border-[#A5914B]"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                }`}
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-white rounded-full" />
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#A5914B] text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-[#A5914B] text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="List view"
                >
                  <LayoutList className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap gap-4">
                {/* Categories */}
                {categories.length > 0 && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          !selectedCategory
                            ? "bg-[#A5914B] text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selectedCategory === cat.id
                              ? "bg-[#A5914B] text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                <div className="min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Price Range (GHS)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) =>
                        setPriceRange((p) => ({ ...p, min: e.target.value }))
                      }
                      className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) =>
                        setPriceRange((p) => ({ ...p, max: e.target.value }))
                      }
                      className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {filteredProducts.length} of {totalProducts} products
          </p>
        )}

        {/* Products Grid/List */}
        {hasProducts ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/storefront/${vendor.slug}/${p.product_code || p.id}`}
                    className={`group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 ${
                      isClosed ? "opacity-75" : ""
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        priority
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {p.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-red-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      {isClosed && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                            Closed
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#A5914B] transition-colors">
                        {p.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-[#A5914B]">
                          {p.price}
                        </p>
                        {!isClosed && p.stock > 0 && (
                          <span className="text-xs text-gray-500">
                            {p.stock} left
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/storefront/${vendor.slug}/${p.product_code || p.id}`}
                    className={`group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 flex ${
                      isClosed ? "opacity-75" : ""
                    }`}
                  >
                    <div className="relative w-32 md:w-48 shrink-0 bg-gray-50 dark:bg-gray-800">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        priority
                        className="object-cover"
                      />
                      {p.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <p className="text-base font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#A5914B] transition-colors">
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-[#A5914B]">
                          {p.price}
                        </p>
                        {!isClosed && p.stock > 0 && (
                          <span className="text-sm text-green-600 font-medium">
                            In Stock ({p.stock})
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !hasActiveFilters && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={productsLoading}
                  className="px-8 py-3 bg-[#A5914B] text-white font-semibold rounded-xl hover:bg-[#8B7A3F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {productsLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Products"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <ShoppingBag className="size-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {hasActiveFilters ? "No products found" : "No products available"}
            </h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms."
                : isClosed
                ? "This shop has no products to display."
                : "Check back later for new products."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-[#A5914B] text-white font-medium rounded-xl hover:bg-[#8B7A3F] transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        <div className="mt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
