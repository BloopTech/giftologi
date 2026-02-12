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
import { DashboardProvider } from "./context";
import { TooltipProvider } from "@/app/components/Tooltip";
import { SkipLink } from "@/app/components/accessibility";

export default function RootLayout({ children }) {
  return (
    <>
      <div
        data-admin-layout
        className={`w-full font-brasley-medium bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
      >
        <DashboardProvider>
          {/* <main className="w-full flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
            <div className="mx-auto w-full flex flex-col">
              <div className="flex flex-col min-h-screen w-full">
                <Header />

                <div className="flex w-full mt-[7rem]">
                  <AdminSidebar />
                  <main className="flex-1 px-4 pb-8 lg:pl-72 lg:px-10">
                    <NuqsAdapter>{children}</NuqsAdapter>
                  </main>
                </div>
              </div>
            </div>
          </main> */}
          <TooltipProvider>
            <SkipLink href="#admin-main-content" />
            <div className="mx-auto w-full">
              <AdminSidebar />
              <div className="lg:pl-72 flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
                <div className="flex flex-col min-h-screen ">
                  <header className="lg:mx-10 mx-5" role="banner">
                    <Header />
                  </header>

                  <main
                    id="admin-main-content"
                    role="main"
                    tabIndex={-1}
                    aria-label="Admin dashboard content"
                    className="flex-grow mt-[7rem] lg:px-10 px-5"
                  >
                    <Suspense fallback={null}>
                      <NuqsAdapter>{children}</NuqsAdapter>
                    </Suspense>
                  </main>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </DashboardProvider>
      </div>
    </>
  );
}
