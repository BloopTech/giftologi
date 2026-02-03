import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: options, error } = await supabase
      .from("gift_wrap_options")
      .select("id, name, fee, description, active")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: error.message || "Failed to load gift wrap options" },
        { status: 500 }
      );
    }

    return NextResponse.json({ options: options || [] }, { status: 200 });
  } catch (error) {
    console.error("Failed to load gift wrap options:", error);
    return NextResponse.json(
      { message: "Unexpected error" },
      { status: 500 }
    );
  }
}
