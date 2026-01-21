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

export default function RootLayout({ children }) {
  return (
    <>
      <div
        className={`w-full font-poppins bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
      >
        <DashboardProvider>
          <TooltipProvider>
            <div className="mx-auto w-full">
              <AdminSidebar />
              <main className="lg:pl-72 flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
                <div className="flex flex-col min-h-screen ">
                  <div className="lg:mx-10 mx-5">
                    <Header />
                  </div>

                  <main className="flex-grow mt-[7rem] lg:px-10 px-5">
                    <Suspense fallback={null}>
                      <NuqsAdapter>{children}</NuqsAdapter>
                    </Suspense>
                  </main>
                </div>
              </main>
            </div>
          </TooltipProvider>
        </DashboardProvider>
      </div>
    </>
  );
}
