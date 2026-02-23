"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, CircleHelp, Mail, LifeBuoy } from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import Footer from "../components/footer";
import { useFaqContext } from "./context";

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#FAFAFA] transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-sm sm:text-base font-medium text-[#111827]">{item.question}</span>
        <ChevronDown
          className={`size-4 text-[#6B7280] transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      {isOpen ? (
        <div className="px-5 pb-5 text-sm text-[#4B5563] leading-relaxed whitespace-pre-wrap">
          {item.answer || "No answer available."}
        </div>
      ) : null}
    </article>
  );
}

export default function FAQContent() {
  const {
    categories,
    groupedFaqs,
    filteredFaqs,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useFaqContext() || {};

  const [openById, setOpenById] = useState({});

  const handleToggle = (id) => {
    setOpenById((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const hasResults = useMemo(
    () => Array.isArray(filteredFaqs) && filteredFaqs.length > 0,
    [filteredFaqs],
  );

  return (
    <div className="min-h-screen bg-[#FCFCFB] text-[#111827]">
      <PublicNavbar />

      <section className="pt-36 pb-20 px-5 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-3xl border border-[#ECECEC] bg-white p-8 sm:p-10">
            <div className="flex items-center gap-2 text-[#A5914B]">
              <CircleHelp className="size-5" />
              <span className="text-xs font-semibold tracking-[0.16em] uppercase">
                Help Center
              </span>
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl font-didot-bold text-[#101828]">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#667085] max-w-2xl leading-relaxed">
              Find quick answers from the FAQs managed by our admin team. Need personal help?
              Reach out through the contact page or support tickets.
            </p>

            <div className="mt-7 rounded-full border border-[#D0D5DD] bg-white px-4 py-3 flex items-center gap-3">
              <Search className="size-4 text-[#98A2B3]" />
              <input
                type="text"
                value={searchQuery || ""}
                onChange={(event) => setSearchQuery?.(event.target.value)}
                placeholder="Search FAQs by keyword"
                className="w-full bg-transparent outline-none text-sm text-[#111827] placeholder:text-[#98A2B3]"
              />
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 rounded-2xl border border-[#E5E7EB] bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={refresh}
                  className="mt-3 inline-flex text-sm text-red-700 underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : !hasResults ? (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center">
                <p className="text-sm text-[#6B7280]">No FAQs matched your search.</p>
              </div>
            ) : (
              categories.map((category) => (
                <section key={category} aria-label={`${category} FAQs`}>
                  <h2 className="text-xs font-semibold tracking-[0.12em] uppercase text-[#A5914B] mb-3">
                    {category}
                  </h2>
                  <div className="space-y-3">
                    {(groupedFaqs?.[category] || []).map((item) => (
                      <FAQItem
                        key={item.id}
                        item={item}
                        isOpen={Boolean(openById[item.id])}
                        onToggle={() => handleToggle(item.id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          <div className="mt-12 rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Still need help?</h3>
              <p className="text-sm text-[#6B7280] mt-1">
                Contact our team directly or open a support ticket.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#A5914B] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#8B7A3F] transition-colors"
              >
                <Mail className="size-4" /> Contact Us
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#344054] hover:bg-[#F9FAFB] transition-colors"
              >
                <LifeBuoy className="size-4" /> Support Tickets
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
