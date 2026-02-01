"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const VendorProductsContext = createContext();

const createInitialState = () => ({
  vendor: null,
  products: [],
  categories: [],
  orderItems: [],
});

export const VendorProductsProvider = ({ children }) => {
  const [data, setData] = useState(createInitialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseClient();

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userResult?.user?.id;
      if (!userId) {
        setData(createInitialState());
        setError("You must be signed in.");
        return;
      }

      const { data: vendorRecord, error: vendorError } = await supabase
        .from("vendors")
        .select("id, business_name, category, verified, commission_rate")
        .eq("profiles_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vendorError && vendorError.code !== "PGRST116") throw vendorError;

      let products = [];
      let orderItems = [];

      if (vendorRecord?.id) {
        const [
          { data: productsData, error: productsError },
          { data: orderItemsData, error: orderItemsError },
        ] = await Promise.all([
          supabase
            .from("products")
            .select(`
              id, name, description, price, stock_qty, images, variations, status, product_code, created_at,
              category_id,
              categories:category_id (id, name, slug)
            `)
            .eq("vendor_id", vendorRecord.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("order_items")
            .select("product_id, quantity, price")
            .eq("vendor_id", vendorRecord.id),
        ]);

        if (productsError) throw productsError;
        if (orderItemsError) throw orderItemsError;

        products = productsData || [];
        orderItems = orderItemsData || [];
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, slug, parent_category_id")
        .order("name");

      if (categoriesError) throw categoriesError;

      setData({
        vendor: vendorRecord || null,
        products,
        categories: categoriesData || [],
        orderItems,
      });
    } catch (err) {
      console.error("Vendor products fetch error", err);
      setError(err?.message || "Failed to load products");
      setData(createInitialState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const derivedStats = useMemo(() => {
    const { products, orderItems } = data;

    const totalProducts = products.length;

    const salesByProduct = new Map();
    orderItems.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        const entry = salesByProduct.get(item.product_id) || { units: 0, revenue: 0 };
        entry.units += qty;
        entry.revenue += qty * price;
        salesByProduct.set(item.product_id, entry);
      }
    });

    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const stock = Number(p.stock_qty || 0);
      const price = Number(p.price || 0);
      if (Number.isFinite(stock) && Number.isFinite(price)) {
        inventoryValue += stock * price;
      }
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock > 0 && stock <= 5) {
        lowStockCount++;
      }
    });

    const productsWithSales = products.map((p) => {
      const sales = salesByProduct.get(p.id) || { units: 0, revenue: 0 };
      return {
        ...p,
        salesUnits: sales.units,
        salesRevenue: sales.revenue,
      };
    });

    return {
      totalProducts,
      inventoryValue,
      lowStockCount,
      outOfStockCount,
      productsWithSales,
    };
  }, [data]);

  const value = useMemo(
    () => ({
      vendor: data.vendor,
      products: data.products,
      categories: data.categories,
      loading,
      error,
      refreshData: fetchData,
      ...derivedStats,
    }),
    [data, loading, error, fetchData, derivedStats]
  );

  return (
    <VendorProductsContext.Provider value={value}>
      {children}
    </VendorProductsContext.Provider>
  );
};

export const useVendorProductsContext = () =>
  useContext(VendorProductsContext);