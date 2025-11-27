"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useQueryState, parseAsString } from "nuqs";

const ManageProductsContext = createContext();

export const ManageProductsProvider = ({ children }) => {
  const value = useManageProductsProviderValue();

  return (
    <ManageProductsContext.Provider value={value}>
      {children}
    </ManageProductsContext.Provider>
  );
};

function useManageProductsProviderValue() {
  const [products, setProducts] = useState([]);
  const [productsPage, setProductsPage] = useState(0);
  const [pageSize] = useState(10);
  const [productsTotal, setProductsTotal] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorProducts, setErrorProducts] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [metrics, setMetrics] = useState({
    pending: null,
    approved: null,
    rejected: null,
    flagged: null,
    total: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all")
  );
  const [typeParam, setTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );

  const searchTerm = searchParam || "";
  const statusFilter = (statusParam || "all").toLowerCase();
  const typeFilter = (typeParam || "all").toLowerCase();

  useEffect(() => {
    let ignore = false;

    const fetchMetrics = async () => {
      setMetricsError(null);
      setLoadingMetrics(true);

      try {
        const supabase = createSupabaseClient();

        const [
          { count: totalCount, error: totalError },
          { count: pendingCount, error: pendingError },
          { count: approvedCount, error: approvedError },
          { count: rejectedCount, error: rejectedError },
          { count: flaggedCount, error: flaggedError },
        ] = await Promise.all([
          supabase.from("products").select("id", { count: "exact" }),
          supabase
            .from("products")
            .select("id", { count: "exact" })
            .eq("status", "pending"),
          supabase
            .from("products")
            .select("id", { count: "exact" })
            .eq("status", "approved"),
          supabase
            .from("products")
            .select("id", { count: "exact" })
            .eq("status", "rejected"),
          supabase
            .from("products")
            .select("id", { count: "exact" })
            .eq("status", "flagged"),
        ]);

        if (ignore) return;

        if (totalError || pendingError || approvedError || rejectedError || flaggedError) {
          const message =
            totalError?.message ||
            pendingError?.message ||
            approvedError?.message ||
            rejectedError?.message ||
            flaggedError?.message ||
            "Failed to load product metrics";
          setMetricsError(message);
        }

        setMetrics({
          total: typeof totalCount === "number" ? totalCount : null,
          pending: typeof pendingCount === "number" ? pendingCount : null,
          approved: typeof approvedCount === "number" ? approvedCount : null,
          rejected: typeof rejectedCount === "number" ? rejectedCount : null,
          flagged: typeof flaggedCount === "number" ? flaggedCount : null,
        });
      } catch (error) {
        if (!ignore) {
          setMetricsError(error?.message || "Failed to load product metrics");
        }
      } finally {
        if (!ignore) {
          setLoadingMetrics(false);
        }
      }
    };

    fetchMetrics();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      setErrorProducts(null);

      try {
        const supabase = createSupabaseClient();
        const from = productsPage * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("products")
          .select(
            `
            id,
            product_code,
            name,
            description,
            price,
            stock_qty,
            status,
            created_at,
            vendor:vendors!Products_vendor_id_fkey (
              id,
              business_name
            ),
            category:categories!Products_category_id_fkey (
              id,
              name
            )
          `,
            { count: "exact" }
          );

        const trimmedSearch = searchTerm ? searchTerm.trim() : "";
        if (trimmedSearch) {
          query = query.textSearch("search_vector", trimmedSearch, {
            type: "websearch",
            config: "simple",
          });
        }

        if (statusFilter && statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          if (!ignore) {
            setErrorProducts(error.message);
            setProducts([]);
            setProductsTotal(0);
          }
          return;
        }

        if (!ignore) {
          const enriched = (data || []).map((row) => {
            const vendor = row.vendor || null;
            const category = row.category || null;

            return {
              id: row.id,
              product_code: row.product_code || null,
              name: row.name || "Untitled product",
              vendorName: vendor?.business_name || "—",
              categoryName: category?.name || "—",
              price: row.price,
              stockQty: row.stock_qty,
              status: row.status || "pending",
              createdAt: row.created_at,
              __raw: row,
            };
          });

          setProducts(enriched);
          setProductsTotal(count ?? (enriched ? enriched.length : 0));
        }
      } catch (error) {
        if (!ignore) {
          setErrorProducts(error?.message || "Failed to load products");
          setProducts([]);
          setProductsTotal(0);
        }
      } finally {
        if (!ignore) {
          setLoadingProducts(false);
        }
      }
    };

    fetchProducts();
    return () => {
      ignore = true;
    };
  }, [productsPage, pageSize, searchTerm, statusFilter, refreshKey]);

  return useMemo(
    () => ({
      products,
      productsPage,
      pageSize,
      productsTotal,
      loadingProducts,
      errorProducts,
      setProductsPage,
      refreshProducts: () => setRefreshKey((prev) => prev + 1),
      searchTerm,
      setSearchTerm: setSearchParam,
      statusFilter,
      setStatusFilter: setStatusParam,
      typeFilter,
      setTypeFilter: setTypeParam,
      metrics,
      loadingMetrics,
      metricsError,
    }),
    [
      products,
      productsPage,
      pageSize,
      productsTotal,
      loadingProducts,
      errorProducts,
      searchTerm,
      statusFilter,
      typeFilter,
      metrics,
      loadingMetrics,
      metricsError,
      setSearchParam,
      setStatusParam,
      setTypeParam,
    ]
  );
}

export const useManageProductsContext = () => useContext(ManageProductsContext);
