import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function ShopLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </Suspense>
  );
}
