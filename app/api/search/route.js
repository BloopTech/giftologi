import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const GROUP_LIMIT = 6;
const SEARCH_BUFFER = 200;

const PRODUCT_SELECT = `
  id,
  product_code,
  name,
  price,
  service_charge,
  images,
  sale_price,
  sale_starts_at,
  sale_ends_at,
  vendor:vendors!inner(
    id,
    slug,
    business_name,
    verified,
    shop_status
  )
`;

const VENDOR_SELECT = `
  id,
  business_name,
  description,
  logo,
  logo_url,
  slug,
  verified,
  shop_status
`;

const REGISTRY_SELECT = `
  id,
  title,
  registry_code,
  cover_photo,
  deadline,
  created_at,
  event:events!inner(
    id,
    host_id,
    type,
    title,
    date,
    privacy
  )
`;

const buildProductBaseQuery = (admin) =>
  admin
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "approved")
    .eq("active", true)
    .eq("vendor.shop_status", "active")
    .gt("stock_qty", 0);

const buildVendorBaseQuery = (admin) =>
  admin
    .from("vendors")
    .select(VENDOR_SELECT)
    .eq("shop_status", "active");

const buildRegistryBaseQuery = (admin, nowIso) =>
  admin
    .from("registries")
    .select(REGISTRY_SELECT)
    .eq("event.privacy", "public")
    .gte("deadline", nowIso);

const formatPrice = (value) => {
  if (value === null || typeof value === "undefined") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

const isSaleActive = (row) => {
  const sp = Number(row?.sale_price);
  if (!Number.isFinite(sp) || sp <= 0) return false;
  const now = Date.now();
  const s = row?.sale_starts_at ? new Date(row.sale_starts_at).getTime() : null;
  const e = row?.sale_ends_at ? new Date(row.sale_ends_at).getTime() : null;
  if (s && !Number.isNaN(s) && now < s) return false;
  if (e && !Number.isNaN(e) && now > e) return false;
  return true;
};

const serializeProduct = (row) => {
  const images = Array.isArray(row?.images) ? row.images : [];
  const vendor = row?.vendor || {};
  const basePrice = formatPrice(row?.price);
  const serviceCharge = formatPrice(row?.service_charge);
  const totalPrice =
    basePrice == null ? null : basePrice + (serviceCharge || 0);

  const onSale = isSaleActive(row);
  const salePriceWithCharge = onSale ? Number(row.sale_price) + (serviceCharge || 0) : null;
  const discountPercent =
    onSale && totalPrice > 0
      ? Math.round(((totalPrice - salePriceWithCharge) / totalPrice) * 100)
      : 0;

  return {
    id: row?.id || null,
    productCode: row?.product_code || null,
    name: row?.name || "",
    price: onSale ? salePriceWithCharge : totalPrice,
    originalPrice: onSale ? totalPrice : null,
    isOnSale: onSale,
    discountPercent,
    serviceCharge,
    image: images[0] || "/host/toaster.png",
    vendor: {
      id: vendor.id || null,
      slug: vendor.slug || "",
      name: vendor.business_name || "",
      verified: !!vendor.verified,
    },
  };
};

const serializeVendor = (row) => ({
  id: row?.id || null,
  slug: row?.slug || "",
  name: row?.business_name || "",
  description: row?.description || "",
  logo: row?.logo_url || row?.logo || "/host/toaster.png",
  verified: !!row?.verified,
});

const toHostName = (profile) => {
  if (!profile) return "";
  const first = profile.firstname || "";
  const last = profile.lastname || "";
  const name = `${first} ${last}`.trim();
  return name || profile.email || "";
};

const serializeRegistry = (row, host) => ({
  id: row?.id || null,
  registryName: row?.title || "",
  registryCode: row?.registry_code || "",
  coverPhoto: row?.cover_photo || null,
  deadline: row?.deadline || null,
  event: {
    id: row?.event?.id || null,
    type: row?.event?.type || "",
    title: row?.event?.title || "",
    date: row?.event?.date || null,
  },
  host: host
    ? {
        id: host.id,
        name: toHostName(host),
        email: host.email || "",
        image: host.image || null,
      }
    : null,
});

const scoreSimilarity = (needle, query) => {
  const normalizedNeedle = String(needle || "").trim().toLowerCase();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedNeedle || !normalizedQuery) return 0;

  if (normalizedNeedle === normalizedQuery) return 200;
  if (normalizedNeedle.startsWith(normalizedQuery)) return 120;
  if (normalizedNeedle.includes(normalizedQuery)) return 90;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return 0;

  let tokenScore = 0;
  for (const token of queryTokens) {
    if (normalizedNeedle.includes(token)) tokenScore += 20;
    else if (token.length > 3 && normalizedNeedle.includes(token.slice(0, 3))) {
      tokenScore += 8;
    }
  }

  return tokenScore;
};

