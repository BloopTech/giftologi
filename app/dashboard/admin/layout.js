import {
  Geist,
  Geist_Mono,
  Poppins,
  Playfair_Display,
  Cormorant_Garamond,
  Bodoni_Moda,
} from "next/font/google";
import "../../globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Header from "./components/ui/navigation/header";
import AdminSidebar from "./components/ui/navigation";
import { DashboardProvider } from "./context";

export default function RootLayout({ children }) {
  return (
    <>
      <div
        className={`w-full font-poppins bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
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
          <div className="mx-auto w-full">
              <AdminSidebar />
              <main className="lg:pl-72 flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
                <div className="flex flex-col min-h-screen ">
                  <div className="lg:mx-10 mx-5">
                    <Header />
                  </div>

                  <main className="flex-grow lg:mt-[7rem] mt-[2rem] lg:px-10">
                    <NuqsAdapter>{children}</NuqsAdapter>
                  </main>
                </div>
              </main>
            </div>
        </DashboardProvider>
      </div>
    </>
  );
}
