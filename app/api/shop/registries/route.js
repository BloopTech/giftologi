import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ registries: [], total: 0 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10)
    );
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10))
    );
    const offset = (page - 1) * limit;

    let query = supabase
      .from("registries")
      .select(
        "id, title, registry_code, deadline, event:events!inner(id, type, date)",
        { count: "exact" }
      )
      .eq("registry_owner_id", user.id)
      .or("deadline.is.null,deadline.gt.now()");

    if (q.trim()) {
      query = query.ilike("title", `%${q.trim()}%`);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Registry search error:", error);
      return NextResponse.json({ registries: [], total: 0 });
    }

    return NextResponse.json({
      registries: (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        registry_code: r.registry_code,
        deadline: r.deadline,
        event: Array.isArray(r.event) ? r.event[0] : r.event,
      })),
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to search registries:", error);
    return NextResponse.json({ registries: [], total: 0 });
  }
}
