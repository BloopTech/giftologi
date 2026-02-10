import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import PublicNavbar from "../components/PublicNavbar";

export default function ShopLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <NuqsAdapter>
        <PublicNavbar />
        {children}
      </NuqsAdapter>
    </Suspense>
  );
}
