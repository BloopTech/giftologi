"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { PiGift, PiMagnifyingGlass, PiFunnel } from "react-icons/pi";
import Footer from "../components/footer";

const buildLabelMap = (arr) => {
  const map = {};
  (arr || []).forEach((item) => {
    if (item.value && item.label) map[item.value] = item.label;
  });
  return map;
};

function GuideCard({ guide, occasionLabels = {}, budgetLabels = {} }) {
  return (
    <Link
      href={`/gift-guides/${guide.slug}`}
      className="group block bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden hover:border-[#A5914B]/40 hover:shadow-md transition-all"
    >
      <div className="aspect-video relative bg-[#F3F4F6]">
        {guide.cover_image ? (
          <Image
            src={guide.cover_image}
            alt={guide.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PiGift className="w-12 h-12 text-[#D1D5DB]" />
          </div>
        )}

        {guide.occasion && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-medium text-[#374151] px-2.5 py-1 rounded-full">
            {occasionLabels[guide.occasion] || guide.occasion}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-[#111827] group-hover:text-[#A5914B] transition-colors line-clamp-1">
          {guide.title}
        </h3>
        {guide.description && (
          <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">
            {guide.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {guide.productCount} {guide.productCount === 1 ? "item" : "items"}
          </span>
          {guide.budget_range && (
            <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
              {budgetLabels[guide.budget_range] || guide.budget_range}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function GiftGuidesContent() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("all");
  const [occasions, setOccasions] = useState([]);
  const [budgetRanges, setBudgetRanges] = useState([]);

  const occasionLabels = useMemo(() => buildLabelMap(occasions), [occasions]);
  const budgetLabels = useMemo(() => buildLabelMap(budgetRanges), [budgetRanges]);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [guidesRes, lookupsRes] = await Promise.all([
          fetch("/api/gift-guides"),
          fetch("/api/gift-guides/lookups"),
        ]);
        if (!guidesRes.ok) throw new Error("Failed to load guides");
        const guidesData = await guidesRes.json();
        const lookupsData = lookupsRes.ok ? await lookupsRes.json() : {};
        if (!ignore) {
          setGuides(guidesData.guides || []);
          setOccasions(lookupsData.occasions || []);
          setBudgetRanges(lookupsData.budgetRanges || []);
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredGuides = useMemo(() => {
    let result = guides;
    if (occasionFilter !== "all") {
      result = result.filter((g) => g.occasion === occasionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.title?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [guides, occasionFilter, searchQuery]);

  const availableOccasions = useMemo(() => {
    const set = new Set(guides.map((g) => g.occasion).filter(Boolean));
    return Array.from(set).sort();
  }, [guides]);

  return (
    <>
      <section className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] font-brasley-medium">
              Gift Guides
            </h1>
            <p className="text-sm text-[#6B7280] mt-2 max-w-md mx-auto">
              Curated collections to help you find the perfect gift for every
              occasion.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8 max-w-xl mx-auto">
            <div className="relative flex-1 w-full">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#D1D5DB] rounded-xl outline-none focus:border-[#A5914B] transition bg-white"
              />
            </div>
            <select
              value={occasionFilter}
              onChange={(e) => setOccasionFilter(e.target.value)}
              className="py-2.5 px-3 text-sm border border-[#D1D5DB] rounded-xl outline-none focus:border-[#A5914B] bg-white transition min-w-[160px]"
            >
              <option value="all">All Occasions</option>
              {availableOccasions.map((occ) => (
                <option key={occ} value={occ}>
                  {occasionLabels[occ] || occ}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-video bg-[#E5E7EB]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 bg-[#E5E7EB] rounded" />
                    <div className="h-3 w-full bg-[#E5E7EB] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="text-center py-16">
              <PiGift className="w-12 h-12 mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-sm text-[#6B7280]">
                {guides.length === 0
                  ? "No gift guides yet. Check back soon!"
                  : "No guides match your filters."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGuides.map((guide) => (
                <GuideCard key={guide.id} guide={guide} occasionLabels={occasionLabels} budgetLabels={budgetLabels} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
