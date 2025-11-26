import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

const allowedRoles = [
  "super_admin",
  "finance_admin",
  "operations_manager_admin",
  "customer_support_admin",
];

export async function GET(req) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type") || "all";
  const status = searchParams.get("status") || "all";

  if (!query) {
    return NextResponse.json({ results: [], message: "" });
  }

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

  const { data: rows, error } = await supabase.rpc("admin_global_search", {
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

  const results = Array.isArray(rows)
    ? rows.map((row) => {
        const entityType = row.entity_type;
        const baseNavigate =
          entityType === "vendor"
            ? "/dashboard/admin/vendor_requests"
            : "/dashboard/admin/registry_list";

        return {
          id: row.id,
          entityType,
          title: row.title,
          subtitle: row.subtitle,
          status: row.status,
          navigate: {
            path: baseNavigate,
            query: {
              q: query,
              type: entityType,
              focusId: row.id,
              page: "1",
            },
          },
        };
      })
    : [];

  return NextResponse.json({
    results,
    message: results.length ? "" : "No results found",
  });
}
