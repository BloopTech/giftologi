"use client";
import React, { useActionState, useEffect } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { login } from "./authenticate";
import { toast } from "sonner";
import { redirect } from "next/navigation";
import Logo from "../../../public/giftologi-logo.png";

const loginInitialState = {
  message: "",
  errors: {
    email: [],
    password: [],
    credentials: {},
    unknown: "",
  },
};

export default function LoginPageLayout() {
  const [state, formAction, isPending] = useActionState(
    login,
    loginInitialState
  );

  useEffect(() => {
    if (
      state?.message &&
      Object.keys(state?.errors || {}).length > 0 &&
      Object.keys(state?.errors?.credentials || {}).length > 0
    ) {
      toast.error(state?.message);
    }

    if (state?.message && state?.status_code === 200) {
      toast.success(state?.message);
      redirect("/");
    }
  }, [state?.message, state?.errors, state.data, state?.status_code]);

  return (
    <main
      id="main-content"
      role="main"
      aria-label="Sign in page"
      className="flex w-full items-center justify-center flex-col space-y-16 py-8 bg-[#16150FB2] min-h-screen"
      style={{
        backgroundImage: "url('/auth_layer.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="px-5 lg:px-8 w-full flex max-w-md items-center justify-center flex-col space-y-12 py-8 bg-[#fffcef] rounded-2xl">
        <header className="flex space-x-2 items-center justify-start w-full">
          <Link href="/" aria-label="Go to homepage">
            <Image src={Logo} alt="Giftologi logo" width={50} height={50} priority />
          </Link>
          <h1 className="text-primary font-medium text-xl">Sign in</h1>
        </header>
        <div className="w-full">
          <FormInput
            state={state}
            formAction={formAction}
            isPending={isPending}
          />
        </div>
      </div>
    </main>
  );
}
