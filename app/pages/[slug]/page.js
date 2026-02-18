"use server";
import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/server";
import { createMetadata, getSeoDefaults } from "../../utils/seo";
import PublicNavbar from "../../components/PublicNavbar";
import Footer from "../../components/footer";
import { ChevronRight, Home, FileText } from "lucide-react";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const defaults = await getSeoDefaults();

  const { data: page } = await supabase
    .from("content_static_pages")
    .select("title, meta_description, slug")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!page) {
    return { title: "Page Not Found | Giftologi" };
  }

  return createMetadata({
    title: `${page.title} | Giftologi`,
    description: page.meta_description || page.title,
    canonical: `${defaults.siteUrl}/pages/${page.slug}`,
    ogType: "website",
  });
}

export default async function StaticPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("content_static_pages")
    .select("id, title, slug, meta_description, content, status, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !page) return notFound();

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col relative overflow-hidden">
      <PublicNavbar />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url("/pattern.png")',
          backgroundSize: "400px",
        }}
      ></div>

      <main className="flex-1 pt-44 pb-32 relative z-10 px-6 sm:px-12 lg:px-24">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-[#A5914B] transition-colors"
              >
                <Home className="size-3.5" />
                <span>Home</span>
              </Link>
              <ChevronRight className="size-3" />
              <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                <FileText className="size-3.5" />
                {page.title}
              </span>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-20 space-y-6">
            <div className="flex items-center space-x-4">
              <span className="w-12 h-px bg-[#FDD17D]"></span>
              <h4 className="text-[13px] font-sans font-semibold tracking-[0.4em] text-gray-400 uppercase">
                Legal Documentation
              </h4>
            </div>
            <h1 className="text-5xl md:text-7xl font-didot-bold font-bold text-gray-900 leading-tight">
              {page.title}
            </h1>
            {page.updated_at && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Last updated:{" "}
                <time dateTime={page.updated_at}>
                  {new Date(page.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </p>
            )}
            {page.meta_description && (
              <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                {page.meta_description}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-[#A5914B]/20 via-[#A5914B]/40 to-[#A5914B]/20 mb-8 sm:mb-10" />

          {/* Body Content */}
          <article
            className="prose prose-base sm:prose-lg max-w-none text-gray-700 dark:text-gray-300
              prose-headings:text-[#0A0A0A] dark:prose-headings:text-white
              prose-headings:font-semibold
              prose-h1:text-2xl prose-h1:sm:text-3xl prose-h1:font-bold prose-h1:mb-4
              prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-lg prose-h3:sm:text-xl prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-[#A5914B] prose-a:no-underline hover:prose-a:underline prose-a:font-medium
              prose-strong:text-[#0A0A0A] dark:prose-strong:text-white prose-strong:font-semibold
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
              prose-li:my-1.5 prose-li:marker:text-[#A5914B]
              prose-blockquote:border-l-4 prose-blockquote:border-[#A5914B]
              prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50
              prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
              prose-blockquote:my-6 prose-blockquote:italic
              prose-code:text-[#A5914B] prose-code:bg-gray-100 dark:prose-code:bg-gray-800
              prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg
              prose-pre:overflow-x-auto prose-pre:my-6
              prose-table:w-full prose-table:my-6
              prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:font-semibold prose-th:p-3 prose-th:text-left
              prose-td:p-3 prose-td:border-b prose-td:border-gray-200 dark:prose-td:border-gray-700
              [&_img]:rounded-lg [&_img]:my-6 [&_img]:max-w-full [&_img]:h-auto
              [&_hr]:my-8 [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700"
            dangerouslySetInnerHTML={{ __html: page.content || "" }}
          />

          {/* Back to Home CTA */}
          <div className="mt-12 sm:mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#A5914B] text-white text-sm font-medium
                rounded-full hover:bg-[#8B7A3F] transition-colors shadow-sm"
            >
              <Home className="size-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
