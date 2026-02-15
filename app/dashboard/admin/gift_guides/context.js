"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

// Labels = filter/category options. 
// Gift Guides = curated product lists that use those labels.
const AdminGiftGuidesContext = createContext({});

export const AdminGiftGuidesProvider = ({ children }) => {
  const value = useAdminGiftGuidesProviderValue();
  return (
    <AdminGiftGuidesContext.Provider value={value}>
      {children}
    </AdminGiftGuidesContext.Provider>
  );
};

export function useAdminGiftGuidesContext() {
  return useContext(AdminGiftGuidesContext);
}

function useAdminGiftGuidesProviderValue() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // DB-driven labels
  const [occasionLabels, setOccasionLabels] = useState([]);
  const [budgetLabels, setBudgetLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(true);

  // Unassigned products (server-side paginated via RPC)
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const [unassignedTotalCount, setUnassignedTotalCount] = useState(0);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const UNASSIGNED_PAGE_SIZE = 20;

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // For editing / managing guide items
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideItems, setGuideItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Products search for adding to guide
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Fetch all guides + labels in parallel
  useEffect(() => {
    let ignore = false;
    const fetchAll = async () => {
      setLoading(true);
      setLabelsLoading(true);
      setError(null);

      const [guidesRes, occasionsRes, budgetsRes] = await Promise.all([
        supabase
          .from("gift_guides")
          .select("id, title, slug, description, cover_image, occasion, budget_range, is_published, sort_order, created_at, updated_at")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("gift_guide_occasions")
          .select("id, value, label, sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("gift_guide_budget_ranges")
          .select("id, value, label, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

      if (ignore) return;

      if (guidesRes.error) {
        setError(guidesRes.error.message);
        setLoading(false);
        setLabelsLoading(false);
        return;
      }

      setGuides(guidesRes.data || []);
      setOccasionLabels(occasionsRes.data || []);
      setBudgetLabels(budgetsRes.data || []);
      setLoading(false);
      setLabelsLoading(false);
    };

    fetchAll();
    return () => {
      ignore = true;
    };
  }, [supabase, refreshKey]);

  // Fetch items for selected guide
  const fetchGuideItems = useCallback(
    async (guideId) => {
      if (!guideId) return;
      setLoadingItems(true);
      const { data } = await supabase
        .from("gift_guide_items")
        .select(
          `id, sort_order, editor_note, product:products(id, name, price, images, stock_qty, vendor:vendors(id, business_name, slug))`
        )
        .eq("guide_id", guideId)
        .order("sort_order", { ascending: true });
      setGuideItems((data || []).filter((i) => i.product));
      setLoadingItems(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (selectedGuide?.id) {
      fetchGuideItems(selectedGuide.id);
    } else {
      setGuideItems([]);
    }
  }, [selectedGuide?.id, fetchGuideItems]);


  // Normalize RPC rows to match the { vendor: { id, business_name } } shape used by UI
  const normalizeRpcProducts = useCallback(
    (rows) =>
      (rows || []).map((p) => ({
        ...p,
        vendor: { id: p.vendor_id, business_name: p.vendor_name },
      })),
    []
  );

  // Search products to add to a guide — uses DB function with trigram similarity
  const searchProducts = useCallback(
    async (query) => {
      if (!query?.trim()) {
        setProductResults([]);
        return;
      }
      setSearchingProducts(true);
      const { data, error: searchErr } = await supabase.rpc(
        "search_products_for_guide",
        { search_query: query.trim(), result_limit: 20 }
      );
      if (searchErr) console.error("Product search error:", searchErr);
      setProductResults(normalizeRpcProducts(data));
      setSearchingProducts(false);
    },
    [supabase, normalizeRpcProducts]
  );

  // Fetch unassigned products via RPC (paginated, with search)
  const fetchUnassignedProducts = useCallback(
    async (page = 1, search = "") => {
      setUnassignedLoading(true);
      const { data, error: rpcErr } = await supabase.rpc(
        "get_unassigned_products",
        {
          search_query: search,
          page_number: page,
          page_size: UNASSIGNED_PAGE_SIZE,
        }
      );
      if (rpcErr) {
        console.error("Unassigned products error:", rpcErr);
        setUnassignedLoading(false);
        return;
      }
      const total = data?.[0]?.total_count ?? 0;
      setUnassignedProducts(normalizeRpcProducts(data));
      setUnassignedTotalCount(Number(total));
      setUnassignedLoading(false);
    },
    [supabase, normalizeRpcProducts, UNASSIGNED_PAGE_SIZE]
  );

  // Load unassigned on open / page change
  useEffect(() => {
    if (!showUnassigned) {
      // Reset when closed
      setUnassignedProducts([]);
      setUnassignedTotalCount(0);
      setUnassignedPage(1);
      setUnassignedSearch("");
      return;
    }
    fetchUnassignedProducts(unassignedPage, unassignedSearch);
  }, [showUnassigned, unassignedPage, fetchUnassignedProducts]);

  // Debounced search for unassigned
  useEffect(() => {
    if (!showUnassigned) return;
    const t = setTimeout(() => {
      setUnassignedPage(1);
      fetchUnassignedProducts(1, unassignedSearch);
    }, 350);
    return () => clearTimeout(t);
  }, [unassignedSearch, showUnassigned, fetchUnassignedProducts]);

  const filteredGuides = useMemo(() => {
    if (!searchTerm.trim()) return guides;
    const q = searchTerm.toLowerCase();
    return guides.filter(
      (g) =>
        g.title?.toLowerCase().includes(q) ||
        g.slug?.toLowerCase().includes(q)
    );
  }, [guides, searchTerm]);

  return {
    guides: filteredGuides,
    allGuides: guides,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refresh,
    selectedGuide,
    setSelectedGuide,
    guideItems,
    loadingItems,
    fetchGuideItems,
    productSearch,
    setProductSearch,
    productResults,
    searchingProducts,
    searchProducts,
    occasionLabels,
    budgetLabels,
    labelsLoading,
    showUnassigned,
    setShowUnassigned,
    unassignedProducts,
    unassignedTotalCount,
    unassignedPage,
    setUnassignedPage,
    unassignedSearch,
    setUnassignedSearch,
    unassignedLoading,
    fetchUnassignedProducts,
    unassignedPageSize: UNASSIGNED_PAGE_SIZE,
  };
}
