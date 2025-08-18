"use client";
import React, { useActionState, useEffect } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { signup } from "./authenticate";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const signUpInitialState = {
  message: "",
  errors: {
    firstname: [],
    lastname: [],
    othernames: [],
    business_name: [],
    email: [],
    phone: [],
    password: [],
    confirm_password: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

const otpInitialState = {
  message: "",
  errors: {
    otp: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

export default function SignupPageLayout() {
  const [state, formAction, isPending] = useActionState(
    signup,
    signUpInitialState
  );
  const router = useRouter();

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
