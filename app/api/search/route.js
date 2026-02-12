import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const GROUP_LIMIT = 6;
const SEARCH_BUFFER = 200;

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

const filterRegistryRows = (rows, hostMap, term) => {
  const normalized = term.toLowerCase();
  return rows.filter((row) => {
    const host = hostMap.get(row?.event?.host_id);
    const hostName = toHostName(host).toLowerCase();
    const hostEmail = (host?.email || "").toLowerCase();
    const registryName = (row?.title || "").toLowerCase();
    const registryCode = String(row?.registry_code || "").toLowerCase();
    const eventType = (row?.event?.type || "").toLowerCase();
    const eventTitle = (row?.event?.title || "").toLowerCase();

    return (
      registryName.includes(normalized) ||
      registryCode.includes(normalized) ||
      hostName.includes(normalized) ||
      hostEmail.includes(normalized) ||
      eventType.includes(normalized) ||
      eventTitle.includes(normalized)
    );
  });
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
    const groupLimit = Math.min(GROUP_LIMIT, limit);
    const nowIso = new Date().toISOString();

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

    const shouldFetchAll = type === "all";

    if (type === "all" || type === "products") {
      const from = shouldFetchAll ? 0 : (page - 1) * limit;
      const to = shouldFetchAll ? groupLimit - 1 : from + limit - 1;

      let productQuery = admin
        .from("products")
        .select(
          `
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
        `,
          shouldFetchAll || type === "products" ? { count: "exact" } : undefined
        )
        .eq("status", "approved")
        .eq("active", true)
        .eq("vendor.shop_status", "active")
        .gt("stock_qty", 0)
        .textSearch("search_vector", query, {
          type: "websearch",
          config: "simple",
        })
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data: products, error: productError, count: productCount } =
        await productQuery;

      if (productError) {
        return NextResponse.json(
          { message: "Failed to search products" },
          { status: 500 }
        );
      }

      const productRows = Array.isArray(products) ? products : [];
      results.products = productRows.map(serializeProduct).filter((p) => p?.id);
      counts.products = typeof productCount === "number" ? productCount : productRows.length;
    }

    if (type === "all" || type === "vendors") {
      const from = shouldFetchAll ? 0 : (page - 1) * limit;
      const to = shouldFetchAll ? groupLimit - 1 : from + limit - 1;

      const vendorQuery = admin
        .from("vendors")
        .select(
          `
          id,
          business_name,
          description,
          logo,
          logo_url,
          slug,
          verified,
          shop_status
        `,
          shouldFetchAll || type === "vendors" ? { count: "exact" } : undefined
        )
        .eq("shop_status", "active")
        .textSearch("search_vector", query, {
          type: "websearch",
          config: "simple",
        })
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data: vendors, error: vendorError, count: vendorCount } =
        await vendorQuery;

      if (vendorError) {
        return NextResponse.json(
          { message: "Failed to search vendors" },
          { status: 500 }
        );
      }

      const vendorRows = Array.isArray(vendors) ? vendors : [];
      results.vendors = vendorRows.map(serializeVendor).filter((v) => v?.id);
      counts.vendors = typeof vendorCount === "number" ? vendorCount : vendorRows.length;
    }

    if (type === "all" || type === "registries") {
      const searchLimit = shouldFetchAll
        ? SEARCH_BUFFER
        : Math.min(
            SEARCH_BUFFER,
            Math.max(limit * page + limit, limit),
          );

      const registryQuery = admin
        .from("registries")
        .select(
          `
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
        `
        )
        .eq("event.privacy", "public")
        .gte("deadline", nowIso)
        .order("created_at", { ascending: false })
        .range(0, searchLimit - 1);

      const { data: registries, error: registryError } = await registryQuery;

      if (registryError) {
        return NextResponse.json(
          { message: "Failed to search registries" },
          { status: 500 }
        );
      }

      const registryRows = Array.isArray(registries) ? registries : [];
      const hostIds = registryRows
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

      const filtered = filterRegistryRows(registryRows, hostMap, query);
      counts.registries = filtered.length;

      const registryPage = shouldFetchAll ? 1 : page;
      const registryLimit = shouldFetchAll ? groupLimit : limit;
      const start = (registryPage - 1) * registryLimit;
      const pageItems = filtered.slice(start, start + registryLimit);

      results.registries = pageItems
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
