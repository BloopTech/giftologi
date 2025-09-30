import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

function csvEscape(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(req) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const params = url.searchParams;

    const rawRole = (params.get("role") || "all").toLowerCase();
    const allowedRoles = ["all", "host", "vendor", "admin", "guest"];
    const role = allowedRoles.includes(rawRole) ? rawRole : "all";
    const q = (params.get("q") || "").toString();
    const rawSort = (params.get("sort") || "created_at").toString();
    const rawDir = (params.get("dir") || "desc").toString().toLowerCase();
    const allowedSorts = ["created_at", "name", "role"];
    const allowedDirs = ["asc", "desc"];
    const sort = allowedSorts.includes(rawSort) ? rawSort : "created_at";
    const dir = allowedDirs.includes(rawDir) ? rawDir : "desc";

    let selectFields = "id, firstname, lastname, email, role, created_at, status";
    let query = supabase.from("profiles").select(selectFields, { count: "exact" });

    if (role !== "all") query = query.eq("role", role);
    if (q) {
      const pattern = `%${q}%`;
      query = query.or(
        `firstname.ilike.${pattern},lastname.ilike.${pattern},email.ilike.${pattern}`
      );
    }

    if (sort === "created_at") {
      query = query.order("created_at", { ascending: dir === "asc" });
    } else if (sort === "role") {
      query = query.order("role", { ascending: dir === "asc" });
    } else if (sort === "name") {
      query = query.order("firstname", { ascending: dir === "asc" }).order("lastname", { ascending: dir === "asc" });
    }

    // Cap export size
    query = query.limit(5000);

    let data = [];
    try {
      const { data: rows, error } = await query;
      if (error) throw error;
      data = rows || [];
    } catch (err) {
      // Fallback without status column
      let fb = supabase
        .from("profiles")
        .select("id, firstname, lastname, email, role, created_at", { count: "exact" });
      if (role !== "all") fb = fb.eq("role", role);
      if (q) {
        const pattern = `%${q}%`;
        fb = fb.or(
          `firstname.ilike.${pattern},lastname.ilike.${pattern},email.ilike.${pattern}`
        );
      }
      if (sort === "created_at") fb = fb.order("created_at", { ascending: dir === "asc" });
      else if (sort === "role") fb = fb.order("role", { ascending: dir === "asc" });
      else if (sort === "name") fb = fb.order("firstname", { ascending: dir === "asc" }).order("lastname", { ascending: dir === "asc" });
      fb = fb.limit(5000);
      const { data: rows2 } = await fb;
      data = (rows2 || []).map((u) => ({ ...u, status: "active" }));
    }

    const header = ["id", "firstname", "lastname", "email", "role", "status", "created_at"];
    const lines = [header.join(",")];
    for (const u of data) {
      const row = [
        csvEscape(u.id),
        csvEscape(u.firstname),
        csvEscape(u.lastname),
        csvEscape(u.email),
        csvEscape(u.role),
        csvEscape(u.status ?? "active"),
        csvEscape(u.created_at ? new Date(u.created_at).toISOString() : ""),
      ];
      lines.push(row.join(","));
    }
    const csv = lines.join("\n");

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fileName = `users_export_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${fileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e?.message || "Export failed" }, { status: 500 });
  }
}
