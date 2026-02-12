"use client";
import React from "react";
import SharedFilterSidebar from "../../components/FilterSidebar";
import { useCategoryShop } from "./context";

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
    onSaleFilter,
    setOnSaleFilter,
  } = useCategoryShop();

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
      onSaleFilter={onSaleFilter}
      setOnSaleFilter={setOnSaleFilter}
    />
  );
}
