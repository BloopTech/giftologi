import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/utils/supabase/server";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const SEARCH_BUFFER = 200;

const buildBaseQuery = (admin, nowIso, { includeCount = false, eventType } = {}) => {
  let query = admin
    .from("registries")
    .select(
      `
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
      `,
      includeCount ? { count: "exact" } : undefined,
    )
    .eq("event.privacy", "public")
    .gte("deadline", nowIso);

  if (eventType) {
    query = query.eq("event.type", eventType);
  }

  return query;
};

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
    const rawQuery = searchParams.get("q");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const typeRaw = searchParams.get("type");

    const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT),
    );
    const trimmedQuery = typeof rawQuery === "string" ? rawQuery.trim() : "";
    const trimmedType = typeof typeRaw === "string" ? typeRaw.trim() : "";
    const eventType = trimmedType && trimmedType !== "all" ? trimmedType : "";
    const nowIso = new Date().toISOString();

    const admin = createAdminClient();

    if (!trimmedQuery) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const query = buildBaseQuery(admin, nowIso, {
        includeCount: true,
        eventType,
      })
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;
      if (error) {
        return NextResponse.json(
          { message: "Failed to load registries" },
          { status: 500 },
        );
      }

      const registries = Array.isArray(data) ? data : [];
      const hostIds = registries
        .map((row) => row?.event?.host_id)
        .filter(Boolean);

      const { data: hosts } = hostIds.length
        ? await admin
            .from("profiles")
            .select("id, firstname, lastname, email, image")
            .in("id", hostIds)
        : { data: [] };

      const hostMap = new Map(
        (Array.isArray(hosts) ? hosts : []).map((host) => [host.id, host]),
      );

      const payload = registries.map((row) =>
        serializeRegistry(row, hostMap.get(row?.event?.host_id)),
      );

      return NextResponse.json(
        {
          registries: payload,
          total: typeof count === "number" ? count : payload.length,
          page,
          limit,
        },
        { status: 200 },
      );
    }

    const searchLimit = Math.min(SEARCH_BUFFER, Math.max(limit * page + limit, limit));
    const query = buildBaseQuery(admin, nowIso, { eventType })
      .order("created_at", { ascending: false })
      .range(0, searchLimit - 1);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { message: "Failed to search registries" },
        { status: 500 },
      );
    }

    const registries = Array.isArray(data) ? data : [];
    const hostIds = registries
      .map((row) => row?.event?.host_id)
      .filter(Boolean);

    const { data: hosts } = hostIds.length
      ? await admin
          .from("profiles")
          .select("id, firstname, lastname, email, image")
          .in("id", hostIds)
      : { data: [] };

    const hostMap = new Map(
      (Array.isArray(hosts) ? hosts : []).map((host) => [host.id, host]),
    );

    const term = trimmedQuery.toLowerCase();
    const filtered = registries.filter((row) => {
      const host = hostMap.get(row?.event?.host_id);
      const hostName = toHostName(host).toLowerCase();
      const hostEmail = (host?.email || "").toLowerCase();
      const registryName = (row?.title || "").toLowerCase();
      const registryCode = String(row?.registry_code || "").toLowerCase();
      const eventType = (row?.event?.type || "").toLowerCase();
      const eventTitle = (row?.event?.title || "").toLowerCase();

      return (
        registryName.includes(term) ||
        registryCode.includes(term) ||
        hostName.includes(term) ||
        hostEmail.includes(term) ||
        eventType.includes(term) ||
        eventTitle.includes(term)
      );
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const pageItems = filtered.slice(start, start + limit);
    const payload = pageItems.map((row) =>
      serializeRegistry(row, hostMap.get(row?.event?.host_id)),
    );

    return NextResponse.json(
      {
        registries: payload,
        total,
        page,
        limit,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error in registry search:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 },
    );
  }
}
