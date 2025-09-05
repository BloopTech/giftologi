"use client";
import React, { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import FormInput from "./form-input";
import Link from "next/link";
import { resetPassword } from "./authenticate";
import { toast } from "sonner";
import { redirect } from "next/navigation";
import Logo from "../../../../public/giftologi-logo.png";
import ResetPasswordSuccess from "./success";

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
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
      setPasswordSuccess(true);
    }
  }, [state?.message, state?.errors, state?.status_code]);

  return (
    <>
      <div
        className="flex w-full items-center justify-center flex-col space-y-16 py-[2rem] bg-[#16150FB2] min-h-screen"
        style={{
          backgroundImage: "url('/auth_layer.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="px-5 lg:px-[2rem] w-full flex max-w-auto max-w-md items-center justify-center flex-col space-y-12 py-[2rem] bg-[#fffcef] rounded-2xl">
          {passwordSuccess ? (
            <ResetPasswordSuccess />
          ) : (
            <>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col space-y-1">
                  <h3 className="text-primary font-bold text-xl">
                    Reset Password
                  </h3>
                  <p className="text-sm text-primary">Reset your password</p>
                </div>
                <Link href="/">
                  {" "}
                  <Image
                    src={Logo}
                    alt="Logo"
                    width={50}
                    height={50}
                    priority
                  />
                </Link>
              </div>
              <div className="w-full">
                <FormInput
                  state={state}
                  formAction={formAction}
                  isPending={isPending}
                  email={email}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
