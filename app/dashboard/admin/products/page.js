"use server";
import React from "react";
import ManageProductsContent from "./content";
import { ManageProductsProvider } from "./context";

export default async function Products() {
  return (
    <>
      <ManageProductsProvider>
        <ManageProductsContent />
      </ManageProductsProvider>
    </>
  );
}
