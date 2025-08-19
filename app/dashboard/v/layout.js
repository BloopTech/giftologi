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
import VendorSidebar from "./components/ui/navigation";
import Header from "./components/ui/navigation/header";

export default function RootLayout({ children }) {
  return (
    <>
      <div
        className={`font-poppins bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
      >
        <div className="mx-auto w-full">
          <VendorSidebar />
          <main className="lg:pl-72 flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
            <div className="flex flex-col min-h-screen ">
              <div className="lg:mx-10 mx-5">
                <Header />
              </div>

              <main className="flex-grow lg:mt-[5rem] mt-[2rem]">
                <NuqsAdapter>{children}</NuqsAdapter>
              </main>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
