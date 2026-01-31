"use client";
import React, { useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/footer";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  LayoutList,
  ChevronDown,
  X,
  ShoppingBag,
  Plus,
  BadgeCheck,
  Gift,
  Store,
  Check,
  Minus,
} from "lucide-react";
import { useShop } from "./context";
import ProductDetailModal from "./components/ProductDetailModal";
import AddToRegistryModal from "./components/AddToRegistryModal";

const SORT_OPTIONS = [
  { id: "newest", label: "Newest First" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "name_asc", label: "Name: A to Z" },
  { id: "name_desc", label: "Name: Z to A" },
];

export default function ShopContent() {
  const {
    products,
    loading,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    priceRange,
    setPriceRange,
    categories,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    registry,
    isHost,
    registryItems,
    isProductInRegistry,
    getRegistryItem,
    selectedProduct,
    productDetailOpen,
    openProductDetail,
    closeProductDetail,
    addToRegistryOpen,
    addToRegistryProduct,
    openAddToRegistry,
    closeAddToRegistry,
  } = useShop();

  const [viewMode, setViewMode] = React.useState("grid");
  const [showFilters, setShowFilters] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, categoryFilter, sortBy]);

  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setSearchQuery(localSearch);
      applyFilters();
    },
    [localSearch, setSearchQuery, applyFilters]
  );

  const handlePriceFilter = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  const hasProducts = products.length > 0;

  return (
    <div className="dark:text-white bg-gradient-to-b from-[#FAFAFA] to-white dark:from-gray-950 dark:to-gray-900 min-h-screen font-poppins">
      <Link
        href="#shop-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </Link>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-[#A5914B]/10 via-[#A5914B]/5 to-transparent">
        <div className="mx-auto max-w-6xl w-full px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold mb-2">
                Gift Shop
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                Browse our curated collection of gifts from verified vendors
              </p>
            </div>

            {/* Active Registry Badge */}
            {isHost && registry && (
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-[#A5914B]/30 px-4 py-3 shadow-sm">
                <Gift className="size-5 text-[#A5914B]" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Adding to</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {registry.title}
                  </span>
                </div>
                <Link
                  href={`/dashboard/h/registry/${registry.registry_code}`}
                  className="text-xs text-[#A5914B] hover:underline ml-2"
                >
                  View Registry
                </Link>
              </div>
            )}

            {!isHost && (
              <Link
                href="/login?next=/shop"
                className="inline-flex items-center gap-2 bg-[#A5914B] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#8B7A3F] transition-colors"
              >
                <Gift className="size-4" />
                Sign in to add gifts
              </Link>
            )}
          </div>
        </div>
      </div>

      <main
        id="shop-main-content"
        role="main"
        tabIndex={-1}
        aria-label="Gift shop"
        className="mx-auto max-w-6xl w-full px-4 py-6"
      >
        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search gifts..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-all text-sm"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setSearchQuery("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </form>

            {/* Filter & Sort Controls */}
            <div className="flex items-center gap-2">
              {/* Category Dropdown */}
              <div className="relative min-w-[140px]">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors text-sm font-medium cursor-pointer ${
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
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[#A5914B] text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors cursor-pointer ${
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
              <div className="flex flex-wrap gap-4 items-end">
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
                    <button
                      type="button"
                      onClick={handlePriceFilter}
                      className="px-3 py-1.5 bg-[#A5914B] text-white text-sm rounded-lg hover:bg-[#8B7A3F] transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {products.length} products
          </p>
        )}

        {/* Products Grid/List */}
        {loading && products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-[#A5914B]/30 border-t-[#A5914B] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : hasProducts ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300"
                  >
                    <div
                      className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden cursor-pointer"
                      onClick={() => openProductDetail(p)}
                    >
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
                      {p.vendor?.verified && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                            <BadgeCheck className="size-3" />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <Link
                        href={`/storefront/${p.vendor?.slug}`}
                        className="text-xs text-gray-500 hover:text-[#A5914B] flex items-center gap-1 mb-1"
                      >
                        <Store className="size-3" />
                        {p.vendor?.name}
                      </Link>
                      <p
                        className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#A5914B] transition-colors cursor-pointer"
                        onClick={() => openProductDetail(p)}
                      >
                        {p.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-[#A5914B]">
                          {p.price}
                        </p>
                        {isHost && p.stock > 0 && (
                          <div className="flex items-center gap-1">
                            {isProductInRegistry(p.id) ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openProductDetail(p)}
                                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors cursor-pointer"
                                  aria-label="View in registry"
                                >
                                  <Check className="size-4" />
                                </button>
                                <span className="text-xs text-green-600 font-medium">
                                  In Registry
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openAddToRegistry(p)}
                                className="p-2 bg-[#A5914B] text-white rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer"
                                aria-label="Add to registry"
                              >
                                <Plus className="size-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 flex"
                  >
                    <div
                      className="relative w-32 md:w-48 shrink-0 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                      onClick={() => openProductDetail(p)}
                    >
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
                      <Link
                        href={`/storefront/${p.vendor?.slug}`}
                        className="text-xs text-gray-500 hover:text-[#A5914B] flex items-center gap-1 mb-1"
                      >
                        <Store className="size-3" />
                        {p.vendor?.name}
                        {p.vendor?.verified && (
                          <BadgeCheck className="size-3 text-blue-500" />
                        )}
                      </Link>
                      <p
                        className="text-base font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#A5914B] transition-colors cursor-pointer"
                        onClick={() => openProductDetail(p)}
                      >
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
                        {isHost && p.stock > 0 && (
                          <div className="flex items-center gap-2">
                            {isProductInRegistry(p.id) ? (
                              <button
                                type="button"
                                onClick={() => openProductDetail(p)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors cursor-pointer"
                              >
                                <Check className="size-4" />
                                In Registry
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openAddToRegistry(p)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#A5914B] text-white text-sm font-medium rounded-xl hover:bg-[#8B7A3F] transition-colors cursor-pointer"
                              >
                                <Plus className="size-4" />
                                Add to Registry
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-[#A5914B] text-white font-semibold rounded-xl hover:bg-[#8B7A3F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
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
                : "Check back later for new products."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-2 bg-[#A5914B] text-white font-medium rounded-xl hover:bg-[#8B7A3F] transition-colors cursor-pointer"
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

      {/* Product Detail Modal */}
      <ProductDetailModal
        open={productDetailOpen}
        onOpenChange={closeProductDetail}
        product={selectedProduct}
        isHost={isHost}
        registry={registry}
      />

      {/* Add to Registry Modal */}
      <AddToRegistryModal
        open={addToRegistryOpen}
        onOpenChange={(open) => {
          if (!open) closeAddToRegistry();
        }}
        product={addToRegistryProduct}
        registry={registry}
      />
    </div>
  );
}
