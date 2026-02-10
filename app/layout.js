import {
  Geist,
  Geist_Mono,
  Poppins,
  Playfair_Display,
  Cormorant_Garamond,
  Bodoni_Moda,
  Inter,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { createMetadata, getPageSeo } from "./utils/seo";
import { SkipLink } from "./components/accessibility";
import { headers } from "next/headers";
import GoogleAnalytics from "./components/googleanalytics";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const pageSeo = await getPageSeo("home");
  return createMetadata(pageSeo);
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const didotBold = localFont({
  src: "../public/fonts/DidotBold.otf",
  variable: "--font-didot-bold",
  weight: "700",
  display: "swap",
});

const brasleySemibold = localFont({
  src: "../public/fonts/BrasleySemiBold.otf",
  variable: "--font-brasley-semibold",
  weight: "600",
  display: "swap",
});

const brasleyMedium = localFont({
  src: "../public/fonts/BrasleyMedium.otf",
  variable: "--font-brasley-medium",
  weight: "500",
  display: "swap",
});

export default async function RootLayout({ children }) {
  const h = await headers();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${inter.variable} ${bodoniModa.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} ${didotBold.variable} ${brasleySemibold.variable} ${brasleyMedium.variable} antialiased`}
      >
        <ThemeProvider attribute="class">
          {process.env.NEXT_PUBLIC_GA_ID && (
            <GoogleAnalytics
              gaId={process.env.NEXT_PUBLIC_GA_ID}
              //nonce={nonce || undefined}
            />
          )}
          <SkipLink href="#main-content" />
          <Toaster
            position="top-center"
            expand={true}
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: "var(--font-brasley-medium)",
              },
            }}
          />

          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            className="w-full font-brasley-medium bg-white text-black dark:bg-gray-950 dark:text-white min-h-screen"
          >
            <NuqsAdapter>{children}</NuqsAdapter>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
