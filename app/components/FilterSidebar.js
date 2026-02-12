"use client";
import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { Slider } from "./Slider";

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

const MAX_PRICE = 10000;

export default function FilterSidebar({
  categories,
  selectedCategories,
  toggleCategory,
  toggleParentCategory,
  setAndApplyPriceRange,
  priceRange,
  clearFilters,
  hasActiveFilters,
  sortBy,
  setSortBy,
  ratingFilter,
  setRatingFilter,
  onSaleFilter,
  setOnSaleFilter,
  inStockFilter,
  setInStockFilter,
}) {
  // Build category tree from flat list
  const categoryTree = useMemo(() => {
    const parents = categories.filter((c) => !c.parent_category_id);
    const childMap = {};
    categories.forEach((c) => {
      if (c.parent_category_id) {
        if (!childMap[c.parent_category_id])
          childMap[c.parent_category_id] = [];
        childMap[c.parent_category_id].push(c);
      }
    });
    return parents.map((p) => ({
      ...p,
      children: childMap[p.id] || [],
    }));
  }, [categories]);

  // Track expanded parent categories (default expanded)
  const [expanded, setExpanded] = useState({});

  const isExpanded = useCallback(
    (catId) => expanded[catId] !== false,
    [expanded]
  );

  const toggleExpand = useCallback((catId) => {
    setExpanded((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  // Price slider local state
  const [priceValues, setPriceValues] = useState([
    Number(priceRange.min) || 0,
    Number(priceRange.max) || MAX_PRICE,
  ]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sticky top-4 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Categories
        </h3>
        <ul className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
          {categoryTree.map((parent) => {
            const open = isExpanded(parent.id);
            const childIds = parent.children.map((c) => c.id);
            const allChildrenSelected =
              childIds.length > 0 &&
              childIds.every((id) => selectedCategories.includes(id));
            const someChildrenSelected = childIds.some((id) =>
              selectedCategories.includes(id)
            );
            const parentSelected = selectedCategories.includes(parent.id);
            const isChecked = parentSelected || allChildrenSelected;
            const isIndeterminate = !isChecked && someChildrenSelected;

            return (
              <li key={parent.id}>
                <div className="flex items-center gap-1.5 py-1">
                  {parent.children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(parent.id)}
                      className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                    >
                      {open ? (
                        <ChevronDown className="size-3.5 text-gray-400" />
                      ) : (
                        <ChevronRight className="size-3.5 text-gray-400" />
                      )}
                    </button>
                  ) : (
                    <span className="w-[18px]" />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer flex-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={() =>
                        toggleParentCategory(parent.id, childIds)
                      }
                      className="rounded border-gray-300 text-[#A5914B] focus:ring-[#A5914B]/20 cursor-pointer accent-[#A5914B]"
                    />
                    <span className="font-medium">{parent.name}</span>
                  </label>
                </div>
                {open && parent.children.length > 0 && (
                  <ul className="ml-7 space-y-0.5">
                    {parent.children.map((child) => (
                      <li key={child.id}>
                        <label className="flex items-center gap-2 py-0.5 cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(child.id)}
                            onChange={() => toggleCategory(child.id)}
                            className="rounded border-gray-300 text-[#A5914B] focus:ring-[#A5914B]/20 cursor-pointer accent-[#A5914B]"
                          />
                          {child.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Quick Filters */}
      {(setOnSaleFilter || setInStockFilter) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Quick Filters
          </h3>
          <div className="space-y-2">
            {setOnSaleFilter && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <input
                  type="checkbox"
                  checked={!!onSaleFilter}
                  onChange={() => setOnSaleFilter(!onSaleFilter)}
                  className="rounded border-gray-300 text-[#A5914B] focus:ring-[#A5914B]/20 cursor-pointer accent-[#A5914B]"
                />
                <span className="flex items-center gap-1.5">
                  On Sale
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">
                    SALE
                  </span>
                </span>
              </label>
            )}
            {setInStockFilter && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <input
                  type="checkbox"
                  checked={inStockFilter !== false}
                  onChange={() => setInStockFilter(inStockFilter === false ? true : false)}
                  className="rounded border-gray-300 text-[#A5914B] focus:ring-[#A5914B]/20 cursor-pointer accent-[#A5914B]"
                />
                In Stock Only
              </label>
            )}
          </div>
        </div>
      )}

      {/* Price Range Slider */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Price (GHS)
        </h3>
        <Slider
          value={priceValues}
          onValueChange={setPriceValues}
          onValueCommit={([min, max]) => {
            setAndApplyPriceRange({ min, max });
          }}
          min={0}
          max={MAX_PRICE}
          step={10}
          className="mb-3"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">
            GHS {priceValues[0].toLocaleString()}
          </span>
          <span className="text-gray-300">—</span>
          <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">
            GHS {priceValues[1].toLocaleString()}
          </span>
        </div>
      </div>

      {/* Reviews / Rating */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Reviews
        </h3>
        <ul className="space-y-1">
          {[4, 3, 2, 1].map((min) => {
            const isActive = ratingFilter === String(min);
            return (
              <li key={min}>
                <button
                  type="button"
                  onClick={() => setRatingFilter(isActive ? "" : String(min))}
                  className={`w-full flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#A5914B]/10 text-[#8B7A3F] font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`size-3.5 ${
                          i < min
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </span>
                  <span>& Up</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sort (mobile only — desktop sort is in the search bar) */}
      <div className="lg:hidden">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Sort By
        </h3>
        <ul className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  sortBy === opt.id
                    ? "bg-[#A5914B]/10 text-[#8B7A3F] font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            clearFilters();
            setPriceValues([0, MAX_PRICE]);
          }}
          className="w-full px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
