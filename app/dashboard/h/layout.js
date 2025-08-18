import {
  Geist,
  Geist_Mono,
  Poppins,
  Playfair_Display,
  Cormorant_Garamond,
  Bodoni_Moda,
} from "next/font/google";
import "../../globals.css";


export default function RootLayout({ children }) {
  return (

        
          <main className="w-full font-poppins bg-white text-black dark:bg-gray-950 dark:text-white min-h-screen">
            {children}
          </main>

    
  );
}