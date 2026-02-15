import { createClient } from "../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: pages, error } = await supabase
      .from("content_static_pages")
      .select("id, title, slug, sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch pages." },
        { status: 500 }
      );
    }

    return NextResponse.json({ pages: pages || [] });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
