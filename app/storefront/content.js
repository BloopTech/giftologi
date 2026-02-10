"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/footer";
import Pagination from "../components/Pagination";
import { useStorefrontDirectory } from "./context";
import {
  Search,
  Store,
  MapPin,
  BadgeCheck,
  X,
  ChevronDown,
  ShoppingBag,
  Filter,
} from "lucide-react";

export default function StorefrontDirectoryContent() {
  const {
    vendors,
    loading,
    totalPages,
    page,
    setPage,
    allCategories,
    allLocations,
    localSearch,
    setLocalSearch,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    locationFilter,
    setLocationFilter,
    hasActiveFilters,
    clearFilters,
  } = useStorefrontDirectory();

  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="dark:text-white bg-linear-to-b from-[#FAFAFA] to-white dark:from-gray-950 dark:to-gray-900 min-h-screen font-brasley-medium">
      {/* Hero */}
      <div className="relative bg-linear-to-r from-[#A5914B]/10 via-[#A5914B]/5 to-transparent">
        <div className="mx-auto max-w-6xl w-full px-4 py-10 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Browse Stores
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg max-w-xl">
            Discover verified vendors and gift shops. Find the perfect store for
            any occasion.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl w-full px-4 py-6">
        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm">
          <div className="flex gap-3 items-center flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-all text-sm"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setSearchQuery(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Category dropdown */}
            <div className="relative">
              <select
                value={categoryFilter || ""}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
              >
                <option value="">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Location dropdown */}
            <div className="relative">
              <select
                value={locationFilter || ""}
                onChange={(e) => setLocationFilter(e.target.value || null)}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
              >
                <option value="">All Locations</option>
                {allLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium cursor-pointer"
            >
              <Filter className="size-4" />
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {hasActiveFilters && !loading && (
          <p className="text-sm text-gray-500 mb-4">
            {vendors.length} store{vendors.length === 1 ? "" : "s"} shown
          </p>
        )}

        {/* Vendor Grid */}
        {loading && vendors.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-[#A5914B]/30 border-t-[#A5914B] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading stores...</p>
          </div>
        ) : vendors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {vendors.map((v) => (
              <Link
                key={v.id}
                href={`/storefront/${v.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300"
              >
                {/* Card Header — logo + name */}
                <div className="flex items-center gap-4 p-5 pb-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-white shrink-0 flex items-center justify-center">
                    <Image
                      src={v.logo_src}
                      alt={v.business_name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#A5914B] transition-colors">
                        {v.business_name}
                      </h2>
                      {v.verified && (
                        <BadgeCheck className="size-4 text-blue-500 shrink-0" />
                      )}
                    </div>
                    {v.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="size-3" />
                        {v.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {v.description && (
                  <p className="px-5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {v.description}
                  </p>
                )}

                {/* Category chips */}
                {v.category_chips.length > 0 && (
                  <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                    {v.category_chips.slice(0, 3).map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#A5914B]/10 text-[#A5914B] rounded-full text-xs font-medium"
                      >
                        <Store className="size-3" />
                        {chip}
                      </span>
                    ))}
                    {v.category_chips.length > 3 && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full text-xs">
                        +{v.category_chips.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#A5914B] group-hover:underline">
                    Visit Store →
                  </span>
                </div>
              </Link>
            ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={loading}
              className="mt-8"
            />
          </>
        ) : (
          <div className="py-20 text-center">
            <ShoppingBag className="size-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {hasActiveFilters
                ? "No stores found"
                : "No stores available yet"}
            </h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Check back soon for new vendors."}
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

        <div className="mt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
