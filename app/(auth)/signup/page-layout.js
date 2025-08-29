"use client";
import React, { useActionState, useEffect } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { signup } from "./authenticate";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Logo from "../../../public/logo-gold.png";

const signUpInitialState = {
  message: "",
  errors: {
    firstname: [],
    lastname: [],
    email: [],
    password: [],
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
      <div className="flex w-full items-center justify-center flex-col space-y-16 py-[2rem] bg-white min-h-screen">
        <div className="px-5 lg:px-[2rem] w-full flex max-w-auto max-w-md items-center justify-center flex-col space-y-12 py-[2rem] bg-[#fffcef] rounded-2xl">
          <div className="flex space-x-2 items-center justify-start w-full">
            <Link href="/">
              {" "}
              <Image src={Logo} alt="Logo" width={50} height={50} />
            </Link>
            <p className="text-[#BBA96C] font-medium text-xl">Create an Account</p>
          </div>
          <div className="w-full">
            <FormInput
              state={state}
              formAction={formAction}
              isPending={isPending}
            />
          </div>
        </div>
      </div>
    </>
  );
}
