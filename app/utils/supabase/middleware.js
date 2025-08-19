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

  let supabase = createServerClient(
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
  const type = url.searchParams.get("type");

  // Helper: role dashboard by profile role
  const redirectToRoleDashboard = (role) => {
    const dest =
      role && roleRedirects?.[role] ? roleRedirects[role] : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  };

  // Attempt to exchange code for a session when present and no user yet
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && hasOAuthOrVerifyCode && code) {
    try {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        // Recreate client with updated cookies so DB calls include Authorization
        supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
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
                cookiesToSet.forEach(({ name, value, options }) =>
                  supabaseResponse.cookies.set(name, value, options)
                );
              },
            },
          }
        );
        // Re-fetch user after successful exchange (email is now confirmed)
        const res = await supabase.auth.getUser();
        user = res.data.user;

        // If this is an email confirmation from signup, route to login to complete registration
        if (type === "signup") {
          const dest = new URL("/login", request.url);
          dest.searchParams.set("verified", "1");
          // Prepare a redirect response so cookie updates attach to it
          supabaseResponse = NextResponse.redirect(dest);
          // Sign out to require explicit login
          await supabase.auth.signOut();
          return supabaseResponse;
        }
      }
    } catch (e) {
      // swallow and continue
    }
  }

  // If user is logged in now, handle redirects (role-based/auth route protection)
  if (user && user?.id) {
    let { data: profile } = await supabase
      .from("profiles")
      .select("firstname, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const { data: signup_profile } = await supabase
        .from("signup_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (signup_profile) {
        const { data, error } = await supabase
          .from("profiles")
          .upsert([
            {
              id: user?.id,
              email: signup_profile.email,
              firstname: signup_profile.firstname,
              lastname: signup_profile.lastname,
              phone: signup_profile.phone,
              color: signup_profile.color,
              role: signup_profile.role,
              created_at: signup_profile.created_at,
              updated_at: signup_profile.updated_at,
            },
          ])
          .select("*")
          .single();
  
        if (data && !error) {
          profile = data;
        }
      } else {
        console.log("No signup_profile found for user", user?.id);
      }
    }
    // Enforce role-based route isolation: restrict navigation to the user's role area only
    const allowedPrefix = profile?.role ? roleRedirects[profile.role] : null;
    if (allowedPrefix) {
      const isAllowed =
        url.pathname === allowedPrefix ||
        url.pathname.startsWith(allowedPrefix + "/");
      if (!isAllowed) {
        return redirectToRoleDashboard(profile.role);
      }
    }
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
