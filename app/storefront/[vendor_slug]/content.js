"use client";
import React, { useState, useEffect, useCallback } from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import Footer from "../../components/footer";
import Pagination from "../../components/Pagination";
import FilterSidebar from "../../components/FilterSidebar";
import {
  Store,
  MapPin,
  BadgeCheck,
  AlertTriangle,
  Search,
  Grid3X3,
  LayoutList,
  X,
  ShoppingBag,
  ShoppingCart,
  Globe,
  Phone,
  Filter,
} from "lucide-react";
import { useStorefront } from "./context";
import CartDrawer from "../../shop/components/CartDrawer";
import { getOrCreateGuestBrowserId } from "../../utils/guest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/Select";

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "popular", label: "Most Popular" },
  { id: "best_rated", label: "Best Rated" },
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
    products,
    productsLoading,
    totalPages,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    selectedCategories,
    sortBy,
    setSortBy,
    priceRange,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    ratingFilter,
    setRatingFilter,
    toggleCategory,
    toggleParentCategory,
    setAndApplyPriceRange,
  } = useStorefront();

  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const globalSearchHref = localSearch.trim()
    ? `/search?q=${encodeURIComponent(localSearch.trim())}`
    : "/search";

  const isClosed = (vendor?.shop_status || "").toLowerCase() === "closed";
  const logoSrc = vendor?.logo_url || vendor?.logo || "/host/toaster.png";

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery]);

  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setSearchQuery(localSearch);
      applyFilters();
    },
    [localSearch, setSearchQuery, applyFilters],
  );

  const hasProducts = products.length > 0;

  const fetchCartCount = useCallback(async () => {
    try {
      const guestBrowserId = getOrCreateGuestBrowserId();
      const url = new URL("/api/shop/cart-product-ids", window.location.origin);
      if (guestBrowserId) url.searchParams.set("guestBrowserId", guestBrowserId);
      url.searchParams.set("_ts", String(Date.now()));
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      const count = Array.isArray(body?.items) ? body.items.length : 0;
      setCartCount(count);
    } catch {
      // ignore cart count fetch errors
    }
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  useEffect(() => {
    const handleFocus = () => {
      fetchCartCount();
    };
    const handleVisibility = () => {
      if (!document.hidden) fetchCartCount();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchCartCount]);

  if (vendorLoading) {
    return (
      <div className="min-h-screen font-brasley-medium bg-[#FAFAFA] dark:bg-gray-950" />
    );
  }

  if (!vendor || !vendor.verified) {
    return (
      <div className="min-h-screen font-brasley-medium bg-[#FAFAFA] dark:bg-gray-950" />
    );
  }

  return (
    <div className="w-full pt-24 dark:text-white bg-linear-to-b from-[#FAFAFA] to-white dark:from-gray-950 dark:to-gray-900 min-h-screen font-brasley-medium w-full pt-24">
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
                <ImageWithFallback
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
              {Array.isArray(vendor?.category_chips) &&
                vendor.category_chips.length > 0 && (
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
                  {products.length}
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

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm">
          <div className="flex gap-3 items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
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
            <Link
              href={globalSearchHref}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#A5914B]/30 bg-white dark:bg-gray-800 text-[#8B7A3F] text-sm font-medium hover:bg-[#A5914B] hover:text-white transition-colors"
            >
              <Search className="size-4" />
              Search all
            </Link>
            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors text-sm font-medium cursor-pointer ${
                showFilters || hasActiveFilters
                  ? "bg-[#A5914B] text-white border-[#A5914B]"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Filter className="size-4" />
              Filters
            </button>
            {/* Sort & View (desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="min-w-[220px] rounded-xl py-2.5 text-sm font-medium">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
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
        </div>

        {/* Sidebar + Products Layout */}
        <div className="flex gap-6">
          {/* Left Sidebar Filters — desktop always visible, mobile toggleable */}
          <aside
            className={`${
              showFilters ? "block" : "hidden"
            } lg:block w-full lg:w-60 shrink-0`}
          >
            <FilterSidebar
              categories={categories}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              toggleParentCategory={toggleParentCategory}
              setAndApplyPriceRange={setAndApplyPriceRange}
              priceRange={priceRange}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              ratingFilter={ratingFilter}
              setRatingFilter={setRatingFilter}
            />
          </aside>

          {/* Products Content */}
          <div className="flex-1 min-w-0">
            {hasActiveFilters && (
              <p className="text-sm text-gray-500 mb-4">
                Showing {products.length} products
              </p>
            )}

            {productsLoading && products.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-[#A5914B]/30 border-t-[#A5914B] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : hasProducts ? (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/storefront/${vendor.slug}/${p.product_code || p.id}`}
                        className={`group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 ${
                          isClosed ? "opacity-75" : ""
                        }`}
                      >
                        <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
                          <ImageWithFallback
                            src={p.image}
                            alt={p.name}
                            fill
                            priority
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
                          {p.isOnSale && !isClosed && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {p.discountPercent}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-[#A5914B] transition-colors">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-bold text-[#A5914B]">
                              {p.price}
                            </p>
                            {p.isOnSale && p.originalPrice && (
                              <p className="text-sm text-gray-400 line-through">
                                {p.originalPrice}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/storefront/${vendor.slug}/${p.product_code || p.id}`}
                        className={`group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 flex ${
                          isClosed ? "opacity-75" : ""
                        }`}
                      >
                        <div className="relative w-32 md:w-48 shrink-0 bg-gray-50 dark:bg-gray-800">
                          <ImageWithFallback
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 128px, 192px"
                          />
                          {p.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                                Out of Stock
                              </span>
                            </div>
                          )}
                          {p.isOnSale && !isClosed && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {p.discountPercent}% OFF
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
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold text-[#A5914B]">
                                {p.price}
                              </p>
                              {p.isOnSale && p.originalPrice && (
                                <p className="text-sm text-gray-400 line-through">
                                  {p.originalPrice}
                                </p>
                              )}
                            </div>
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

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={productsLoading}
                  className="mt-8"
                />
              </>
            ) : (
              <div className="py-16 text-center">
                <ShoppingBag className="size-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {hasActiveFilters
                    ? "No products found"
                    : "No products available"}
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
                    className="px-6 py-2 bg-[#A5914B] text-white font-medium rounded-xl hover:bg-[#8B7A3F] transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <div className="mt-12">
        <Footer />
      </div>

      {/* Floating Cart Widget */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#A5914B] text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-[#8B7A3F] hover:shadow-xl transition-all cursor-pointer"
          aria-label={`View cart with ${cartCount} items`}
        >
          <span className="relative">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2.5 bg-white text-[#A5914B] text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
              {cartCount}
            </span>
          </span>
          <span className="text-sm font-semibold ml-1">View Cart</span>
        </button>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartCount={cartCount}
        onCartChanged={fetchCartCount}
      />
    </div>
  );
}
