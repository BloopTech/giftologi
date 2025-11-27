"use server";
import React from "react";
import { ViewTransactionsProvider } from "./context";
import ViewTransactionsContent from "./content";

export default async function Transactions() {
  return (
    <>
      <ViewTransactionsProvider>
        <ViewTransactionsContent />
      </ViewTransactionsProvider>
    </>
  );
}