const rankRowsBySimilarity = (rows, query, buildNeedle) => {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      row,
      score: scoreSimilarity(buildNeedle(row), query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.row);
};

const mergeRowsById = (primaryRows, secondaryRows) => {
  const seen = new Set();
  const merged = [];

  const append = (row) => {
    const key = row?.id ? String(row.id) : "";
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(row);
  };

  (Array.isArray(primaryRows) ? primaryRows : []).forEach(append);
  (Array.isArray(secondaryRows) ? secondaryRows : []).forEach(append);

  return merged;
};

const buildProductNeedle = (row) =>
  [row?.name, row?.product_code, row?.vendor?.business_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const buildVendorNeedle = (row) =>
  [row?.business_name, row?.slug, row?.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const buildRegistryNeedle = (row, hostMap) => {
  const host = hostMap.get(row?.event?.host_id);
  const hostName = toHostName(host).toLowerCase();
  const hostEmail = (host?.email || "").toLowerCase();
  const registryName = (row?.title || "").toLowerCase();
  const registryCode = String(row?.registry_code || "").toLowerCase();
  const eventTypeName = (row?.event?.type || "").toLowerCase();
  const eventTitle = (row?.event?.title || "").toLowerCase();

  return [
    registryName,
    registryCode,
    hostName,
    hostEmail,
    eventTypeName,
    eventTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q");
    const typeRaw = searchParams.get("type");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
    if (!query) {
      return NextResponse.json(
        { message: "Search query is required." },
        { status: 400 }
      );
    }

    const type = typeof typeRaw === "string" ? typeRaw.trim() : "all";
    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
    );
    const shouldFetchAll = type === "all";
    const groupLimit = Math.min(GROUP_LIMIT, limit);
    const nowIso = new Date().toISOString();
    const searchWindow = shouldFetchAll
      ? Math.min(SEARCH_BUFFER, Math.max(groupLimit * 8, groupLimit))
      : Math.min(
          SEARCH_BUFFER,
          Math.max(limit * page + limit, limit),
        );

    const admin = createAdminClient();

    const results = {
      products: [],
      vendors: [],
      registries: [],
    };
    const counts = {
      products: 0,
      vendors: 0,
      registries: 0,
    };

    if (type === "all" || type === "products") {
      const [
        { data: ftsProducts, error: productFtsError },
        { data: similarityProducts, error: productSimilarityError },
      ] = await Promise.all([
        buildProductBaseQuery(admin)
          .textSearch("search_vector", query, {
            type: "websearch",
            config: "simple",
          })
          .order("created_at", { ascending: false })
          .range(0, searchWindow - 1),
        buildProductBaseQuery(admin)
          .order("created_at", { ascending: false })
          .range(0, searchWindow - 1),
      ]);

      if (productFtsError || productSimilarityError) {
        return NextResponse.json(
          { message: "Failed to search products" },
          { status: 500 }
        );
      }

      const rankedSimilarityProducts = rankRowsBySimilarity(
        similarityProducts,
        query,
        buildProductNeedle
      );
      const mergedProductRows = mergeRowsById(
        ftsProducts,
        rankedSimilarityProducts
      );

      const pageStart = shouldFetchAll ? 0 : (page - 1) * limit;
      const pageLimit = shouldFetchAll ? groupLimit : limit;
      const pageProducts = mergedProductRows.slice(
        pageStart,
        pageStart + pageLimit
      );

      results.products = pageProducts.map(serializeProduct).filter((p) => p?.id);
      counts.products = mergedProductRows.length;
    }

    if (type === "all" || type === "vendors") {
      const [
        { data: ftsVendors, error: vendorFtsError },
        { data: similarityVendors, error: vendorSimilarityError },
      ] = await Promise.all([
        buildVendorBaseQuery(admin)
          .textSearch("search_vector", query, {
            type: "websearch",
            config: "simple",
          })
          .order("created_at", { ascending: false })
          .range(0, searchWindow - 1),
        buildVendorBaseQuery(admin)
          .order("created_at", { ascending: false })
          .range(0, searchWindow - 1),
      ]);

      if (vendorFtsError || vendorSimilarityError) {
        return NextResponse.json(
          { message: "Failed to search vendors" },
          { status: 500 }
        );
      }

      const rankedSimilarityVendors = rankRowsBySimilarity(
        similarityVendors,
        query,
        buildVendorNeedle
      );
      const mergedVendorRows = mergeRowsById(ftsVendors, rankedSimilarityVendors);

      const pageStart = shouldFetchAll ? 0 : (page - 1) * limit;
      const pageLimit = shouldFetchAll ? groupLimit : limit;
      const pageVendors = mergedVendorRows.slice(pageStart, pageStart + pageLimit);

      results.vendors = pageVendors.map(serializeVendor).filter((v) => v?.id);
      counts.vendors = mergedVendorRows.length;
    }

    if (type === "all" || type === "registries") {
      const [
        { data: ftsRegistries, error: registryFtsError },
        { data: similarityRegistries, error: registrySimilarityError },
      ] = await Promise.all([
        buildRegistryBaseQuery(admin, nowIso)
          .textSearch("search_vector", query, {
            type: "websearch",
            config: "simple",
          })
          .order("created_at", { ascending: false })
          .range(0, searchWindow - 1),
        buildRegistryBaseQuery(admin, nowIso)
          .order("created_at", { ascending: false })
          .range(0, searchWindow - 1),
      ]);

      if (registryFtsError || registrySimilarityError) {
        return NextResponse.json(
          { message: "Failed to search registries" },
          { status: 500 }
        );
      }

      const registryCandidateRows = mergeRowsById(
        ftsRegistries,
        similarityRegistries
      );
      const hostIds = registryCandidateRows
        .map((row) => row?.event?.host_id)
        .filter(Boolean);

      const { data: hosts } = hostIds.length
        ? await admin
            .from("profiles")
            .select("id, firstname, lastname, email, image")
            .in("id", hostIds)
        : { data: [] };

      const hostMap = new Map(
        (Array.isArray(hosts) ? hosts : []).map((host) => [host.id, host])
      );

      const rankedSimilarityRegistries = rankRowsBySimilarity(
        registryCandidateRows,
        query,
        (row) => buildRegistryNeedle(row, hostMap)
      );
      const mergedRegistryRows = mergeRowsById(
        ftsRegistries,
        rankedSimilarityRegistries
      );

      counts.registries = mergedRegistryRows.length;

      const pageStart = shouldFetchAll ? 0 : (page - 1) * limit;
      const pageLimit = shouldFetchAll ? groupLimit : limit;
      const pageRegistries = mergedRegistryRows.slice(
        pageStart,
        pageStart + pageLimit
      );

      results.registries = pageRegistries
        .map((row) => serializeRegistry(row, hostMap.get(row?.event?.host_id)))
        .filter((r) => r?.id);
    }

    return NextResponse.json(
      {
        query,
        type,
        page: shouldFetchAll ? 1 : page,
        limit: shouldFetchAll ? groupLimit : limit,
        counts,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in global search:", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
