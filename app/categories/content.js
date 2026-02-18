"use client";
import React, { useEffect, useMemo, useState } from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import { Search, Grid3X3, ChevronRight, ShoppingBag, X } from "lucide-react";
import { createClient as createSupabaseClient } from "../utils/supabase/client";
import Footer from "../components/footer";

export default function CategoriesContent() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    const supabase = createSupabaseClient();

    (async () => {
      const { data, error } = await supabase.rpc("get_category_browse_stats");
      if (ignore) return;
      if (!error && Array.isArray(data)) {
        setCategories(data);
      }
      setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Build parent → children tree
  const categoryTree = useMemo(() => {
    const parents = categories.filter((c) => !c.parent_category_id);
    const childMap = {};
    categories.forEach((c) => {
      if (c.parent_category_id) {
        if (!childMap[c.parent_category_id]) childMap[c.parent_category_id] = [];
        childMap[c.parent_category_id].push(c);
      }
    });
    return parents.map((p) => ({
      ...p,
      children: childMap[p.id] || [],
      totalCount:
        Number(p.product_count) +
        (childMap[p.id] || []).reduce(
          (sum, child) => sum + Number(child.product_count),
          0
        ),
    }));
  }, [categories]);

  const filtered = useMemo(() => {
    if (!search.trim()) return categoryTree;
    const q = search.trim().toLowerCase();
    return categoryTree.filter(
      (parent) =>
        parent.name.toLowerCase().includes(q) ||
        parent.children.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [categoryTree, search]);

  return (
    <div className="w-full pt-24 dark:text-white bg-linear-to-b from-[#FAFAFA] to-white dark:from-gray-950 dark:to-gray-900 min-h-screen font-brasley-medium">
      {/* Hero */}
      <div className="relative bg-linear-to-r from-[#A5914B]/10 via-[#A5914B]/5 to-transparent">
        <div className="mx-auto max-w-6xl w-full px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center justify-between">
            <div>
              <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold mb-2">
                Browse Categories
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                Explore our curated gift collections by category
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#A5914B] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#8B7A3F] transition-colors"
            >
              <ShoppingBag className="size-4" />
              View All Products
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl w-full px-4 py-6">
        {/* Search */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-8 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none transition-all text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-[#A5914B]/30 border-t-[#A5914B] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading categories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Grid3X3 className="size-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No categories found
            </h3>
            <p className="text-gray-500">
              {search
                ? "Try a different search term."
                : "No categories with products available."}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map((parent) => (
              <section key={parent.id}>
                {/* Parent Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <Link
                    href={`/categories/${parent.slug}`}
                    className="group flex items-center gap-2"
                  >
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white group-hover:text-[#A5914B] transition-colors">
                      {parent.name}
                    </h2>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {parent.totalCount} products
                    </span>
                    <ChevronRight className="size-4 text-gray-400 group-hover:text-[#A5914B] transition-colors" />
                  </Link>
                </div>

                {/* Category Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Parent card */}
                  <Link
                    href={`/categories/${parent.slug}`}
                    className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {parent.sample_image ? (
                        <ImageWithFallback
                          src={parent.sample_image}
                          alt={parent.name}
                          fill
                          priority
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingBag className="size-10 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-semibold">
                          All {parent.name}
                        </p>
                        <p className="text-white/70 text-xs">
                          {parent.product_count} products
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Child category cards */}
                  {parent.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/categories/${child.slug}`}
                      className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300"
                    >
                      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        {child.sample_image ? (
                          <ImageWithFallback
                            src={child.sample_image}
                            alt={child.name}
                            fill
                            priority
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ShoppingBag className="size-10 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-semibold">
                            {child.name}
                          </p>
                          <p className="text-white/70 text-xs">
                            {child.product_count} products
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
