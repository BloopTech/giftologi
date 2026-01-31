import React from "react";
import { notFound } from "next/navigation";
import PublicRegistryContent from "./content";
import { GuestRegistryCodeProvider } from "./context";

export default async function PublicRegistry({ params }) {
  const { registry_code } = await params;

  if (!registry_code) {
    return notFound();
  }

  return (
    <GuestRegistryCodeProvider
      registryCode={registry_code}
      initialRegistry={null}
      initialEvent={null}
      initialHost={null}
      initialProducts={[]}
      initialShippingAddress={null}
      initialCategories={[]}
    >
      <PublicRegistryContent />
    </GuestRegistryCodeProvider>
  );
}
