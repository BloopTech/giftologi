"use server";
import React from "react";
import { createClient } from "../../utils/supabase/server";
import { PiFileImageLight, PiGiftDuotone, PiShareBold } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "./components/footer";
import Advertisement from "./components/advertisement";
import CarouselHero from "./components/CarouselHero";
import wedding from "../../../public/host/wedding.png";
import birthday from "../../../public/host/birthday.png";
import babyshower from "../../../public/host/babyshower.png";
import fundraiser from "../../../public/host/fundraiser.png";


const customStyles = [
  "Wedding",
  "Baby Shower",
  "Birthday",
  "Fundraiser",
  "Custom",
];

const carouselItems = [
  {
    image: wedding,
    title: "Wedding",
  },
  {
    image: babyshower,
    title: "Baby Shower",
  },
  {
    image: birthday,
    title: "Birthday",
  },
  {
    image: fundraiser,
    title: "Fundraiser",
  },
  {
    image: wedding,
    title: "Custom",
  },
];

export default async function HostDashboard() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      <main className="flex flex-col space-y-16 w-full">
        <CarouselHero items={carouselItems} />

        <div className="flex items-center gap-4 w-full md:flex-wrap lg:flex-nowrap">
          {customStyles.map((style) => (
            <div key={style} className="flex flex-col space-y-4">
              <div className="w-[200px] h-[200px] bg-[#E9E9ED] border border-[#DCDCDE] rounded-md" />
              <button className="text-sm text-[#A2845E] cursor-pointer font-semibold">
                {style}
              </button>
            </div>
          ))}
        </div>

        <div className="w-full flex flex-col space-y-4">
          <h1 className="text-[#85753C] font-semibold text-lg">Your Lists</h1>
          <p className="text-[#85753C] text-sm">
            Here&apos;s where all your gift registries live.
            <br /> Create new ones, update details, or share them with ease.
          </p>
        </div>

        <div className="flex items-center justify-center mx-auto max-w-md w-full rounded-4xl border border-[#A9C4FC] px-4 py-8 bg-white flex-col space-y-4">
          <div className="inline-block">
            <Image
              src="/host/giftologi-gift-box.svg"
              alt="open gift"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-[#394B71] font-semibold text-center text-sm">
            Ready to make your first registry? <br /> Click below to create and
            share.
          </p>
          <button className="text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center">
            Create Registry
          </button>
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}
