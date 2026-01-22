import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

const allowedRoles = [
  "super_admin",
  "finance_admin",
  "operations_manager_admin",
  "customer_support_admin",
  "store_manager_admin",
  "marketing_admin",
];

const ADMIN_PAGES = [
  {
    pageKey: "admin_home",
    pageTitle: "Dashboard Overview",
    href: "/dashboard/admin",
    description: "Admin dashboard overview",
    keywords: ["dashboard", "overview", "admin", "home"],
  },
  {
    pageKey: "support_tickets",
    pageTitle: "Support Tickets",
    href: "/dashboard/admin/reports?focusId=support_tickets",
    description: "View and export support ticket data",
    keywords: [
      "support",
      "tickets",
      "customer support",
      "help",
      "complaints",
      "issues",
    ],
  },
  {
    pageKey: "reports_registry_summary",
    pageTitle: "Registry Summary Report",
    href: "/dashboard/admin/reports?focusId=registry_summary",
    description: "Export registry summary metrics",
    keywords: ["reports", "registries", "registry", "summary", "export"],
  },
  {
    pageKey: "reports_vendor_performance",
    pageTitle: "Vendor Performance Report",
    href: "/dashboard/admin/reports?focusId=vendor_performance",
    description: "Export vendor performance and fulfillment metrics",
    keywords: ["reports", "vendors", "vendor", "performance", "export"],
  },
  {
    pageKey: "reports_financial_transactions",
    pageTitle: "Financial Transactions Report",
    href: "/dashboard/admin/reports?focusId=financial_transactions",
    description: "Export financial transactions and revenue breakdown",
    keywords: ["reports", "finance", "financial", "transactions", "export"],
  },
  {
    pageKey: "reports_support_tickets",
    pageTitle: "Support Tickets Report",
    href: "/dashboard/admin/reports?focusId=support_tickets",
    description: "Export support tickets summary",
    keywords: ["reports", "support", "tickets", "export"],
  },
  {
    pageKey: "reports_user_activity",
    pageTitle: "User Activity Report",
    href: "/dashboard/admin/reports?focusId=user_activity",
    description: "Export user engagement metrics",
    keywords: ["reports", "users", "activity", "engagement", "export"],
  },
  {
    pageKey: "roles",
    pageTitle: "Manage Roles",
    href: "/dashboard/admin/roles",
    description: "Create, assign, or revoke staff roles and permissions",
    keywords: ["roles", "permissions", "staff", "rbac", "access"],
  },
  {
    pageKey: "registry_list",
    pageTitle: "Open Registry List",
    href: "/dashboard/admin/registry_list",
    description: "View and manage all registries on the platform",
    keywords: ["registry", "registries", "events", "hosts"],
  },
  {
    pageKey: "vendor_requests",
    pageTitle: "Vendor Requests",
    href: "/dashboard/admin/vendor_requests",
    description: "Approve or reject vendor applications",
    keywords: ["vendors", "vendor", "applications", "approvals", "requests"],
  },
  {
    pageKey: "products",
    pageTitle: "Manage Products",
    href: "/dashboard/admin/products",
    description: "View and manage product catalog and inventory",
    keywords: ["products", "catalog", "inventory", "categories"],
  },
  {
    pageKey: "transactions",
    pageTitle: "View Transactions",
    href: "/dashboard/admin/transactions",
    description: "Search and review orders and transactions",
    keywords: ["transactions", "orders", "payments", "refunds"],
  },
  {
    pageKey: "payouts",
    pageTitle: "Payouts",
    href: "/dashboard/admin/payouts",
    description: "Review vendor payout information",
    keywords: ["payouts", "vendors", "finance", "payment info"],
  },
  {
    pageKey: "reports",
    pageTitle: "Generate Reports",
    href: "/dashboard/admin/reports",
    description: "Export summary reports (PDF/CSV)",
    keywords: ["reports", "export", "csv", "pdf", "support tickets"],
  },
  {
    pageKey: "activity_log",
    pageTitle: "View Activity Log",
    href: "/dashboard/admin/activity_log",
    description: "Track admin actions, approvals, and suspensions",
    keywords: ["activity", "audit", "log", "history"],
  },
  {
    pageKey: "api_documentation",
    pageTitle: "API Documentation",
    href: "/dashboard/admin/api_documentation",
    description: "View database schema, endpoints, and system behaviour",
    keywords: ["api", "docs", "documentation", "schema"],
  },
  {
    pageKey: "api_documentation_admin_search",
    pageTitle: "Admin Search API",
    href: "/dashboard/admin/api_documentation?focusId=/api/admin/search",
    description: "Docs for the global admin search endpoint",
    keywords: ["api", "admin", "search", "/api/admin/search"],
  },
  {
    pageKey: "api_documentation_registry_track_view",
    pageTitle: "Registry View Tracking API",
    href: "/dashboard/admin/api_documentation?focusId=/api/registry/track-view",
    description: "Docs for registry page view tracking",
    keywords: ["api", "registry", "track", "view", "/api/registry/track-view"],
  },
  {
    pageKey: "api_documentation_admin_activity_log",
    pageTitle: "Admin Activity Log Table",
    href: "/dashboard/admin/api_documentation?focusId=supabase://admin_activity_log",
    description: "Docs for audit trail storage",
    keywords: ["supabase", "admin_activity_log", "audit", "log"],
  },
  {
    pageKey: "analytics_reporting",
    pageTitle: "Analytics & Reporting",
    href: "/dashboard/admin/analytics_reporting",
    description: "Track platform performance, vendors, and user engagement",
    keywords: ["analytics", "reporting", "metrics", "performance"],
  },
  {
    pageKey: "analytics_reporting_overview",
    pageTitle: "Analytics Overview",
    href: "/dashboard/admin/analytics_reporting?tab=overview",
    description: "High-level platform overview metrics",
    keywords: ["analytics", "overview", "summary", "metrics"],
  },
  {
    pageKey: "analytics_reporting_financial",
    pageTitle: "Financial Reports",
    href: "/dashboard/admin/analytics_reporting?tab=financial",
    description: "Revenue, service charges, and payout analytics",
    keywords: ["analytics", "financial", "finance", "revenue", "payouts"],
  },
  {
    pageKey: "analytics_reporting_vendor_product",
    pageTitle: "Vendor & Product Analytics",
    href: "/dashboard/admin/analytics_reporting?tab=vendor_product",
    description: "Top vendors, top products, inventory insights",
    keywords: ["analytics", "vendors", "products", "inventory", "top"],
  },
  {
    pageKey: "analytics_reporting_registry_user",
    pageTitle: "Registry & User Behaviour",
    href: "/dashboard/admin/analytics_reporting?tab=registry_user",
    description: "Registry creation, user engagement, page views",
    keywords: ["analytics", "registry", "user", "behaviour", "page views"],
  },
  {
    pageKey: "content_policy_pages",
    pageTitle: "Content & Policy Pages",
    href: "/dashboard/admin/content_policy_pages",
    description: "Manage static pages, email templates, and FAQs",
    keywords: ["content", "policy", "pages", "email", "templates", "faq"],
  },
  {
    pageKey: "content_policy_pages_static",
    pageTitle: "Static Pages",
    href: "/dashboard/admin/content_policy_pages?tab=static_pages",
    description: "Manage static pages",
    keywords: ["content", "policy", "static", "pages"],
  },
  {
    pageKey: "content_policy_pages_email",
    pageTitle: "Email Templates",
    href: "/dashboard/admin/content_policy_pages?tab=email_templates",
    description: "Manage email templates",
    keywords: ["content", "email", "template", "templates"],
  },
  {
    pageKey: "content_policy_pages_faq",
    pageTitle: "FAQs",
    href: "/dashboard/admin/content_policy_pages?tab=faq",
    description: "Manage FAQs",
    keywords: ["content", "faq", "faqs", "questions", "answers"],
  },
  {
    pageKey: "content_policy_pages_contact",
    pageTitle: "Contact Info",
    href: "/dashboard/admin/content_policy_pages?tab=contact_info",
    description: "View contact settings and contact submissions",
    keywords: ["content", "contact", "support", "submissions"],
  },
  {
    pageKey: "all_users",
    pageTitle: "All Users",
    href: "/dashboard/admin/all_users",
    description: "Search and manage users on the platform",
    keywords: ["users", "profiles", "hosts", "guests", "vendors", "staff"],
  },
];

