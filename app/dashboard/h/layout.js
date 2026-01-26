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
import HostSidebar from "./components/ui/navigation";
import Header from "./components/ui/navigation/header";
import { SkipLink } from "@/app/components/accessibility";

export default function RootLayout({ children }) {
  return (
    <>
      <div
        className={`font-poppins bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
      >
        <SkipLink href="#host-main-content" />
        <div className="w-full flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
          <div className="flex flex-col min-h-screen w-full">
            <header className="lg:mx-10 mx-5" role="banner">
              <Header />
            </header>

            <main
              id="host-main-content"
              role="main"
              tabIndex={-1}
              aria-label="Host dashboard content"
              className="grow lg:mt-20 mt-8 w-full"
            >
              <NuqsAdapter>{children}</NuqsAdapter>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
