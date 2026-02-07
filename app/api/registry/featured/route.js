import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;

const toHostName = (profile) => {
  if (!profile) return "";
  const first = profile.firstname || "";
  const last = profile.lastname || "";
  const name = `${first} ${last}`.trim();
  return name || profile.email || "";
};

const serializeRegistry = (row, host) => ({
  id: row?.id || null,
  registryName: row?.title || "",
  registryCode: row?.registry_code || "",
  coverPhoto: row?.cover_photo || null,
  deadline: row?.deadline || null,
  createdAt: row?.created_at || null,
  event: {
    id: row?.event?.id || null,
    type: row?.event?.type || "",
    title: row?.event?.title || "",
    date: row?.event?.date || null,
  },
  host: host
    ? {
        id: host.id,
        name: toHostName(host),
        email: host.email || "",
        image: host.image || null,
      }
    : null,
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const pageRaw = searchParams.get("page");

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
    );
    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const from = (page - 1) * limit;
    const to = from + limit;

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from("featured_registries")
      .select(
        `
        registry:registries!inner(
          id,
          title,
          registry_code,
          cover_photo,
          deadline,
          created_at,
          event:events!inner(
            id,
            host_id,
            type,
            title,
            date,
            privacy
          )
        )
      `
      )
      .eq("active", true)
      .eq("registry.event.privacy", "public")
      .gte("registry.deadline", nowIso)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    const { data, error } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { message: "Failed to load featured registries" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const registries = rows.map((row) => row?.registry).filter(Boolean);
    const pageRegistries = registries.slice(0, limit);
    const has_more = registries.length > limit;

    const hostIds = pageRegistries
      .map((row) => row?.event?.host_id)
      .filter(Boolean);

    const { data: hosts } = hostIds.length
      ? await supabase
          .from("profiles")
          .select("id, firstname, lastname, email, image")
          .in("id", hostIds)
      : { data: [] };

    const hostMap = new Map(
      (Array.isArray(hosts) ? hosts : []).map((host) => [host.id, host])
    );

    const payload = pageRegistries.map((row) =>
      serializeRegistry(row, hostMap.get(row?.event?.host_id))
    );

    return NextResponse.json(
      { registries: payload, has_more, page, limit },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in featured registries:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
