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

const AdminGiftGuidesContext = createContext();

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

  // Unassigned dialog visibility
  const [showUnassigned, setShowUnassigned] = useState(false);

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
      // Normalize vendor shape for UI compatibility
      setProductResults(
        (data || []).map((p) => ({
          ...p,
          vendor: { id: p.vendor_id, business_name: p.vendor_name },
        }))
      );
      setSearchingProducts(false);
    },
    [supabase]
  );

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
  };
}
