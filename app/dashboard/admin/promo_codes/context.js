"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { PROMO_SCOPES } from "../../../utils/promos";

const PromoCodesContext = createContext(null);

const sortByName = (list) =>
  (list || []).slice().sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || "")),
  );

const buildTargetMap = (targets) => {
  const map = new Map();
  (targets || []).forEach((target) => {
    if (!target?.promo_id) return;
    const existing = map.get(target.promo_id) || {
      productIds: new Set(),
      categoryIds: new Set(),
    };
    if (target.product_id) existing.productIds.add(target.product_id);
    if (target.category_id) existing.categoryIds.add(target.category_id);
    map.set(target.promo_id, existing);
  });
  return map;
};

export function PromoCodesProvider({ children }) {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [promos, setPromos] = useState([]);
  const [promoTargets, setPromoTargets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  // Cache for selected products (so we can show names even after search changes)
  const [selectedProductsCache, setSelectedProductsCache] = useState(new Map());

  const refreshPromos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: promosData, error: promosError } = await supabase
        .from("promo_codes")
        .select(
          "id, code, description, percent_off, scope, vendor_id, active, start_at, end_at, min_spend, usage_limit, usage_count, per_user_limit, target_shippable, target_product_type, created_at",
        )
        .eq("scope", PROMO_SCOPES.PLATFORM)
        .order("created_at", { ascending: false });

      if (promosError) throw promosError;

      const promoIds = (promosData || []).map((p) => p.id).filter(Boolean);
      let targets = [];
      if (promoIds.length) {
        const { data: targetData, error: targetError } = await supabase
          .from("promo_code_targets")
          .select("promo_id, product_id, category_id")
          .in("promo_id", promoIds);
        if (targetError) throw targetError;
        targets = targetData || [];
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, parent_category_id")
        .order("name");

      if (categoriesError) throw categoriesError;

      setPromos(promosData || []);
      setPromoTargets(targets);
      setCategories(categoriesData || []);

      // Pre-load products referenced in targets so we can display names
      const targetProductIds = [
        ...new Set(targets.filter((t) => t.product_id).map((t) => t.product_id)),
      ];
      if (targetProductIds.length) {
        const { data: targetProducts } = await supabase
          .from("products")
          .select(
            "id, name, product_code, images, vendor_id, status, active, is_shippable, product_type, vendor:vendors!Products_vendor_id_fkey(id, business_name)"
          )
          .in("id", targetProductIds);
        if (targetProducts) {
          setSelectedProductsCache((prev) => {
            const next = new Map(prev);
            targetProducts.forEach((p) => next.set(p.id, p));
            return next;
          });
        }
      }
    } catch (err) {
      setError(err?.message || "Unable to load promo codes.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshPromos();
  }, [refreshPromos]);

  // Debounced product search
  const searchProducts = useCallback(
    async (query) => {
      const trimmed = (query || "").trim();
      setProductSearchLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (trimmed) params.set("q", trimmed);
        const res = await fetch(`/api/dashboard/product-search?${params}`);
        if (!res.ok) {
          setProductSearchResults([]);
          return;
        }
        const body = await res.json();
        const products = Array.isArray(body.products) ? body.products : [];
        setProductSearchResults(products);
        // Add to cache
        setSelectedProductsCache((prev) => {
          const next = new Map(prev);
          products.forEach((p) => next.set(p.id, p));
          return next;
        });
      } catch {
        setProductSearchResults([]);
      } finally {
        setProductSearchLoading(false);
      }
    },
    [],
  );

  const handleProductSearchChange = useCallback(
    (query) => {
      setProductSearchQuery(query);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        searchProducts(query);
      }, 350);
    },
    [searchProducts],
  );

  // Load initial products on mount
  useEffect(() => {
    searchProducts("");
  }, [searchProducts]);

  const targetMap = useMemo(() => buildTargetMap(promoTargets), [promoTargets]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const categoriesByParentId = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => {
      const parentId = c.parent_category_id || null;
      const list = map.get(parentId) || [];
      list.push(c);
      map.set(parentId, list);
    });
    return map;
  }, [categories]);

  const parentCategoryOptions = useMemo(
    () => sortByName(categoriesByParentId.get(null) || []),
    [categoriesByParentId],
  );

  const getSubcategories = useCallback(
    (parentId) => sortByName(categoriesByParentId.get(parentId) || []),
    [categoriesByParentId],
  );

  const value = useMemo(
    () => ({
      promos,
      promoTargets,
      targetMap,
      categories,
      categoriesById,
      categoriesByParentId,
      parentCategoryOptions,
      getSubcategories,
      loading,
      error,
      refreshPromos,
      // Product search
      productSearchQuery,
      productSearchResults,
      productSearchLoading,
      handleProductSearchChange,
      selectedProductsCache,
      setSelectedProductsCache,
    }),
    [
      promos,
      promoTargets,
      targetMap,
      categories,
      categoriesById,
      categoriesByParentId,
      parentCategoryOptions,
      getSubcategories,
      loading,
      error,
      refreshPromos,
      productSearchQuery,
      productSearchResults,
      productSearchLoading,
      handleProductSearchChange,
      selectedProductsCache,
    ],
  );

  return (
    <PromoCodesContext.Provider value={value}>
      {children}
    </PromoCodesContext.Provider>
  );
}

export const usePromoCodes = () => {
  const ctx = useContext(PromoCodesContext);
  if (!ctx) throw new Error("usePromoCodes must be used within PromoCodesProvider");
  return ctx;
};
