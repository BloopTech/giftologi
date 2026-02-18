"use client";
import React, { useEffect, useMemo, useState } from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import { Search, CalendarDays, Users } from "lucide-react";
import { useRegistryDiscover } from "./context";
import Footer from "../components/footer";
import Pagination from "../components/Pagination";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/Select";

const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Baby Shower",
  "Fundraiser",
  "Custom",
];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function RegistryCard({ registry }) {
  const hostName = registry?.host?.name || "Gift Host";
  const coverPhoto = registry?.coverPhoto || "/host/toaster.png";
  const eventDate = formatDate(registry?.event?.date);
  const registryCode = registry?.registryCode;
  const registryTitle = registry?.registryName || "Registry";
  const eventType = registry?.event?.type || "Event";
  const eventTitle = registry?.event?.title || registryTitle;

  return (
    <Link
      href={registryCode ? `/registry/${registryCode}` : "#"}
      className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={coverPhoto}
          alt={registryTitle}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#A5914B]">
              {eventType}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 mt-2 line-clamp-2">
              {eventTitle}
            </h3>
          </div>
          {eventDate && (
            <div className="flex items-center gap-2 rounded-full border border-[#A5914B]/30 bg-[#A5914B]/10 px-3 py-1 text-xs text-[#6C5B21]">
              <CalendarDays className="size-3" />
              {eventDate}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {registry?.host?.image ? (
              <ImageWithFallback
                src={registry.host.image}
                alt={hostName}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <Users className="size-4 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Hosted by</p>
            <p className="text-sm font-medium text-gray-900">{hostName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-xs text-gray-400">Registry code</p>
            <p className="text-sm font-semibold text-gray-900">
              {registryCode || "—"}
            </p>
          </div>
          <span className="text-xs font-medium text-[#A5914B]">View registry →</span>
        </div>
      </div>
    </Link>
  );
}

export default function RegistryDiscoverContent() {
  const {
    registries,
    total,
    totalPages,
    page,
    loading,
    error,
    searchQuery,
    eventType,
    setSearchQuery,
    setEventType,
    setPage,
  } = useRegistryDiscover();

  const [featuredRegistries, setFeaturedRegistries] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [featuredError, setFeaturedError] = useState(null);

  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setPage(1);
        setSearchQuery(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setPage, setSearchQuery]);

  useEffect(() => {
    let ignore = false;

    const fetchFeatured = async () => {
      setLoadingFeatured(true);
      setFeaturedError(null);

      try {
        const response = await fetch("/api/registry/featured?limit=6", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          if (!ignore) {
            setFeaturedRegistries([]);
            setFeaturedError(body?.message || "Unable to load featured registries.");
          }
          return;
        }

        const body = await response.json().catch(() => ({}));
        if (!ignore) {
          setFeaturedRegistries(
            Array.isArray(body?.registries) ? body.registries : []
          );
        }
      } catch (err) {
        if (!ignore) {
          setFeaturedRegistries([]);
          setFeaturedError(err?.message || "Unable to load featured registries.");
        }
      } finally {
        if (!ignore) setLoadingFeatured(false);
      }
    };

    fetchFeatured();
    return () => {
      ignore = true;
    };
  }, []);

  const resultLabel = useMemo(() => {
    if (loading) return "";
    if (!total) return "No registries found";
    return `${total.toLocaleString()} registr${total === 1 ? "y" : "ies"} found`;
  }, [loading, total]);

  const showFeaturedSection =
    !loadingFeatured &&
    featuredRegistries.length > 0 &&
    page === 1 &&
    !(searchQuery || "").trim() &&
    (eventType || "all") === "all";

  return (
    <div className="bg-gradient-to-b from-[#FAFAFA] via-white to-[#FAF5EC] min-h-screen font-brasley-medium">
      <Link
        href="#registry-discover-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </Link>

      <header className="relative overflow-hidden border-b border-[#EEE4D1] bg-[#FBF7EF]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(165,145,75,0.15),_transparent_55%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:py-14">
          <p className="text-xs uppercase tracking-[0.35em] text-[#A5914B]">
            Registry Discovery
          </p>
          <h1 className="text-3xl font-semibold text-[#2C2A24] md:text-4xl">
            Find a public registry to celebrate with.
          </h1>
          <p className="max-w-2xl text-sm text-[#6A6456]">
            Search by host name, registry title, event type, or registry code and
            send a thoughtful gift with ease.
          </p>
        </div>
      </header>

      <main
        id="registry-discover-content"
        role="main"
        tabIndex={-1}
        aria-label="Registry discovery"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10"
      >
        <section className="rounded-3xl border border-[#E9DFC9] bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr_auto] md:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A8A095]" />
              <input
                type="text"
                placeholder="Search host, registry name, or code"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                className="w-full rounded-full border border-[#E5D8BE] bg-white px-11 py-3 text-sm text-[#2C2A24] shadow-sm outline-none transition focus:border-[#A5914B] focus:ring-2 focus:ring-[#A5914B]/20"
              />
            </div>
            <Select
              value={eventType || "all"}
              onValueChange={(value) => {
                setPage(1);
                setEventType(value || "all");
              }}
            >
              <SelectTrigger className="rounded-full border-[#E5D8BE]">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <div className="text-xs text-[#8B8576]">{resultLabel}</div>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </section>

        {showFeaturedSection && (
          <section className="rounded-3xl border border-[#EEE4D1] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.35em] text-[#A5914B]">
                Featured
              </p>
              <h2 className="text-xl font-semibold text-[#2C2A24]">
                Spotlight registries
              </h2>
              <p className="text-sm text-[#6A6456]">
                Explore a curated set of public registries.
              </p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredRegistries.map((registry) => (
                <RegistryCard key={`featured-${registry.id}`} registry={registry} />
              ))}
            </div>
          </section>
        )}

        {!showFeaturedSection && featuredError && (
          <div className="rounded-3xl border border-[#E0D7C5] bg-white px-5 py-4 text-sm text-[#6A6456]">
            {featuredError}
          </div>
        )}

        {loading && registries.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`registry-skeleton-${index}`}
                className="h-[310px] rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="h-36 w-full rounded-2xl bg-gray-100 animate-pulse" />
                <div className="mt-4 h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
                <div className="mt-3 h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                <div className="mt-6 h-12 w-full rounded-2xl bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : registries.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {registries.map((registry) => (
              <RegistryCard key={registry.id} registry={registry} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#E0D7C5] bg-white p-12 text-center">
            <p className="text-lg font-semibold text-[#2C2A24]">
              No public registries match your search.
            </p>
            <p className="mt-2 text-sm text-[#7A7263]">
              Try a different name, registry code, or event type.
            </p>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          loading={loading}
          className="mt-2"
        />
      </main>

      <Footer />
    </div>
  );
}
