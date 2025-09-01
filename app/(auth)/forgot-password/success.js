"use client";
import React from "react";
import Image from "next/image";
import Logo from "../../../public/logo-gold.png";
import Link from "next/link";

export default function ForgotPasswordSuccess() {
  return (
    <div className="flex flex-col space-y-8 w-full items-center justify-center">
      <div>
        <Image src={Logo} alt="Logo" width={80} height={80} />
      </div>

      <div className="flex flex-col items-center justify-center w-full space-y-2">
        <p className="text-[#85753C] font-semibold text-xl">
          Password Reset Sent!
        </p>
        <p className="text-sm text-[#85753C] text-center">
          An email with instructions will be sent to the email address that is
          currently associated with your account. Press the Reset Password
          button in the email.
        </p>
        <p className="text-sm text-[#85753C] text-center">
          If, after a few minutes, the email doesn&apos;t seem to arrive, please
          be sure to check your junk/spam folders.
        </p>
      </div>
      <div className="w-full flex items-center justify-center">
        <Link
          href="/login"
          className="bg-[#BBA96C] hover:bg-white hover:text-[#BBA96C] text-sm border border-[#A5914B] text-white rounded-4xl px-4 py-2 w-full flex items-center justify-center cursor-pointer"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
