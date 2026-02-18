"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const scorePageMatch = (page, { slugHints, keywords }) => {
  let score = 0;

  for (const hint of slugHints) {
    const normalizedHint = normalizeSlug(hint);
    if (!normalizedHint) continue;
    if (page.slug === normalizedHint) score = Math.max(score, 120);
    else if (page.slug.includes(normalizedHint)) score = Math.max(score, 90);
  }

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;
    if (page.title === normalizedKeyword) score = Math.max(score, 110);
    else if (page.title.includes(normalizedKeyword)) score = Math.max(score, 80);
    else if (page.search.includes(normalizedKeyword)) score = Math.max(score, 70);
  }

  return score;
};

export function useStaticPageLinks() {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadPages = async () => {
      try {
        const response = await fetch("/api/static-pages", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload?.pages)) return;
        if (!cancelled) {
          setPages(payload.pages);
        }
      } catch {
        // Keep silent fallbacks in consuming UIs.
      }
    };

    loadPages();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedPages = useMemo(
    () =>
      (Array.isArray(pages) ? pages : [])
        .filter((page) => page?.slug)
        .map((page) => ({
          slug: normalizeSlug(page.slug),
          title: normalizeText(page.title),
          search: normalizeText(`${page.title || ""} ${page.slug || ""}`),
        })),
    [pages],
  );

  const getStaticPageHref = useCallback(
    ({ slugHints = [], keywords = [], fallbackHref = "#" }) => {
      const ranked = normalizedPages
        .map((page) => ({
          page,
          score: scorePageMatch(page, { slugHints, keywords }),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      const best = ranked[0]?.page;
      return best?.slug ? `/pages/${best.slug}` : fallbackHref;
    },
    [normalizedPages],
  );

  return {
    getStaticPageHref,
    pages,
  };
}
