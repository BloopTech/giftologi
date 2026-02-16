"use client";
import React, { useEffect, useActionState, useState } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { forgotPassword } from "./authenticate";
import { toast } from "sonner";
import Logo from "../../../public/giftologi-logo.png";
import ForgotPasswordSuccess from "./success";

const initialState = {
  message: "",
  errors: {
    email: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

export default function ForgotPasswordPageLayout() {
  const [state, formAction, isPending] = useActionState(
    forgotPassword,
    initialState
  );
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (
      state?.message &&
      Object.keys(state?.errors || {}).length > 0 &&
      Object.keys(state?.errors?.credentials || {}).length > 0
    ) {
      toast.error(state?.message);
    }

    if (state?.message && Object.keys(state?.data || {}).length > 0) {
      toast.success(state?.message);
      setPasswordSuccess(true);
    }
  }, [state?.message, state?.errors, state?.data]);

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to main content
      </Link>

      <main
        id="main-content"
        role="main"
        aria-label="Forgot password page"
        className="flex w-full items-center justify-center flex-col space-y-16 py-8 bg-[#16150FB2] min-h-screen px-4 sm:px-6"
        style={{
          backgroundImage: "url('/auth_layer.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="w-full max-w-md flex flex-col space-y-12 py-8 px-5 sm:px-8 bg-[#fffcef] rounded-2xl shadow-xl">
          {!passwordSuccess ? (
            <>
              <header className="flex items-center gap-3 w-full">
                <Link
                  href="/"
                  aria-label="Go to homepage"
                  className="focus:outline-none focus:ring-2 focus:ring-[#A5914B] focus:ring-offset-2 rounded"
                >
                  <Image
                    src={Logo}
                    alt="Giftologi"
                    width={50}
                    height={50}
                    priority
                    className="w-10 h-10 sm:w-12 sm:h-12"
                  />
                </Link>
                <h1 className="text-[#A5914B] font-medium text-xl sm:text-2xl">
                  Forgot Password
                </h1>
              </header>
              <div className="w-full">
                <FormInput
                  state={state}
                  formAction={formAction}
                  isPending={isPending}
                />
              </div>
            </>
          ) : (
            <ForgotPasswordSuccess />
          )}
        </div>
      </main>
    </>
  );
}
