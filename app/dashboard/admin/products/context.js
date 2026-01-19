"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
  const [pageSize] = useState(10);
  const [productsTotal, setProductsTotal] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorProducts, setErrorProducts] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProducts = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

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
    parseAsString.withDefault(""),
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [typeParam, setTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all"),
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1"),
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault(""),
  );

  const searchTerm = searchParam || "";
  const statusFilter = (statusParam || "all").toLowerCase();
  const typeFilter = (typeParam || "all").toLowerCase();
  const focusId = focusIdParam || "";

  const lastAppliedFocusIdRef = useRef("");

  const productsPage = useMemo(() => {
    const num = parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const setProductsPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(productsPage) : Number(next);
      const safe = Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
      setPageParam(String(safe + 1));
    },
    [productsPage, setPageParam],
  );

  const setSearchTerm = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam],
  );

  const setStatusFilter = useCallback(
    (value) => {
      setStatusParam(value || "all");
      setPageParam("1");
    },
    [setStatusParam, setPageParam],
  );

  const setTypeFilter = useCallback(
    (value) => {
      setTypeParam(value || "all");
      setPageParam("1");
    },
    [setTypeParam, setPageParam],
  );

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam],
  );

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

        if (
          totalError ||
          pendingError ||
          approvedError ||
          rejectedError ||
          flaggedError
        ) {
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

        let query = supabase.from("products").select(
          `
            id,
            product_code,
            name,
            description,
            price,
            stock_qty,
            status,
            images,
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
          { count: "exact" },
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
              images: Array.isArray(row.images) ? row.images : [],
              __raw: row,
            };
          });

          setProducts(enriched);
          setProductsTotal(count ?? (enriched ? enriched.length : 0));

          if (focusId && focusId !== lastAppliedFocusIdRef.current) {
            const focusValue = String(focusId).trim();
            const focusRow = enriched.find((row) => {
              if (!row) return false;
              if (row.id === focusValue) return true;
              if (String(row.product_code || "") === focusValue) return true;
              return false;
            });

            if (!focusRow) {
              const focusLookup = await supabase
                .from("products")
                .select("id, product_code, created_at")
                .or(`id.eq.${focusValue},product_code.eq.${focusValue}`)
                .maybeSingle();

              if (focusLookup?.data?.id && focusLookup.data.created_at) {
                let verifyQuery = supabase
                  .from("products")
                  .select("id", { count: "exact" })
                  .eq("id", focusLookup.data.id);

                if (trimmedSearch) {
                  verifyQuery = verifyQuery.textSearch(
                    "search_vector",
                    trimmedSearch,
                    {
                      type: "websearch",
                      config: "simple",
                    },
                  );
                }

                if (statusFilter && statusFilter !== "all") {
                  verifyQuery = verifyQuery.eq("status", statusFilter);
                }

                const verifyResult = await verifyQuery.maybeSingle();

                if (verifyResult?.data?.id) {
                  let rankQuery = supabase
                    .from("products")
                    .select("id", { count: "exact", head: true })
                    .gt("created_at", focusLookup.data.created_at);

                  if (trimmedSearch) {
                    rankQuery = rankQuery.textSearch(
                      "search_vector",
                      trimmedSearch,
                      {
                        type: "websearch",
                        config: "simple",
                      },
                    );
                  }

                  if (statusFilter && statusFilter !== "all") {
                    rankQuery = rankQuery.eq("status", statusFilter);
                  }

                  const rankResult = await rankQuery;
                  const beforeCount =
                    typeof rankResult?.count === "number"
                      ? rankResult.count
                      : 0;
                  const desiredPage = Math.floor(beforeCount / pageSize);

                  lastAppliedFocusIdRef.current = focusValue;
                  if (desiredPage !== productsPage) {
                    setPageParam(String(desiredPage + 1));
                    setProducts([]);
                    setProductsTotal(count ?? 0);
                    return;
                  }
                }
              }
            } else {
              lastAppliedFocusIdRef.current = focusValue;
            }
          }
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
  }, [
    productsPage,
    pageSize,
    searchTerm,
    statusFilter,
    focusId,
    refreshKey,
    setPageParam,
  ]);

  return useMemo(
    () => ({
      products,
      productsPage,
      pageSize,
      productsTotal,
      loadingProducts,
      errorProducts,
      setProductsPage,
      refreshProducts,
      searchTerm,
      setSearchTerm,
      statusFilter,
      setStatusFilter,
      typeFilter,
      setTypeFilter,
      focusId,
      setFocusId,
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
      focusId,
      metrics,
      loadingMetrics,
      metricsError,
      setProductsPage,
      setSearchTerm,
      setStatusFilter,
      setTypeFilter,
      setFocusId,
    ],
  );
}

export const useManageProductsContext = () => useContext(ManageProductsContext);
