"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import Footer from "../components/footer";
import { useFaqContext } from "./context";
import NewsletterSubscription from "../components/NewsletterSubscription";

function toCategoryId(category) {
  return String(category || "General")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#FAFAFA] transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-sm sm:text-base font-medium text-[#111827]">
          {item.question}
        </span>
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
    categories = [],
    groupedFaqs = {},
    filteredFaqs = [],
    loading,
    error,
    searchQuery = "",
    setSearchQuery,
    refresh,
  } = useFaqContext() || {};

  const [openById, setOpenById] = useState({});

  const categorySections = useMemo(
    () =>
      categories
        .map((category) => ({
          id: toCategoryId(category),
          category,
          items: Array.isArray(groupedFaqs?.[category])
            ? groupedFaqs[category]
            : [],
        }))
        .filter((section) => section.items.length > 0),
    [categories, groupedFaqs],
  );

  const scrollToCategory = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

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
    <div className="min-h-screen bg-[#F9F9F9] relative">
      <PublicNavbar />
      <main>
        <section className="relative pt-44 pb-24 px-6 sm:px-12 lg:px-24 overflow-hidden bg-[#F9F9F9]">
          {/* Giftologi Background Pattern */}
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: 'url("/pattern.png")',
              backgroundSize: "380px",
            }}
          ></div>
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <h4 className="text-[13px] font-bold tracking-[0.4em] text-[#FF6581] uppercase mb-6">
              Support Center
            </h4>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] text-gray-900 mb-8">
              <span className="block font-serif">Frequently Asked</span>
              <span className="block italic font-light text-[#FDD17D]">
                Questions.
              </span>
            </h1>
            <p className="text-xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
              Everything you need to know about Giftologi. Can&apos;t find what
              you&apos;re looking for? Reach out to our concierge team.
            </p>
          </div>
        </section>
        <section className="pt-40 pb-32 px-6 sm:px-12 lg:px-24">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16">
            {/* Category Menu - Sidebar */}
            <div className="lg:w-1/4 space-y-8 lg:sticky lg:top-32 h-fit">
              <div className="space-y-4">
                <h4 className="text-[13px] font-sans font-semibold tracking-[0.2em] text-gray-400 uppercase">
                  Categories
                </h4>
                <nav className="flex flex-col space-y-2">
                  {categorySections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToCategory(section.id)}
                      className="text-left py-3 px-6 rounded-xl text-sm font-sans font-semibold text-gray-600 hover:bg-white hover:text-primary-gold hover:shadow-sm transition-all duration-300"
                    >
                      {section.category}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Search Field */}
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search questions..."
                  className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-12 pr-4 text-sm font-sans outline-none focus:ring-2 focus:ring-primary-gold/20 focus:border-primary-gold transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Accordion Content */}
            <div className="lg:w-3/4 space-y-20">
              {loading ? (
                <div className="space-y-6">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="h-20 rounded-2xl border border-gray-100 bg-white animate-pulse"
                    />
                  ))}
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-8 text-red-800 space-y-4">
                  <p className="font-medium">{error}</p>
                  <button
                    type="button"
                    onClick={refresh}
                    className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {!loading && !error && !hasResults ? (
                <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center space-y-3">
                  <p className="text-xl font-serif text-gray-900">No questions found</p>
                  <p className="text-sm text-gray-500">
                    {searchQuery
                      ? "Try a different keyword or clear your search."
                      : "FAQs will appear here once they are published."}
                  </p>
                </div>
              ) : null}

              {!loading && !error
                ? categorySections.map((section) => (
                    <div
                      key={section.id}
                      id={section.id}
                      className="space-y-8 scroll-mt-32"
                    >
                      <div className="flex items-center space-x-6">
                        <h4 className="text-[15px] font-sans font-semibold tracking-[0.3em] text-gray-950 uppercase">
                          {section.category}
                        </h4>
                        <div className="h-px flex-1 bg-gray-200"></div>
                      </div>

                      <div className="space-y-4">
                        {section.items.map((faq, faqIdx) => {
                          const faqId = `${section.id}-${faq?.id || faqIdx}`;

                          return (
                            <FAQItem
                              key={faqId}
                              item={faq}
                              isOpen={Boolean(openById[faqId])}
                              onToggle={() => handleToggle(faqId)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </section>
      </main>
      <NewsletterSubscription />
      <Footer />
    </div>
  );
}
