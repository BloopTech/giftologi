import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";

const ALLOWED_ADMIN_ROLES = [
  "super_admin",
  "finance_admin",
  "operations_manager_admin",
  "customer_support_admin",
  "store_manager_admin",
  "marketing_admin",
  "ops_hr_admin",
];

const STATUS_CANONICAL_MAP = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  pending: "Pending",
  deleted: "Deleted",
};

const STATUS_VARIANTS = {
  Active: ["Active", "active"],
  Inactive: ["Inactive", "inactive"],
  Suspended: ["Suspended", "suspended"],
  Deleted: ["Deleted", "deleted"],
};

const normalizeStatusFilter = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "all";
  const lower = raw.toLowerCase();
  if (lower === "all") return "all";
  return STATUS_CANONICAL_MAP[lower] || raw;
};

const normalizeRowStatus = (status, source) => {
  if (source === "invite") return "Pending";
  const raw = String(status || "").trim();
  if (!raw) return "Active";
  return STATUS_CANONICAL_MAP[raw.toLowerCase()] || raw;
};

const buildFtsTokens = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token}:*`)
    .join(" & ");

const buildSimilarityNeedle = (row) =>
  [row?.firstname, row?.lastname, row?.email, row?.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const scoreSimilarity = (needle, query) => {
  if (!needle || !query) return 0;

  if (needle === query) return 200;
  if (needle.startsWith(query)) return 120;
  if (needle.includes(query)) return 90;

  const queryTokens = query.split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return 0;

  let tokenScore = 0;
  for (const token of queryTokens) {
    if (needle.includes(token)) tokenScore += 20;
    else if (token.length > 3 && needle.includes(token.slice(0, 3))) tokenScore += 8;
  }

  return tokenScore;
};

const buildInviteSearchFilter = (term) =>
  [
    `email.ilike.%${term}%`,
    `firstname.ilike.%${term}%`,
    `lastname.ilike.%${term}%`,
    `phone.ilike.%${term}%`,
  ].join(",");

export async function GET(request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !currentProfile?.role || !ALLOWED_ADMIN_ROLES.includes(currentProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = String(searchParams.get("q") || "");
    const roleFilter = String(searchParams.get("role") || "all").toLowerCase();
    const statusFilter = normalizeStatusFilter(searchParams.get("status") || "all");

    const staffRoles = [
      "super_admin",
      "finance_admin",
      "operations_manager_admin",
      "customer_support_admin",
      "store_manager_admin",
      "marketing_admin",
      "ops_hr_admin",
    ];

    const trimmedSearch = String(searchTerm || "").trim();
    const ftsTokens = buildFtsTokens(trimmedSearch);

    const applyRoleFilter = (query) => {
      if (roleFilter && roleFilter !== "all") {
        if (roleFilter === "host" || roleFilter === "vendor" || roleFilter === "guest") {
          return query.eq("role", roleFilter);
        }
        if (roleFilter === "admin" || roleFilter === "staff") {
          return query.in("role", staffRoles);
        }
      }
      return query;
    };

    const applyStatusFilter = (query) => {
      if (!statusFilter || statusFilter === "all") return query;

      if (statusFilter === "Active") {
        return query.or("status.eq.Active,status.eq.active,status.is.null");
      }

      const variants = STATUS_VARIANTS[statusFilter] || [statusFilter];
      return query.in("status", variants);
    };

    let profilesQuery = adminClient
      .from("profiles")
      .select("id, email, firstname, lastname, phone, role, status, created_at, updated_at, created_by");

    profilesQuery = applyRoleFilter(profilesQuery);
    profilesQuery = applyStatusFilter(profilesQuery);

    if (ftsTokens) {
      profilesQuery = profilesQuery.filter("search_vector", "fts", ftsTokens);
    } else if (trimmedSearch) {
      profilesQuery = profilesQuery.textSearch("search_vector", trimmedSearch, {
        type: "websearch",
        config: "simple",
      });
    }

    const allInviteRoles = [...staffRoles, "host", "guest", "vendor"];

    let inviteRolesForFilter = [];
    if (!roleFilter || roleFilter === "all") {
      inviteRolesForFilter = allInviteRoles;
    } else if (roleFilter === "admin" || roleFilter === "staff") {
      inviteRolesForFilter = staffRoles;
    } else if (roleFilter === "host" || roleFilter === "guest" || roleFilter === "vendor") {
      inviteRolesForFilter = [roleFilter];
    }

    const shouldIncludeInvites =
      inviteRolesForFilter.length > 0 && (statusFilter === "all" || statusFilter === "Pending");

    const signupProfilesPromise = shouldIncludeInvites
      ? (() => {
          let query = adminClient
            .from("signup_profiles")
            .select("user_id, email, firstname, lastname, phone, role, created_at, updated_at, created_by")
            .in("role", inviteRolesForFilter)
            .order("created_at", { ascending: false });

          if (trimmedSearch) {
            query = query.or(buildInviteSearchFilter(trimmedSearch));
          }

          return query;
        })()
      : Promise.resolve({ data: [], error: null });

    const [
      { data: profileRows, error: profilesError },
      { data: signupRows },
    ] = await Promise.all([
      profilesQuery.order("created_at", { ascending: false }),
      signupProfilesPromise,
    ]);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message || "Failed to load users" }, { status: 500 });
    }

    let baseRows = Array.isArray(profileRows) ? profileRows : [];

    if (trimmedSearch && baseRows.length === 0) {
      let similarityQuery = adminClient
        .from("profiles")
        .select("id, email, firstname, lastname, phone, role, status, created_at, updated_at, created_by")
        .order("created_at", { ascending: false })
        .limit(500);

      similarityQuery = applyRoleFilter(similarityQuery);
      similarityQuery = applyStatusFilter(similarityQuery);
      similarityQuery = similarityQuery.or(buildInviteSearchFilter(trimmedSearch));

      const { data: similarityRows } = await similarityQuery;
      baseRows = Array.isArray(similarityRows) ? similarityRows : [];
    }

    const signupInviteRows = Array.isArray(signupRows)
      ? signupRows.filter((row) => row.user_id)
      : [];

    let existingProfileIds = new Set();
    if (signupInviteRows.length) {
      const inviteUserIds = Array.from(
        new Set(signupInviteRows.map((row) => row.user_id).filter(Boolean))
      );

      if (inviteUserIds.length) {
        const { data: existingProfileRows, error: existingProfilesError } = await adminClient
          .from("profiles")
          .select("id")
          .in("id", inviteUserIds);

        if (existingProfilesError) {
          return NextResponse.json(
            { error: existingProfilesError.message || "Failed to load users" },
            { status: 500 }
          );
        }

        existingProfileIds = new Set(
          Array.isArray(existingProfileRows)
            ? existingProfileRows.map((row) => row.id)
            : []
        );
      }
    }

    const pendingInvites = signupInviteRows
      .filter((row) => !existingProfileIds.has(row.user_id))
      .map((row) => ({
        id: row.user_id,
        email: row.email,
        firstname: row.firstname,
        lastname: row.lastname,
        phone: row.phone,
        role: row.role,
        status: "Pending",
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        __source: "invite",
      }));

    let rows = [...pendingInvites, ...baseRows].map((row) => ({
      ...row,
      status: normalizeRowStatus(row?.status, row?.__source),
    }));

    if (trimmedSearch) {
      const loweredQuery = trimmedSearch.toLowerCase();
      rows = rows
        .map((row) => ({
          ...row,
          __score: scoreSimilarity(buildSimilarityNeedle(row), loweredQuery),
        }))
        .filter((row) => row.__score > 0)
        .sort(
          (a, b) =>
            b.__score - a.__score ||
            String(b.created_at || "").localeCompare(String(a.created_at || ""))
        )
        .map(({ __score, ...row }) => row);
    }

    try {
      const creatorIds = Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean)));

      if (creatorIds.length) {
        const { data: creators } = await adminClient
          .from("profiles")
          .select("id, firstname, lastname, email")
          .in("id", creatorIds);

        if (Array.isArray(creators)) {
          const creatorMap = creators.reduce((acc, profile) => {
            const nameParts = [profile.firstname, profile.lastname].filter(Boolean);
            const name = (nameParts.length ? nameParts.join(" ") : profile.email || "") || "—";
            acc[profile.id] = name;
            return acc;
          }, {});

          rows = rows.map((row) => ({
            ...row,
            created_by_label: row.created_by ? creatorMap[row.created_by] || "—" : "—",
          }));
        }
      }
    } catch {
      // no-op
    }

    try {
      const profileIds = Array.from(new Set(rows.map((row) => row.id).filter(Boolean)));
      if (profileIds.length) {
        const { data: lastLoginRows } = await adminClient.rpc("get_last_sign_in_for_profiles", {
          profile_ids: profileIds,
        });

        if (Array.isArray(lastLoginRows)) {
          const authMetaMap = lastLoginRows.reduce((acc, item) => {
            if (item && item.profile_id) {
              acc[item.profile_id] = {
                last_sign_in_at: item.last_sign_in_at || null,
                auth_created_at: item.created_at || null,
              };
            }
            return acc;
          }, {});

          rows = rows.map((row) => ({
            ...row,
            last_sign_in_at: authMetaMap[row.id]?.last_sign_in_at ?? row.last_sign_in_at ?? null,
            auth_created_at: authMetaMap[row.id]?.auth_created_at ?? row.auth_created_at ?? null,
          }));
        }
      }
    } catch {
      // no-op
    }

    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to load users" },
      { status: 500 }
    );
  }
}
