"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { createClient } from "./utils/supabase/client";
import { roleRedirects } from "./routes";

export default function Error({ reset }) {
  const [dashboardPath, setDashboardPath] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    let ignore = false;

    const load = async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) {
          if (!ignore) setDashboardPath(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (ignore) return;

        if (profile?.role && roleRedirects[profile.role]) {
          setDashboardPath(roleRedirects[profile.role]);
        } else {
          setDashboardPath(null);
        }
      } catch (_) {
        if (!ignore) setDashboardPath(null);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div
      className="bg-[#16150FB2] text-black flex min-h-screen items-center justify-center px-6 py-10 w-full"
      style={{
        backgroundImage: "url('/coming_soon_layer.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main className="flex flex-col items-center justify-center w-full">
        <div className="rounded-2xl relative overflow-hidden max-w-3xl w-full bg-[#FFFCEF] border border-transparent shadow-lg font-poppins">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[55px] -right-2 w-[100%] h-[10px] bg-[#D2BF7C] origin-top-right rotate-40 z-10"
          />

          <div className="relative z-20 px-8 pt-10 pb-10 flex flex-col items-center text-center space-y-6">
            <div className="flex items-center gap-3 text-[#85753C] text-xs tracking-[0.25em] uppercase">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FCE4D9] px-3 py-1 text-[10px] font-semibold text-[#C05034]">
                <AlertTriangle className="h-3 w-3" />
                500
              </span>
              <span>Something went wrong</span>
            </div>

            <div className="flex items-center justify-center rounded-full bg-[#FCE4D9] h-14 w-14 text-[#C05034]">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h1
              className="text-2xl md:text-3xl leading-tight text-[#16150F]"
              style={{ fontFamily: "var(--font-playfair-display)" }}
            >
              Our ribbons got a little tangled
            </h1>

            <p className="text-xs md:text-sm text-[#85753C] max-w-xl">
              An unexpected error occurred while loading this page. Your
              registries and gifts are safe, but you may need to refresh or head
              back to a stable part of the app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center mt-2">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs md:text-sm bg-[#A5914B] text-white hover:bg-[#8C7A3E] transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                Try again
              </button>

              {dashboardPath && (
                <Link
                  href={dashboardPath}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs md:text-sm bg-[#FFF6DD] text-[#85753C] hover:bg-[#F5EACC] border border-[#E3D7A4] transition-colors"
                >
                  Go to your dashboard
                </Link>
              )}

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs md:text-sm bg-[#FFF6DD] text-[#85753C] hover:bg-[#F5EACC] border border-[#E3D7A4] transition-colors"
              >
                <Home className="h-4 w-4" />
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
