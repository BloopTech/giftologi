import {
  Geist,
  Geist_Mono,
  Poppins,
  Playfair_Display,
  Cormorant_Garamond,
  Bodoni_Moda,
} from "next/font/google";
import "../../../globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Header from "./components/ui/navigation/header";
import AdminSidebar from "./components/ui/navigation";

export default function RootLayout({ children }) {
  return (
    <>
      <div
        className={`w-full font-poppins bg-[#FAFAFA] scroll-auto antialiased selection:bg-primary selection:text-primary dark:bg-gray-950`}
      >
        
          <main className="w-full flex flex-col bg-[#FAFAFA] dark:bg-gray-950">
            <div className="flex flex-col min-h-screen w-full">
              <div className="mx-auto w-full flex flex-col max-w-7xl">
                <Header />
              

              <div className="flex lg:mt-[7rem] mt-[2rem] w-full">
                <AdminSidebar />
                <main className="flex-grow lg:pl-72"><NuqsAdapter>{children}</NuqsAdapter></main>
              </div>
              </div>
            </div>
          </main>
      
      </div>
    </>
  );
}