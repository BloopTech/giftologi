"use server";

export async function getSeoDefaults() {
  return {
    siteName: "Giftologi",
    siteUrl: process.env.NEXTAUTH_URL || "https://mygiftologi.com",
    defaultDescription: "Giftologi - Your premier platform for gift registries, vendor connections, and memorable celebrations.",
    keywords: ["gift registry", "wedding gifts", "baby shower", "birthday gifts", "vendor marketplace", "celebrations"],
    author: "Giftologi Team",
    twitterHandle: "@giftologi",
    ogImage: "https://mygiftologi.store/giftologi-logo.png",
  };
}

export async function createMetadata({
  title,
  description,
  keywords = [],
  canonical,
  ogImage,
  ogType = "website",
  noIndex = false,
  jsonLd = null,
} = {}) {
  const defaults = await getSeoDefaults();
  
  const fullTitle = title ? `${title} | ${defaults.siteName}` : defaults.siteName;
  const metaDescription = description || defaults.defaultDescription;
  const canonicalUrl = canonical || defaults.siteUrl;
  const ogImageUrl = ogImage || defaults.ogImage;

  const metadata = {
    title: fullTitle,
    description: metaDescription,
    keywords: [...defaults.keywords, ...keywords].join(", "),
    authors: [{ name: defaults.author }],
    canonical: canonicalUrl,
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      url: canonicalUrl,
      siteName: defaults.siteName,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: "en_US",
      type: ogType,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: metaDescription,
      images: [ogImageUrl],
      creator: defaults.twitterHandle,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
  };

  if (jsonLd) {
    metadata.other = {
      "application/ld+json": JSON.stringify(jsonLd),
    };
  }

  return metadata;
}

export async function getPageSeo(pageType) {
  const defaults = await getSeoDefaults();
  
  const pageConfigs = {
    vendor: {
      title: "Partner with Giftologi - Vendor Marketplace",
      description: "Join Giftologi's vendor marketplace to connect with customers planning their special events. Showcase your products and services to our growing community.",
      keywords: ["vendor marketplace", "event vendors", "wedding vendors", "party suppliers", "business partnership"],
      ogType: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Partner with Giftologi",
        description: "Join Giftologi's vendor marketplace to connect with customers planning their special events.",
        url: `${defaults.siteUrl}/vendor`,
      },
    },
    login: {
      title: "Sign In - Giftologi",
      description: "Sign in to your Giftologi account to manage your gift registries, connect with vendors, and plan your celebrations.",
      keywords: ["sign in", "login", "account access", "gift registry login"],
      ogType: "website",
      noIndex: true,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Sign In - Giftologi",
        description: "Sign in to your Giftologi account to manage your gift registries.",
        url: `${defaults.siteUrl}/login`,
      },
    },
    signup: {
      title: "Sign Up - Giftologi",
      description: "Create your free Giftologi account and start building beautiful gift registries for your special occasions.",
      keywords: ["sign up", "register", "create account", "gift registry", "free account"],
      ogType: "website",
      noIndex: true,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Sign Up - Giftologi",
        description: "Create your free Giftologi account and start building beautiful gift registries.",
        url: `${defaults.siteUrl}/signup`,
      },
    },
    home: {
      title: "Giftologi - Create Beautiful Gift Registries",
      description: "Create and manage gift registries for weddings, baby showers, birthdays, and more. Connect with vendors and make every celebration memorable.",
      keywords: ["gift registry", "wedding registry", "baby shower registry", "gift lists", "celebration planning"],
      ogType: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Giftologi",
        description: "Create and manage gift registries for weddings, baby showers, birthdays, and more.",
        url: defaults.siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${defaults.siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    },
  };

  return pageConfigs[pageType] || pageConfigs.home;
}
