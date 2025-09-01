"use client";
import React from "react";
import Image from "next/image";
import Logo from "../../../public/logo-gold.png";
import Link from "next/link";

export default function ResetPasswordSuccess() {
  return (
    <div className="flex flex-col space-y-8 w-full items-center justify-center">
      <div>
        <Image src={Logo} alt="Logo" width={80} height={80} />
      </div>

      <div className="flex flex-col items-center justify-center w-full space-y-2">
        <p className="text-[#85753C] font-semibold text-xl">
          Passsword Reset Successful!
        </p>
        <p className="text-sm text-[#85753C] text-center">
          Your password has been reset successfully. You can now login with your
          new password.
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
