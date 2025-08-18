"use client";
import React, { useActionState, useEffect } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { login } from "./authenticate";
import { toast } from "sonner";
import { redirect } from "next/navigation";

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
      // if (state?.data?.requiresOTP) {
      //   toast.success(state?.message);
      // } else {
      //   toast.success(state?.message);
      //   redirect("/dashboard");
      // }
      toast.success(state?.message);
    }
  }, [state?.message, state?.errors, state.data, state?.status_code]);

  return (
    <>
      <div className="flex w-full items-center justify-center flex-col space-y-16 py-[2rem]">
        <div className="flex">
          <Link href="/">
            <p className="text-2xl font-bold">Giftologi</p>
          </Link>
        </div>
        <div className="w-full md:max-w-xl">
          <FormInput
            state={state}
            formAction={formAction}
            isPending={isPending}
          />
        </div>
      </div>
    </>
  );
}
