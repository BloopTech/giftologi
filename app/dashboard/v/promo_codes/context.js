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

const VendorPromoCodesContext = createContext(null);

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

export function VendorPromoCodesProvider({ children }) {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [vendor, setVendor] = useState(null);
  const [promos, setPromos] = useState([]);
  const [promoTargets, setPromoTargets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProductsCache, setSelectedProductsCache] = useState(new Map());

  const refreshPromos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userResult?.user?.id;
      if (!userId) {
        setVendor(null);
        setError("You must be signed in to view promo codes.");
        return;
      }

      const { data: vendorRecord, error: vendorError } = await supabase
        .from("vendors")
        .select("id, business_name, shop_status")
        .eq("profiles_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vendorError) throw vendorError;

      if (!vendorRecord?.id) {
        setVendor(null);
        setError("Vendor profile not found.");
        return;
      }

      setVendor(vendorRecord);

      const { data: promosData, error: promosError } = await supabase
        .from("promo_codes")
        .select(
          "id, code, description, percent_off, scope, vendor_id, active, start_at, end_at, min_spend, usage_limit, usage_count, per_user_limit, target_shippable, created_at",
        )
        .eq("scope", PROMO_SCOPES.VENDOR)
        .eq("vendor_id", vendorRecord.id)
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

      // Pre-load products referenced in targets
      const targetProductIds = [
        ...new Set(targets.filter((t) => t.product_id).map((t) => t.product_id)),
      ];
      if (targetProductIds.length) {
        const { data: targetProducts } = await supabase
          .from("products")
          .select("id, name, product_code, images, vendor_id, status, active, is_shippable")
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
      vendor,
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
      selectedProductsCache,
      setSelectedProductsCache,
    }),
    [
      vendor,
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
      selectedProductsCache,
    ],
  );

  return (
    <VendorPromoCodesContext.Provider value={value}>
      {children}
    </VendorPromoCodesContext.Provider>
  );
}

export const useVendorPromoCodes = () => {
  const ctx = useContext(VendorPromoCodesContext);
  if (!ctx) throw new Error("useVendorPromoCodes must be used within VendorPromoCodesProvider");
  return ctx;
};