const normalizeText = (input) =>
  String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (input) => normalizeText(input).split(" ").filter(Boolean);

const ALLOWED_NAVIGATE_QUERY_KEYS = new Set([
  "q",
  "status",
  "type",
  "page",
  "focusId",
  "focusEntity",
  "tab",
  "by",
  "role",
  "segment",
  "action",
  "user",
  "range",
  "method",
  "from",
  "to",
]);

const normalizeNavigateQuery = (input) => {
  if (!input || typeof input !== "object") return {};
  const output = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue === undefined || rawValue === null) continue;

    let key = rawKey;
    if (key === "focus_id") key = "focusId";
    if (key === "focus_entity") key = "focusEntity";

    if (key === "search_type" || key === "search_status") continue;
    if (!ALLOWED_NAVIGATE_QUERY_KEYS.has(key)) continue;

    output[key] = String(rawValue);
  }

  if (output.page !== undefined && output.page !== null) {
    const num = parseInt(String(output.page), 10);
    if (Number.isNaN(num) || num < 1) {
      output.page = "1";
    } else {
      output.page = String(num);
    }
  }

  return output;
};

const normalizeAllUsersStatusParam = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "all") return "all";
  if (lower === "active") return "Active";
  if (lower === "inactive") return "Inactive";
  if (lower === "suspended") return "Suspended";
  if (lower === "pending") return "Pending";
  if (lower === "deleted") return "Deleted";
  return raw;
};

