"use server";
import React from "react";
import { PayoutsProvider } from "./context";
import PayoutsContent from "./content";

export default async function Payouts() {
  return (
    <>
      <PayoutsProvider>
        <PayoutsContent />
      </PayoutsProvider>
    </>
  );
}
