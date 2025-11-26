import {
  authRoutes,
  protectedRoutes,
  roleRedirects,
  eventPublicRoutes,
} from "../../routes";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const loginRedirect = "/";

const matchesRoutePattern = (pathname, pattern) => {
  if (pattern === pathname) {
    return true;
  }
  const regex = new RegExp(
    "^" + pattern.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/") + "$"
  );
  return regex.test(pathname);
};

export async function middlewareClient(request) {
  // Create an unmodified response

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Collect cookies set during auth exchange so we can apply them to redirects with full options
  const pendingCookies = [];

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
          cookiesToSet.forEach(({ name, value, options }) => {
            // Normalize cookie options for dev/local where HTTPS may not be used
            const { domain, ...rest } = options || {};
            const adjusted = {
              ...rest,
              secure: new URL(request.url).protocol === "https:",
            };
            // In middleware, request.cookies.set is a no-op, but keep parity
            try {
              request.cookies.set(name, value);
            } catch (_) {}
            supabaseResponse.cookies.set(name, value, adjusted);
            pendingCookies.push({ name, value, options: adjusted });
          });
        },
      },
    }
  );

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const hasOAuthOrVerifyCode = url.searchParams.has("code");
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const isPasswordResetRoute = url.pathname.startsWith("/password-reset");
  const isForgotRoute = url.pathname === "/forgot-password";
  const isEventPublicRoute = eventPublicRoutes?.some((pattern) =>
    matchesRoutePattern(url.pathname, pattern)
  );
  const isApiRoute = url.pathname.startsWith("/api/");

  // Helper: create redirect with auth cookies applied (use function declaration for hoisting)
  function withCookiesRedirect(urlObj) {
    const resp = NextResponse.redirect(urlObj);
    try {
      pendingCookies.forEach(({ name, value, options }) =>
        resp.cookies.set(name, value, options)
      );
    } catch (_) {}
    return resp;
  }

  // Helper: role dashboard by profile role (copy cookies with full options onto redirect)
  const redirectToRoleDashboard = (role) => {
    const dest =
      role && roleRedirects?.[role] ? roleRedirects[role] : "/dashboard";
    return withCookiesRedirect(new URL(dest, request.url));
  };

  // Attempt to exchange code for a session when present and no user yet
  let {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthCallbackRoute = url.pathname === "/auth/callback";

  if (!user && hasOAuthOrVerifyCode && code) {
    // For email/password confirmation links (e.g. /?code=...), do NOT run PKCE exchange on the server.
    // Instead, treat them as plain verification and send user to login with a verified flag.
    if (!isAuthCallbackRoute) {
      const dest = new URL("/login", request.url);
      dest.searchParams.set("verified", "1");
      return withCookiesRedirect(dest);
    }

    try {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
        console.log("exchangeError.....................", exchangeError);
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
                cookiesToSet.forEach(({ name, value, options }) => {
                  const { domain, ...rest } = options || {};
                  const adjusted = {
                    ...rest,
                    secure: new URL(request.url).protocol === "https:",
                  };
                  try { request.cookies.set(name, value); } catch (_) {}
                  supabaseResponse.cookies.set(name, value, adjusted);
                  pendingCookies.push({ name, value, options: adjusted });
                });
              },
            },
          }
        );
        // Re-fetch user after successful exchange (email is now confirmed)
        const res = await supabase.auth.getUser();
        user = res.data.user;

        // If this is a confirmation from signup
        if (type === "signup") {
          const provider = user?.app_metadata?.provider;
          // For email/password signups, redirect to login after verification
          if (!provider || provider === "email") {
            const dest = new URL("/login", request.url);
            dest.searchParams.set("verified", "1");
            // Sign out to require explicit login and capture cookies to clear session
            await supabase.auth.signOut();
            return withCookiesRedirect(dest);
          }
          // For OAuth (e.g., Google), keep the session and continue.
          // We'll create missing profiles below and redirect to role dashboard.
        }

        // After any OAuth code exchange, immediately redirect to the same URL
        // without the auth params so cookies are committed before further redirects.
        if (user?.app_metadata?.provider && user.app_metadata.provider !== "email") {
          const cleanUrl = new URL(request.url);
          cleanUrl.searchParams.delete("code");
          cleanUrl.searchParams.delete("type");
          return withCookiesRedirect(cleanUrl);
        }
      }
    } catch (e) {
      // swallow and continue
    }
  }

  // If user is logged in now, handle redirects (role-based/auth route protection)
  if (user && user?.id) {
    if (isEventPublicRoute) {
      return supabaseResponse;
    }
    if (isApiRoute) {
      return supabaseResponse;
    }
    // Block auth pages for logged-in users, except allow password reset during recovery flow
    if (isForgotRoute || isPasswordResetRoute) {
      if (isPasswordResetRoute && hasOAuthOrVerifyCode) {
        return supabaseResponse;
      }
      return withCookiesRedirect(new URL(loginRedirect, request.url));
    }
    //console.log("user", user);
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
              email: signup_profile?.email,
              firstname: signup_profile?.firstname,
              lastname: signup_profile?.lastname,
              color: signup_profile?.color,
              role: signup_profile?.role,
              created_by: signup_profile?.created_by,
              created_at: signup_profile?.created_at,
              updated_at: signup_profile?.updated_at,
            },
          ])
          .select("*")
          .single();

        if (data && !error) {
          profile = data;
        }
      } else {
        // No signup_profile found; likely an OAuth signup (e.g., Google).
        // Create minimal signup_profile and profile so we can route by role.
        try {
          const meta = user?.user_metadata || {};
          const fullName =
            user?.name ||
            user?.full_name ||
            meta?.name ||
            meta?.full_name ||
            `${meta?.given_name || ""} ${meta?.family_name || ""}`.trim();
          const firstname =
            meta?.given_name ||
            (fullName ? fullName?.split(" ")?.[0] : "") ||
            (user?.email ? user?.email?.split("@")?.[0] : "") ||
            (meta?.email ? meta?.email?.split("@")?.[0] : "");
          const lastname =
            meta?.family_name ||
            (fullName && fullName?.includes(" ")
              ? fullName?.split(" ")?.slice(1)?.join(" ")
              : "");
          const email = user?.email || meta?.email || null;
          const image =
            meta?.picture ||
            meta?.avatar_url ||
            user?.picture ||
            user?.avatar_url ||
            null;
          // Generate a random hex color like in email/password signup flow
          const chars = "0123456789ABCDEF";
          let color = "#";
          for (let i = 0; i < 6; i++) {
            color += chars[Math.floor(Math.random() * 16)];
          }
          const role = "host";
          // Best effort: insert a signup_profile
          const { data: createdSignup, error: signupErr } = await supabase
            .from("signup_profiles")
            .upsert([
              {
                user_id: user.id,
                email,
                firstname,
                lastname,
                color,
                role,
                image,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select("*")
            .single();
          const source = createdSignup || {
            email,
            firstname,
            lastname,
            color,
            role,
            image,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          // Create the profiles row
          const { data: createdProfile, error: profileErr } = await supabase
            .from("profiles")
            .upsert([
              {
                id: user?.id,
                email: source.email,
                firstname: source.firstname,
                lastname: source.lastname,
                color: source.color,
                role: source.role,
                image: source.image,
                created_at: source.created_at,
                updated_at: source.updated_at,
              },
            ])
            .select("*")
            .single();
          if (createdProfile && !profileErr) {
            profile = createdProfile;
          } else {
            // console.log(
            //   "Failed to create profile for user",
            //   user?.id,
            //   profileErr
            // );
          }
        } catch (e) {
          // console.log(
          //   "Error creating OAuth profile for user",
          //   user?.id,
          //   e?.message || e
          // );
        }
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
      return withCookiesRedirect(new URL(loginRedirect, request.url));
    }

    // Redirect away from auth routes (login/signup) to role/home
    if (authRoutes.includes(url.pathname)) {
      if (profile?.role) {
        return redirectToRoleDashboard(profile.role);
      }
      return withCookiesRedirect(new URL(loginRedirect, request.url));
    }

    return supabaseResponse;
  }
  // If user is not logged in
  else {
    // Only allow password reset route when arriving with a valid recovery code
    if (
      isPasswordResetRoute &&
      !hasOAuthOrVerifyCode
    ) {
      return withCookiesRedirect(new URL("/forgot-password", request.url));
    }
    // Redirect to login for protected routes (treat as prefixes)
    const isProtected = protectedRoutes.some((p) => url.pathname.startsWith(p));
    if (isProtected) {
      return withCookiesRedirect(
        new URL("/login?next=" + (next || url.pathname), request.url)
      );
    }
    return supabaseResponse;
  }
}
