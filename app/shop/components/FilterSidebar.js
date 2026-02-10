"use client";
import React from "react";
import { useShop } from "../context";
import SharedFilterSidebar from "../../components/FilterSidebar";

export default function FilterSidebar() {
  const {
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
  } = useShop();

  return (
    <SharedFilterSidebar
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
  );
}
