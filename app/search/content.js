"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Users,
  Store,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useQueryState, parseAsString } from "nuqs";
import Footer from "../components/footer";

const TYPE_OPTIONS = [
  { id: "all", label: "All" },
  { id: "products", label: "Products" },
  { id: "registries", label: "Registries" },
  { id: "vendors", label: "Vendors" },
];

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function GlobalSearchContent() {
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [typeParam, setTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1")
  );
  const [limitParam, setLimitParam] = useQueryState(
    "limit",
    parseAsString.withDefault("12")
  );

  const [localSearch, setLocalSearch] = useState(searchParam || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({
    products: [],
    registries: [],
    vendors: [],
  });
  const [counts, setCounts] = useState({
    products: 0,
    registries: 0,
    vendors: 0,
  });

  const searchQuery = searchParam || "";
  const activeType = typeParam || "all";
  const page = useMemo(() => {
    const parsed = Number.parseInt(pageParam || "1", 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return parsed;
  }, [pageParam]);
  const limit = useMemo(() => {
    const parsed = Number.parseInt(limitParam || "12", 10);
    if (Number.isNaN(parsed) || parsed < 1) return 12;
    return Math.min(24, parsed);
  }, [limitParam]);

  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchParam(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchParam]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({ products: [], registries: [], vendors: [] });
      setCounts({ products: 0, registries: 0, vendors: 0 });
      setError(null);
      setLoading(false);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/search", window.location.origin);
        url.searchParams.set("q", trimmed);
        if (activeType && activeType !== "all") {
          url.searchParams.set("type", activeType);
          url.searchParams.set("page", String(page));
          url.searchParams.set("limit", String(limit));
        }
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          if (!ignore) {
            setError(body?.message || "Unable to load search results.");
            setResults({ products: [], registries: [], vendors: [] });
            setCounts({ products: 0, registries: 0, vendors: 0 });
          }
          return;
        }

        const body = await response.json().catch(() => ({}));
        if (!ignore) {
          setResults({
            products: Array.isArray(body?.results?.products)
              ? body.results.products
              : [],
            registries: Array.isArray(body?.results?.registries)
              ? body.results.registries
              : [],
            vendors: Array.isArray(body?.results?.vendors)
              ? body.results.vendors
              : [],
          });
          setCounts({
            products: body?.counts?.products || 0,
            registries: body?.counts?.registries || 0,
            vendors: body?.counts?.vendors || 0,
          });
        }
      } catch (err) {
        if (!ignore && err?.name !== "AbortError") {
          setError(err?.message || "Unable to load search results.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchResults();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [activeType, limit, page, searchQuery]);

  const hasQuery = searchQuery.trim().length > 0;

  const summaryCards = useMemo(
    () => [
      {
        id: "products",
        label: "Products",
        count: counts.products,
        icon: ShoppingBag,
      },
      {
        id: "registries",
        label: "Registries",
        count: counts.registries,
        icon: Users,
      },
      {
        id: "vendors",
        label: "Vendors",
        count: counts.vendors,
        icon: Store,
      },
    ],
    [counts]
  );

  const handleTypeChange = useCallback(
    (nextType) => {
      setTypeParam(nextType || "all");
      setPageParam("1");
    },
    [setPageParam, setTypeParam]
  );

  const totalCount = useMemo(() => {
    if (activeType === "products") return counts.products || 0;
    if (activeType === "registries") return counts.registries || 0;
    if (activeType === "vendors") return counts.vendors || 0;
    return counts.products + counts.registries + counts.vendors;
  }, [activeType, counts]);

  const totalPages = useMemo(() => {
    if (activeType === "all") return 1;
    const pages = Math.ceil((totalCount || 0) / (limit || 1));
    return Math.max(1, pages);
  }, [activeType, limit, totalCount]);

  const canPrevious = activeType !== "all" && page > 1;
  const canNext = activeType !== "all" && page < totalPages;

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#2C2A24] font-brasley-medium">
      <header className="relative overflow-hidden border-b border-[#E5DCC9] bg-[#FBF7EF]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(165,145,75,0.18),_transparent_55%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-12 md:py-16">
          <p className="text-xs uppercase tracking-[0.4em] text-[#A5914B]">
            Search Giftologi
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Discover products, registries, and vendors in one place.
          </h1>
          <p className="max-w-2xl text-sm text-[#6A6456]">
            Start with a keyword and explore what Giftologi has to offer across
            the marketplace and public registries.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <section className="rounded-[28px] border border-[#E6DDC8] bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A8A095]" />
              <input
                type="text"
                placeholder="Search gifts, registries, vendors..."
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                className="w-full rounded-full border border-[#E5D8BE] bg-white px-11 py-3 text-sm text-[#2C2A24] shadow-sm outline-none transition focus:border-[#A5914B] focus:ring-2 focus:ring-[#A5914B]/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleTypeChange(option.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    activeType === option.id
                      ? "bg-[#A5914B] text-white"
                      : "border border-[#E6DDC8] bg-white text-[#6A6456] hover:border-[#A5914B] hover:text-[#A5914B]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!hasQuery && (
            <div className="mt-6 rounded-3xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-6 text-sm text-[#6A6456]">
              Try searching for “wedding”, “home decor”, or a vendor name to get
              started.
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </section>

        {hasQuery && (
          <section className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-4 rounded-3xl border border-[#E6DDC8] bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F5EEE1] text-[#A5914B]">
                  <card.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#A5914B]">
                    {card.label}
                  </p>
                  <p className="text-lg font-semibold text-[#2C2A24]">
                    {card.count.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {hasQuery && loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`search-loading-${index}`}
                className="h-24 rounded-3xl border border-[#E6DDC8] bg-white animate-pulse"
              />
            ))}
          </div>
        )}

        {hasQuery && !loading && !error && activeType === "all" && (
          <div className="flex flex-col gap-10">
            <section className="rounded-3xl border border-[#EFE3CC] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#A5914B]">
                    Products
                  </p>
                  <h2 className="text-xl font-semibold text-[#2C2A24]">
                    Trending gift ideas
                  </h2>
                </div>
                <Link
                  href={`/search?type=products&q=${encodeURIComponent(searchQuery)}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#8B7A3F] hover:text-[#A5914B]"
                >
                  View all
                  <ChevronRight className="size-4" />
                </Link>
              </div>
              {results.products.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-4 text-sm text-[#6A6456]">
                  No product matches yet. Try another keyword.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.products.map((product) => (
                    <Link
                      key={`product-${product.id}`}
                      href={`/storefront/${product.vendor?.slug}/${
                        product.productCode || product.id
                      }`}
                      className="group rounded-3xl border border-[#EFE3CC] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F7F2EA]">
                        <ImageWithFallback
                          src={product.image || "/host/toaster.png"}
                          alt={product.name}
                          fill
                          priority
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                        {product.isOnSale && product.discountPercent > 0 && (
                          <div className="absolute top-2 left-2">
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {product.discountPercent}% OFF
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#A5914B]">
                          {product.vendor?.name || "Vendor"}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[#2C2A24]">
                          {product.name}
                        </h3>
                        <div className="mt-3 flex items-center justify-between text-sm text-[#6A6456]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#A5914B]">
                              {formatCurrency(product.price)}
                            </span>
                            {product.isOnSale && product.originalPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.originalPrice)}
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1">
                            View
                            <ArrowUpRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#EFE3CC] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#A5914B]">
                    Registries
                  </p>
                  <h2 className="text-xl font-semibold text-[#2C2A24]">
                    Public registries to celebrate
                  </h2>
                </div>
                <Link
                  href={`/search?type=registries&q=${encodeURIComponent(searchQuery)}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#8B7A3F] hover:text-[#A5914B]"
                >
                  View all
                  <ChevronRight className="size-4" />
                </Link>
              </div>
              {results.registries.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-4 text-sm text-[#6A6456]">
                  No public registries found for this query.
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {results.registries.map((registry) => (
                    <Link
                      key={`registry-${registry.id}`}
                      href={
                        registry.registryCode
                          ? `/registry/${registry.registryCode}`
                          : "#"
                      }
                      className="group flex flex-col overflow-hidden rounded-3xl border border-[#EFE3CC] bg-white transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7F2EA]">
                        <ImageWithFallback
                          src={registry.coverPhoto || "/host/toaster.png"}
                          alt={registry.registryName}
                          fill
                          priority
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#A5914B]">
                          {registry.event?.type || "Registry"}
                        </p>
                        <h3 className="text-lg font-semibold text-[#2C2A24] line-clamp-2">
                          {registry.event?.title || registry.registryName}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-[#6A6456]">
                          <span>{registry.host?.name || "Gift Host"}</span>
                          {registry.event?.date && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {formatDate(registry.event?.date)}
                            </span>
                          )}
                        </div>
                        <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A5914B]">
                          View registry
                          <ChevronRight className="size-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#EFE3CC] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#A5914B]">
                    Vendors
                  </p>
                  <h2 className="text-xl font-semibold text-[#2C2A24]">
                    Shops curated for gifting
                  </h2>
                </div>
                <Link
                  href={`/search?type=vendors&q=${encodeURIComponent(searchQuery)}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#8B7A3F] hover:text-[#A5914B]"
                >
                  View all
                  <ChevronRight className="size-4" />
                </Link>
              </div>
              {results.vendors.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-4 text-sm text-[#6A6456]">
                  No vendor matches yet. Try another keyword.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.vendors.map((vendor) => (
                    <Link
                      key={`vendor-${vendor.id}`}
                      href={vendor.slug ? `/storefront/${vendor.slug}` : "#"}
                      className="group flex h-full flex-col gap-4 rounded-3xl border border-[#EFE3CC] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 overflow-hidden rounded-2xl bg-[#F7F2EA]">
                          <ImageWithFallback
                            src={vendor.logo || "/host/toaster.png"}
                            alt={vendor.name}
                            fill
                            className="object-cover"
                            priority
                            sizes="48px"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2C2A24]">
                            {vendor.name}
                          </p>
                          <p className="text-xs text-[#6A6456]">
                            {vendor.verified ? "Verified vendor" : "Vendor"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-[#6A6456] line-clamp-3">
                        {vendor.description || "Curated gifting experience."}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A5914B]">
                        Visit shop
                        <ArrowUpRight className="size-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {hasQuery && !loading && !error && activeType !== "all" && (
          <section className="rounded-3xl border border-[#EFE3CC] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[#A5914B]">
                <Sparkles className="size-5" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Results</p>
                  <h2 className="text-xl font-semibold text-[#2C2A24]">
                    Showing {activeType}
                  </h2>
                </div>
              </div>
            </div>

            {activeType === "products" && (
              <div className="mt-6">
                {results.products.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-4 text-sm text-[#6A6456]">
                    No products match this search.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {results.products.map((product) => (
                      <Link
                        key={`product-${product.id}`}
                        href={`/storefront/${product.vendor?.slug}/${
                          product.productCode || product.id
                        }`}
                        className="group rounded-3xl border border-[#EFE3CC] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F7F2EA]">
                          <ImageWithFallback
                            src={product.image || "/host/toaster.png"}
                            alt={product.name}
                            fill
                            priority
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#A5914B]">
                            {product.vendor?.name || "Vendor"}
                          </p>
                          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[#2C2A24]">
                            {product.name}
                          </h3>
                          <div className="mt-3 flex items-center justify-between text-sm text-[#6A6456]">
                            <span className="font-semibold text-[#A5914B]">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              View
                              <ArrowUpRight className="size-3" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeType === "registries" && (
              <div className="mt-6">
                {results.registries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-4 text-sm text-[#6A6456]">
                    No registries match this search.
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {results.registries.map((registry) => (
                      <Link
                        key={`registry-${registry.id}`}
                        href={
                          registry.registryCode
                            ? `/registry/${registry.registryCode}`
                            : "#"
                        }
                        className="group flex flex-col overflow-hidden rounded-3xl border border-[#EFE3CC] bg-white transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7F2EA]">
                          <ImageWithFallback
                            src={registry.coverPhoto || "/host/toaster.png"}
                            alt={registry.registryName}
                            fill
                            priority
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#A5914B]">
                            {registry.event?.type || "Registry"}
                          </p>
                          <h3 className="text-lg font-semibold text-[#2C2A24] line-clamp-2">
                            {registry.event?.title || registry.registryName}
                          </h3>
                          <div className="flex items-center justify-between text-sm text-[#6A6456]">
                            <span>{registry.host?.name || "Gift Host"}</span>
                            {registry.event?.date && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="size-3" />
                                {formatDate(registry.event?.date)}
                              </span>
                            )}
                          </div>
                          <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A5914B]">
                            View registry
                            <ChevronRight className="size-3" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeType === "vendors" && (
              <div className="mt-6">
                {results.vendors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E6DDC8] bg-[#FBF7EF] px-5 py-4 text-sm text-[#6A6456]">
                    No vendors match this search.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {results.vendors.map((vendor) => (
                      <Link
                        key={`vendor-${vendor.id}`}
                        href={vendor.slug ? `/storefront/${vendor.slug}` : "#"}
                        className="group flex h-full flex-col gap-4 rounded-3xl border border-[#EFE3CC] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 overflow-hidden rounded-2xl bg-[#F7F2EA]">
                            <ImageWithFallback
                              src={vendor.logo || "/host/toaster.png"}
                              alt={vendor.name}
                              fill
                              className="object-cover"
                              priority
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#2C2A24]">
                              {vendor.name}
                            </p>
                            <p className="text-xs text-[#6A6456]">
                              {vendor.verified ? "Verified vendor" : "Vendor"}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-[#6A6456] line-clamp-3">
                          {vendor.description || "Curated gifting experience."}
                        </p>
                        <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A5914B]">
                          Visit shop
                          <ArrowUpRight className="size-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-[#EFE3CC] bg-[#FBF7EF] px-5 py-4 text-xs text-[#6A6456] shadow-sm sm:flex-row">
              <span>
                Page {page} of {totalPages} ({totalCount.toLocaleString()} results)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageParam(String(page - 1))}
                  disabled={!canPrevious}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                    canPrevious
                      ? "border-[#A5914B] text-[#A5914B] hover:bg-[#A5914B] hover:text-white"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  }`}
                  aria-label="Previous page"
                >
                  <ChevronRight className="size-4 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => setPageParam(String(page + 1))}
                  disabled={!canNext}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                    canNext
                      ? "border-[#A5914B] text-[#A5914B] hover:bg-[#A5914B] hover:text-white"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
