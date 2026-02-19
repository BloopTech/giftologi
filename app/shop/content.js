"use client";
import React, { useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/footer";
import {
  Search,
  Grid3X3,
  LayoutList,
  ChevronDown,
  X,
  ShoppingBag,
  ShoppingCart,
  Plus,
  BadgeCheck,
  Gift,
  Store,
  Filter,
} from "lucide-react";
import { useShop } from "./context";
import ProductDetailModal from "./components/ProductDetailModal";
import AddToRegistryModal from "./components/AddToRegistryModal";
import FilterSidebar from "./components/FilterSidebar";
import ProductCard from "./components/ProductCard";
import ProductListItem from "./components/ProductListItem";
import CartDrawer from "./components/CartDrawer";
import Pagination from "../components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/Select";

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

export default function ShopContent() {
  const {
    products,
    loading,
    totalPages,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    selectedCategories,
    sortBy,
    setSortBy,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    registry,
    isHost,
    isProductInRegistry,
    openProductDetail,
    openAddToRegistry,
    selectedProduct,
    productDetailOpen,
    closeProductDetail,
    addToRegistryOpen,
    addToRegistryProduct,
    closeAddToRegistry,
    cartCount,
    cartCheckoutUrl,
  } = useShop();

  const [cartDrawerOpen, setCartDrawerOpen] = React.useState(false);

  const [viewMode, setViewMode] = React.useState("grid");
  const [showFilters, setShowFilters] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState(searchQuery);
  const globalSearchHref = localSearch.trim()
    ? `/search?q=${encodeURIComponent(localSearch.trim())}`
    : "/search";

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
  }, [searchQuery, selectedCategories, sortBy]);

  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setSearchQuery(localSearch);
      applyFilters();
    },
    [localSearch, setSearchQuery, applyFilters],
  );

  const hasProducts = products.length > 0;

  return (
    <div className="dark:text-white bg-linear-to-b from-[#FAFAFA] to-white dark:from-gray-950 dark:to-gray-900 min-h-screen font-brasley-medium">
      <Link
        href="#shop-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </Link>

      {/* Hero Header */}
      <div className="pt-24 relative bg-linear-to-r from-[#A5914B]/10 via-[#A5914B]/5 to-transparent">
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
                href="/storefront"
                className="inline-flex items-center gap-2 bg-[#A5914B] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#8B7A3F] transition-colors"
              >
                <Gift className="size-4" />
                Browse Stores
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
        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm">
          <div className="flex gap-3 items-center">
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
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
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
            <FilterSidebar />
          </aside>

          {/* Products Content */}
          <div className="flex-1 min-w-0">
            {hasActiveFilters && (
              <p className="text-sm text-gray-500 mb-4">
                Showing {products.length} products
              </p>
            )}

            {loading && products.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-[#A5914B]/30 border-t-[#A5914B] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : hasProducts ? (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {products.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {products.map((p) => (
                      <ProductListItem key={p.id} product={p} />
                    ))}
                  </div>
                )}

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={loading}
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
      />

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
