import {
  Geist,
  Geist_Mono,
  Poppins,
  Playfair_Display,
  Cormorant_Garamond,
  Bodoni_Moda,
} from "next/font/google";
import "../../globals.css";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Header from "./components/ui/navigation/header";
import AdminSidebar from "./components/ui/navigation";
import { VendorDashboardProvider } from "./context";
import { TooltipProvider } from "@/app/components/Tooltip";
import { SkipLink } from "@/app/components/accessibility";

export default function RootLayout({ children }) {
  return (
    <>
      <div
        className={`w-full font-poppins bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
      >
        <VendorDashboardProvider>
          <TooltipProvider>
            <SkipLink href="#vendor-main-content" />
            <div className="mx-auto w-full">
              <AdminSidebar />
              <div className="lg:pl-72 flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
                <div className="flex flex-col min-h-screen ">
                  <header className="lg:mx-10 mx-5" role="banner">
                    <Header />
                  </header>

                  <main
                    id="vendor-main-content"
                    role="main"
                    tabIndex={-1}
                    aria-label="Vendor dashboard content"
                    className="grow mt-28 lg:px-10 px-5"
                  >
                    <Suspense fallback={null}>
                      <NuqsAdapter>{children}</NuqsAdapter>
                    </Suspense>
                  </main>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </VendorDashboardProvider>
      </div>
    </>
  );
}
