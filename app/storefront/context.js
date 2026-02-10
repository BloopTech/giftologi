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
import { useQueryState, parseAsString } from "nuqs";
import { createClient as createSupabaseClient } from "../utils/supabase/client";

const StorefrontDirectoryContext = createContext(null);

const VENDORS_PER_PAGE = 12;

const parseCategoryChips = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed))
        return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
    } catch {
      /* fallthrough */
    }
  }
  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const mapVendor = (v) => ({
  ...v,
  category_chips: parseCategoryChips(v.category),
  logo_src: v.logo_url || v.logo || "/host/toaster.png",
  location: [v.address_city, v.address_country].filter(Boolean).join(", "),
});

export function StorefrontDirectoryProvider({
  children,
  initialSearchParams,
}) {
  const supabase = useMemo(() => createSupabaseClient(), []);

  // URL params with nuqs
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(initialSearchParams?.q || "")
  );
  const [categoryFilter, setCategoryFilter] = useQueryState(
    "category",
    parseAsString.withDefault(initialSearchParams?.category || "")
  );
  const [locationFilter, setLocationFilter] = useQueryState(
    "location",
    parseAsString.withDefault(initialSearchParams?.location || "")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1")
  );

  const page = useMemo(() => {
    const n = parseInt(pageParam, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [pageParam]);

  // Local state
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const [allCategories, setAllCategories] = useState([]);
  const [allLocations, setAllLocations] = useState([]);

  // Refs for tracking fetch state
  const lastFilterRef = useRef("");
  const lastPageRef = useRef(1);

  // Build filter key for detecting changes
  const filterKey = useMemo(
    () =>
      [searchQuery, categoryFilter, locationFilter].join("|"),
    [searchQuery, categoryFilter, locationFilter]
  );

  // Fetch vendors with server-side pagination
  useEffect(() => {
    let ignore = false;

    const fetchVendors = async () => {
      setLoading(true);

      try {
        // Reset to page 1 if filters changed
        if (filterKey !== lastFilterRef.current && page !== 1) {
          setVendors([]);
          setPageParam("1");
          lastFilterRef.current = filterKey;
          lastPageRef.current = 1;
          return;
        }

        const from = (page - 1) * VENDORS_PER_PAGE;
        const to = from + VENDORS_PER_PAGE - 1;

        let query = supabase
          .from("vendors")
          .select(
            "id, business_name, description, logo, logo_url, slug, shop_status, category, verified, address_city, address_country",
            { count: "exact" }
          )
          .eq("shop_status", "active")
          .eq("verified", true)
          .order("verified", { ascending: false })
          .order("business_name", { ascending: true });

        if (searchQuery?.trim()) {
          query = query.ilike("business_name", `%${searchQuery.trim()}%`);
        }

        if (categoryFilter) {
          query = query.ilike("category", `%${categoryFilter}%`);
        }

        if (locationFilter) {
          query = query.ilike("address_city", `%${locationFilter}%`);
        }

        const { data, error, count } = await query.range(from, to);
        if (ignore || error) return;

        const mapped = (data || []).map(mapVendor);
        setVendors(mapped);
        setTotalCount(count || 0);

        lastFilterRef.current = filterKey;
        lastPageRef.current = page;

        // Derive unique categories & locations from full dataset
        const { data: allVendors } = await supabase
          .from("vendors")
          .select("category, address_city")
          .eq("shop_status", "active")
          .eq("verified", true);

        if (!ignore && allVendors) {
          const cats = new Set();
          const locs = new Set();
          allVendors.forEach((v) => {
            const chips = parseCategoryChips(v.category);
            chips.forEach((c) => cats.add(c));
            if (v.address_city) locs.add(v.address_city);
          });
          setAllCategories([...cats].sort());
          setAllLocations([...locs].sort());
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchVendors();
    return () => {
      ignore = true;
    };
  }, [
    supabase,
    page,
    filterKey,
    searchQuery,
    categoryFilter,
    locationFilter,
    setPageParam,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch || null);
        setPageParam("1");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery, setPageParam]);

  const hasActiveFilters = !!(
    searchQuery ||
    categoryFilter ||
    locationFilter
  );

  const clearFilters = useCallback(() => {
    setLocalSearch("");
    setSearchQuery(null);
    setCategoryFilter(null);
    setLocationFilter(null);
    setPageParam("1");
  }, [setSearchQuery, setCategoryFilter, setLocationFilter, setPageParam]);

  const totalPages = useMemo(() => {
    const calc = Math.ceil(totalCount / VENDORS_PER_PAGE);
    return calc > 0 ? calc : 1;
  }, [totalCount]);

  const setPage = useCallback(
    (value) => {
      const next = Number(value);
      const normalized = Number.isFinite(next) && next > 0 ? next : 1;
      setPageParam(String(normalized));
    },
    [setPageParam]
  );

  const value = useMemo(
    () => ({
      vendors,
      loading,
      totalPages,
      page,
      setPage,

      allCategories,
      allLocations,

      searchQuery,
      localSearch,
      setLocalSearch,
      setSearchQuery,

      categoryFilter,
      setCategoryFilter,

      locationFilter,
      setLocationFilter,

      hasActiveFilters,
      clearFilters,
    }),
    [
      vendors,
      loading,
      totalPages,
      page,
      setPage,
      allCategories,
      allLocations,
      searchQuery,
      localSearch,
      setLocalSearch,
      setSearchQuery,
      categoryFilter,
      setCategoryFilter,
      locationFilter,
      setLocationFilter,
      hasActiveFilters,
      clearFilters,
    ]
  );

  return (
    <StorefrontDirectoryContext.Provider value={value}>
      {children}
    </StorefrontDirectoryContext.Provider>
  );
}

export function useStorefrontDirectory() {
  const ctx = useContext(StorefrontDirectoryContext);
  if (!ctx) {
    throw new Error(
      "useStorefrontDirectory must be used within a StorefrontDirectoryProvider"
    );
  }
  return ctx;
}
