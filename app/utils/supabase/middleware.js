import { authRoutes, protectedRoutes, roleRedirects } from "../../routes";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const loginRedirect = "/";

export async function middlewareClient(request) {
  // Create an unmodified response

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    //process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const hasOAuthOrVerifyCode = url.searchParams.has("code");
  const code = url.searchParams.get("code");

  // Helper: role dashboard by profile role
  const redirectToRoleDashboard = (role) => {
    const dest = role && roleRedirects?.[role] ? roleRedirects[role] : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  };

  // Attempt to exchange code for a session when present and no user yet
  let {
    data: { user },
  } = await supabase.auth.getUser();
console.log("user.........................", user)
  if (!user && hasOAuthOrVerifyCode && code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      console.log("exchangeError............................", exchangeError)
      if (!exchangeError) {
        // Re-fetch user after successful exchange
        const res = await supabase.auth.getUser();
        user = res.data.user;
        console.log("user 2............................", user)
      }
    } catch (e) {
      // swallow and continue
    }
  }

  // If user is logged in now, handle redirects (role-based/auth route protection)
  if (user && user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("firstname, role")
      .eq("id", user.id)
      .single();

    // If arriving with code or at root, redirect by role
    if (hasOAuthOrVerifyCode || url.pathname === "/") {
      if (profile?.role) {
        return redirectToRoleDashboard(profile.role);
      }
      return NextResponse.redirect(new URL(loginRedirect, request.url));
    }

    // Redirect away from auth routes (login/signup) to role/home
    if (authRoutes.includes(url.pathname)) {
      if (profile?.role) {
        return redirectToRoleDashboard(profile.role);
      }
      return NextResponse.redirect(new URL(loginRedirect, request.url));
    }

    return supabaseResponse;
  }
  // If user is not logged in
  else {
    // Redirect to login for protected routes (treat as prefixes)
    const isProtected = protectedRoutes.some((p) => url.pathname.startsWith(p));
    if (isProtected) {
      return NextResponse.redirect(
        new URL("/login?next=" + (next || url.pathname), request.url)
      );
    }
    return supabaseResponse;
  }
}
