"use server";
import React from "react";
import PasswordResetPageLayout from "./page-layout";
import { notFound } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";

export default async function PasswordReset() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Only render reset page if arriving from a valid recovery link (session is set)
  if (!user) {
    return notFound();
  }

  const email = user?.email || "";

  return (
    <>
      <PasswordResetPageLayout email={email} />
    </>
  );
}
