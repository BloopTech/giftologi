import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";

const SORT_OPTIONS = new Set([
  "guide",
  "relevance",
  "newest",
  "price_low",
  "price_high",
  "name_asc",
  "name_desc",
  "rating",
  "popular",
]);

const normalizeSort = (value) =>
  SORT_OPTIONS.has(value) ? value : "guide";

const parseBooleanParam = (value) => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const getSortPrice = (product) => {
  const basePrice = Number(product?.price);
  const serviceCharge = Number(product?.service_charge || 0);
  const salePrice = Number(product?.sale_price);
  const saleStartsAt = product?.sale_starts_at
    ? new Date(product.sale_starts_at).getTime()
    : null;
  const saleEndsAt = product?.sale_ends_at
    ? new Date(product.sale_ends_at).getTime()
    : null;
  const now = Date.now();

  const saleActive =
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    (!saleStartsAt || Number.isNaN(saleStartsAt) || now >= saleStartsAt) &&
    (!saleEndsAt || Number.isNaN(saleEndsAt) || now <= saleEndsAt);

  if (saleActive) return salePrice + serviceCharge;
  if (Number.isFinite(basePrice)) return basePrice + serviceCharge;
  return serviceCharge;
};

const sortGuideItems = (items, sortBy) => {
  const sorted = [...items];

  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => {
        const aTime = new Date(a?.product?.created_at || 0).getTime();
        const bTime = new Date(b?.product?.created_at || 0).getTime();
        return bTime - aTime;
      });
    case "price_low":
      return sorted.sort(
        (a, b) => getSortPrice(a?.product) - getSortPrice(b?.product)
      );
    case "price_high":
      return sorted.sort(
        (a, b) => getSortPrice(b?.product) - getSortPrice(a?.product)
      );
    case "name_asc":
      return sorted.sort((a, b) =>
        String(a?.product?.name || "").localeCompare(String(b?.product?.name || ""))
      );
    case "name_desc":
      return sorted.sort((a, b) =>
        String(b?.product?.name || "").localeCompare(String(a?.product?.name || ""))
      );
    case "rating":
      return sorted.sort(
        (a, b) => Number(b?.product?.avg_rating || 0) - Number(a?.product?.avg_rating || 0)
      );
    case "popular":
      return sorted.sort(
        (a, b) =>
          Number(b?.product?.purchase_count || 0) -
          Number(a?.product?.purchase_count || 0)
      );
    case "guide":
    case "relevance":
    default:
      return sorted.sort(
        (a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)
      );
  }
};

/**
 * GET /api/gift-guides/[slug] — get a single guide with its products
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const sortBy = normalizeSort(searchParams.get("sort") || "guide");
    const typeFilter = (searchParams.get("type") || "all").trim().toLowerCase();
    const inStockOnly = parseBooleanParam(searchParams.get("in_stock"));
    const admin = createAdminClient();

    const { data: guide, error: guideError } = await admin
      .from("gift_guides")
      .select(
        "id, title, slug, description, cover_image, occasion, budget_range, sort_order, is_published, created_at"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (guideError || !guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Fetch guide items with product details
    const { data: items } = await admin
      .from("gift_guide_items")
      .select(
        `
        id,
        sort_order,
        editor_note,
        product:products(
          id,
          product_code,
          name,
          description,
          price,
          status,
          active,
          created_at,
          sale_price,
          sale_starts_at,
          sale_ends_at,
          images,
          variations,
          stock_qty,
          avg_rating,
          review_count,
          purchase_count,
          service_charge,
          product_type,
          vendor:vendors(id, slug, business_name, verified, logo_url)
        )
      `
      )
      .eq("guide_id", guide.id)
      .order("sort_order", { ascending: true });

    // Filter out items where product was deleted
    let validItems = (items || []).filter(
      (i) => i.product && i.product.active !== false && i.product.status === "approved"
    );

    if (typeFilter && typeFilter !== "all") {
      validItems = validItems.filter(
        (item) => String(item?.product?.product_type || "physical").toLowerCase() === typeFilter
      );
    }

    if (inStockOnly) {
      validItems = validItems.filter(
        (item) => Number(item?.product?.stock_qty || 0) > 0
      );
    }

    if (query) {
      const allowedProductIds = new Set(
        validItems.map((item) => item?.product?.id).filter(Boolean)
      );

      if (allowedProductIds.size === 0) {
        return NextResponse.json({
          guide,
          items: [],
        });
      }

      const relevanceRank = new Map();
      let nextRank = 0;

      try {
        const { data: ftsMatches } = await admin
          .from("products")
          .select("id")
          .in("id", [...allowedProductIds])
          .textSearch("search_vector", query, {
            config: "simple",
            type: "websearch",
          });

        for (const row of ftsMatches || []) {
          if (row?.id && !relevanceRank.has(row.id)) {
            relevanceRank.set(row.id, nextRank++);
          }
        }
      } catch {
        // Graceful fallback to similarity and ILIKE below.
      }

      try {
        const { data: similarityMatches } = await admin.rpc(
          "search_products_for_guide",
          {
            search_query: query,
            result_limit: 500,
          }
        );

        for (const row of similarityMatches || []) {
          if (
            row?.id &&
            allowedProductIds.has(row.id) &&
            !relevanceRank.has(row.id)
          ) {
            relevanceRank.set(row.id, nextRank++);
          }
        }
      } catch {
        // Ignore and continue with local textual fallback.
      }

      const lowerQuery = query.toLowerCase();
      for (const item of validItems) {
        const productId = item?.product?.id;
        const name = String(item?.product?.name || "").toLowerCase();
        const description = String(item?.product?.description || "").toLowerCase();

        if (
          productId &&
          !relevanceRank.has(productId) &&
          (name.includes(lowerQuery) || description.includes(lowerQuery))
        ) {
          relevanceRank.set(productId, nextRank++);
        }
      }

      validItems = validItems.filter((item) =>
        relevanceRank.has(item?.product?.id)
      );

      validItems.sort((a, b) => {
        const aRank = relevanceRank.get(a?.product?.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = relevanceRank.get(b?.product?.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
      });

      if (sortBy !== "relevance" && sortBy !== "guide") {
        validItems = sortGuideItems(validItems, sortBy);
      }
    } else {
      validItems = sortGuideItems(validItems, sortBy);
    }

    return NextResponse.json({
      guide,
      items: validItems,
    });
  } catch (err) {
    console.error("[api/gift-guides/slug] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
