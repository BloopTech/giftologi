import { NextResponse } from "next/server";

export async function GET(request) {
  // Middleware performs the Supabase code exchange and role redirect.
  // Fallback: bounce to home so middleware can handle it on the next request.
  const url = new URL("/", request.url);
  return NextResponse.redirect(url);
}