const applyNavigateDefaults = (navigatePath, navigateQuery) => {
  let output = navigateQuery || {};

  if (navigatePath === "/dashboard/admin/vendor_requests") {
    if (output.status === undefined || output.status === null) {
      output = { ...output, status: "all" };
    }
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/all_users") {
    if (output.role === undefined || output.role === null) {
      output = { ...output, role: "all" };
    }

    if (output.status === undefined || output.status === null) {
      output = { ...output, status: "all" };
    } else {
      const normalizedStatus = normalizeAllUsersStatusParam(output.status);
      if (normalizedStatus) {
        output = { ...output, status: normalizedStatus };
      }
    }

    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/registry_list") {
    if (output.by === undefined || output.by === null) {
      output = { ...output, by: "all" };
    }
    if (output.status === undefined || output.status === null) {
      output = { ...output, status: "all" };
    }
    if (output.type === undefined || output.type === null) {
      output = { ...output, type: "all" };
    }
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/products") {
    if (output.status === undefined || output.status === null) {
      output = { ...output, status: "all" };
    }
    if (output.type === undefined || output.type === null) {
      output = { ...output, type: "all" };
    }
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/transactions") {
    if (output.status === undefined || output.status === null) {
      output = { ...output, status: "all" };
    }
    if (output.type === undefined || output.type === null) {
      output = { ...output, type: "all" };
    }
    if (output.method === undefined || output.method === null) {
      output = { ...output, method: "all" };
    }
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/payouts") {
    if (output.status === undefined || output.status === null) {
      output = { ...output, status: "all" };
    }
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/activity_log") {
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/roles") {
    if (output.page === undefined || output.page === null) {
      output = { ...output, page: "1" };
    }
  }

  if (navigatePath === "/dashboard/admin/reports") {
    if (output.range === undefined || output.range === null) {
      output = { ...output, range: "last_30_days" };
    }
  }

  return output;
};

const scorePageMatch = (page, q) => {
  const nq = normalizeText(q);
  if (!nq) return 0;

  const title = normalizeText(page.pageTitle);
  const href = normalizeText(page.href);
  const desc = normalizeText(page.description || "");
  const keywords = normalizeText((page.keywords || []).join(" "));
  const haystack = `${title} ${href} ${desc} ${keywords}`.trim();

  let score = 0;

  if (title === nq) score += 30;
  if (href === nq) score += 25;
  if (title.startsWith(nq)) score += 18;
  if (haystack.includes(nq)) score += 12;

  const qTokens = new Set(tokenize(nq));
  const hTokens = new Set(tokenize(haystack));
  let overlap = 0;
  for (const t of qTokens) {
    if (hTokens.has(t)) overlap += 1;
  }
  score += overlap * 4;

  return score;
};

const scoreResultMatch = ({ title, subtitle, status, pageTitle, entityType }, q) => {
  const nq = normalizeText(q);
  if (!nq) return 0;

  const t = normalizeText(title);
  const s = normalizeText(subtitle);
  const st = normalizeText(status);
  const pt = normalizeText(pageTitle);

  const haystack = `${t} ${s} ${st} ${pt} ${normalizeText(entityType)}`.trim();

  let score = 0;
  if (t === nq) score += 50;
  if (t.startsWith(nq)) score += 28;
  if (t.includes(nq)) score += 18;
  if (s.includes(nq)) score += 10;
  if (st.includes(nq)) score += 6;
  if (pt.includes(nq)) score += 8;

  const qTokens = new Set(tokenize(nq));
  const hTokens = new Set(tokenize(haystack));
  let overlap = 0;
  for (const token of qTokens) {
    if (hTokens.has(token)) overlap += 1;
  }
  score += overlap * 4;

  return score;
};

