"use client";
import React, { useActionState, useEffect } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { resetPassword } from "./authenticate";
import { toast } from "sonner";
import { redirect } from "next/navigation";

const resetPasswordInitialState = {
  message: "",
  errors: {
    password: [],
    confirm_password: [],
    credentials: {},
    unknown: "",
  },
};

export default function PasswordResetPageLayout(props) {
  const { email } = props;
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    resetPasswordInitialState
  );

  useEffect(() => {
    if (
      state?.message &&
      Object.keys(state?.errors || {}).length > 0 &&
      Object.keys(state?.errors?.credentials || {}).length > 0
    ) {
      toast.error(state?.message);
    }

    if (state?.message && state.status_code === 200) {
      toast.success(state?.message);
    }
  }, [state?.message, state?.errors, state?.status_code]);

  return (
    <>
      <div className="flex w-full items-center justify-center flex-col space-y-16 py-[2rem]">
        <div className="flex flex-col items-center text-center">
          <Link href="/">
          <p className="text-2xl font-bold">Giftologi</p>
          </Link>
        </div>
        <div className="w-full md:max-w-xl">
          <FormInput
            state={state}
            formAction={formAction}
            isPending={isPending}
            email={email}
          />
        </div>
      </div>

    </>
  );
}
