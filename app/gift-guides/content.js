"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import { PiGift, PiMagnifyingGlass } from "react-icons/pi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import Footer from "../components/footer";
import { useGiftGuidesContext } from "./context";

function GuideCard({ guide, occasionLabels = {}, budgetLabels = {} }) {
  return (
    // <Link
    //   href={`/gift-guides/${guide.slug}`}
    //   className="group block bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden hover:border-[#A5914B]/40 hover:shadow-md transition-all"
    // >
    //   <div className="aspect-video relative bg-[#F3F4F6]">
    //     {guide.cover_image ? (
    //       <ImageWithFallback
    //         src={guide.cover_image}
    //         alt={guide.title}
    //         fill
    //         priority
    //         className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
    //         sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    //       />
    //     ) : (
    //       <div className="w-full h-full flex items-center justify-center">
    //         <PiGift className="w-12 h-12 text-[#D1D5DB]" />
    //       </div>
    //     )}

    //     {guide.occasion && (
    //       <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-medium text-[#374151] px-2.5 py-1 rounded-full">
    //         {occasionLabels[guide.occasion] || guide.occasion}
    //       </span>
    //     )}
    //   </div>

    //   <div className="p-4">
    //     <h3 className="text-sm font-semibold text-[#111827] group-hover:text-[#A5914B] transition-colors line-clamp-1">
    //       {guide.title}
    //     </h3>
    //     {guide.description && (
    //       <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">
    //         {guide.description}
    //       </p>
    //     )}
    //     <div className="flex items-center gap-2 mt-3">
    //       <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
    //         {guide.productCount} {guide.productCount === 1 ? "item" : "items"}
    //       </span>
    //       {guide.budget_range && (
    //         <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
    //           {budgetLabels[guide.budget_range] || guide.budget_range}
    //         </span>
    //       )}
    //     </div>
    //   </div>
    // </Link>

    <Link
      href={`/gift-guides/${guide?.slug}`}
      className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 cursor-pointer block"
    >
      <div className="h-64 overflow-hidden relative">
        {guide.cover_image ? (
          <ImageWithFallback
            src={guide.cover_image}
            alt={guide.title}
            fill
            priority
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
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-900">
          {guide.productCount}
        </div>
      </div>
      <div className="p-8">
        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
          {guide.title}
        </h3>
        <div className="flex items-center gap-2 mt-3">
          {guide.budget_range && (
            <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
              {budgetLabels[guide.budget_range] || guide.budget_range}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] font-bold text-gray-900 tracking-[0.2em] uppercase group-hover:text-[#FDD17D] transition-colors duration-300">
            Explore Guide
          </span>
          <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#FDD17D] group-hover:text-gray-900 transition-colors">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function GiftGuidesContent() {
  const { guides, loading, error, occasionLabels, budgetLabels } =
    useGiftGuidesContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("all");

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
          g.description?.toLowerCase().includes(q),
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
      <section className="w-full min-h-screen bg-[#F9F9F9]">
        <div className="mx-auto max-w-6xl px-4 py-10 w-full">
          {/* Header */}
          <div className="relative pt-34 pb-20 px-6 sm:px-12 lg:px-24 overflow-hidden bg-[#F9F9F9]">
            {/* Giftologi Background Pattern */}

            <div className="max-w-6xl mx-auto relative z-10 text-center">
              <h4 className="text-sm font-bold tracking-[0.2em] text-[#FF6581] uppercase mb-6">
                Curated Inspiration
              </h4>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] text-gray-900 mb-8">
                <span className="block font-didot-bold">Find the Perfect</span>
                <span className="block italic font-light text-[#FDD17D]">
                  Expression.
                </span>
              </h1>
              <p className="text-xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
                Thoughtfully curated collections for every personality,
                occasion, and milestone. Discover gifts that tell a story.
              </p>
            </div>
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
            <Select value={occasionFilter} onValueChange={setOccasionFilter}>
              <SelectTrigger className="min-w-[180px] rounded-xl text-sm">
                <SelectValue placeholder="All Occasions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Occasions</SelectItem>
                {availableOccasions.map((occ) => (
                  <SelectItem key={occ} value={occ}>
                    {occasionLabels[occ] || occ}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <section className="pb-32 bg-[#F9F9F9]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredGuides.map((guide) => (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    occasionLabels={occasionLabels}
                    budgetLabels={budgetLabels}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