export async function GET(req) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type") || "all";
  const status = searchParams.get("status") || "all";

  const typeNormalized = String(type).toLowerCase();
  const includePages = typeNormalized === "all" || typeNormalized === "pages";

  if (!query) {
    return NextResponse.json({ results: [], message: "" });
  }

  const pageMatches = includePages
    ? ADMIN_PAGES.map((page) => ({
        page,
        score: scorePageMatch(page, query),
      }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ page, score }) => ({
          id: page.href,
          entityType: "page",
          title: page.pageTitle,
          subtitle: page.description || page.href,
          status: "",
          _score: score,
          navigate: {
            path: page.href,
            query: {},
          },
        }))
    : [];

  const {
    data: { user } = { user: null },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { results: [], message: "You must be logged in to search." },
      { status: 401 }
    );
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return NextResponse.json(
      { results: [], message: "You are not authorized to use admin search." },
      { status: 403 }
    );
  }

  let normalizedRows = [];

  if (typeNormalized !== "pages") {
    const { data: rows, error } = await supabase.rpc("admin_global_search_v2", {
      q: query,
      search_type: type,
      search_status: status,
    });

    if (error) {
      return NextResponse.json(
        { results: [], message: error.message },
        { status: 500 }
      );
    }

    normalizedRows = Array.isArray(rows) ? rows : [];
  }

  const groupMap = new Map();

  if (pageMatches.length) {
    groupMap.set("admin_pages", {
      pageKey: "admin_pages",
      pageTitle: "Admin Pages",
      results: pageMatches,
    });
  }

  for (const row of normalizedRows) {
    const pageKey = row?.page_key || "other";
    const pageTitle = row?.page_title || "Other";

    const existing = groupMap.get(pageKey) || {
      pageKey,
      pageTitle,
      results: [],
    };

    const navigateQuery = normalizeNavigateQuery(row.navigate_query || {});

    let mergedNavigateQuery = navigateQuery;

    mergedNavigateQuery = applyNavigateDefaults(row.navigate_path, mergedNavigateQuery);

    if (
      row.navigate_path === "/dashboard/admin/vendor_requests" &&
      (navigateQuery.status === undefined || navigateQuery.status === null)
    ) {
      mergedNavigateQuery = { ...mergedNavigateQuery, status: "all" };
    }

    if (
      row.navigate_path === "/dashboard/admin/all_users" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = { ...mergedNavigateQuery, focusId: row.id };
    }

    if (
      row.navigate_path === "/dashboard/admin/content_policy_pages" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
        focusEntity: row.entity_type,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/products" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/registry_list" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/reports" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/roles" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        segment: mergedNavigateQuery.segment || "staff-members",
        focusId: row.id,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/transactions" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/activity_log" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
      };
    }

    if (
      row.navigate_path === "/dashboard/admin/payouts" &&
      (mergedNavigateQuery.focusId === undefined ||
        mergedNavigateQuery.focusId === null)
    ) {
      mergedNavigateQuery = {
        ...mergedNavigateQuery,
        focusId: row.id,
      };
    }

    const matchScore = scoreResultMatch(
      {
        title: row.title,
        subtitle: row.subtitle,
        status: row.status,
        pageTitle,
        entityType: row.entity_type,
      },
      query
    );

    existing.results.push({
      id: row.id,
      entityType: row.entity_type,
      title: row.title,
      subtitle: row.subtitle,
      status: row.status,
      _score: matchScore,
      navigate: {
        path: row.navigate_path,
        query: mergedNavigateQuery,
      },
    });

    groupMap.set(pageKey, existing);
  }

  const groups = Array.from(groupMap.values())
    .map((group) => {
      const sorted = (group.results || [])
        .slice()
        .sort((a, b) => {
          const as = typeof a._score === "number" ? a._score : 0;
          const bs = typeof b._score === "number" ? b._score : 0;
          if (bs !== as) return bs - as;
          return String(a.title || "").localeCompare(String(b.title || ""));
        })
        .map(({ _score, ...rest }) => rest);

      const groupScore = (group.results || []).reduce((max, row) => {
        const value = typeof row?._score === "number" ? row._score : 0;
        return value > max ? value : max;
      }, 0);

      return {
        ...group,
        _groupScore: groupScore,
        results: sorted,
      };
    })
    .sort((a, b) => {
      const as = typeof a._groupScore === "number" ? a._groupScore : 0;
      const bs = typeof b._groupScore === "number" ? b._groupScore : 0;
      if (bs !== as) return bs - as;
      return String(a.pageTitle || "").localeCompare(String(b.pageTitle || ""));
    })
    .map(({ _groupScore, ...rest }) => rest);

  const results = groups.flatMap((group) => group.results);

  return NextResponse.json({
    groups,
    results,
    message: results.length ? "" : "No results found",
  });
}
