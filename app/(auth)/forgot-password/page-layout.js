"use client";
import React, { useEffect, useActionState } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { forgotPassword } from "./authenticate";
import { toast } from "sonner";


const initialState = {
  message: "",
  errors: {
    business_email: [],
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
    }
  }, [state?.message, state?.errors, state?.data]);

  return (
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
  );
}
