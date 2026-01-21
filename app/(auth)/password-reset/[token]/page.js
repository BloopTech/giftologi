"use server";
import React from "react";
import PasswordResetPageLayout from "./page-layout";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/server";

export default async function PasswordReset() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Only render reset page if arriving from a valid recovery link (session is set)
  if (!user) {
    return (
      <div
        className="flex w-full items-center justify-center flex-col space-y-16 py-[2rem] bg-[#16150FB2] min-h-screen"
        style={{
          backgroundImage: "url('/auth_layer.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="px-5 lg:px-[2rem] w-full flex max-w-auto max-w-md items-center justify-center flex-col space-y-6 py-[2rem] bg-[#fffcef] rounded-2xl text-center">
          <div className="space-y-2">
            <h3 className="text-primary font-bold text-xl">
              Reset link expired or invalid
            </h3>
            <p className="text-sm text-primary">
              Please request a new password reset link to continue.
            </p>
          </div>
          <div className="flex flex-col w-full gap-3">
            <Link
              href="/forgot-password"
              className="w-full rounded-full bg-primary text-white text-sm font-semibold py-2"
            >
              Request new reset link
            </Link>
            <Link href="/login" className="text-sm text-primary underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const email = user?.email || "";

  return (
    <>
      <PasswordResetPageLayout email={email} />
    </>
  );
}
