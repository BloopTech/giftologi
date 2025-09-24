"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";
import { PiFileImageLight, PiGiftDuotone, PiShareBold } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../../components/footer";
import Advertisement from "../../../components/advertisement";
import CarouselHero from "../components/CarouselHero";
import wedding from "../../../../public/host/wedding.png";
import birthday from "../../../../public/host/birthday.png";
import babyshower from "../../../../public/host/babyshower.png";
import fundraiser from "../../../../public/host/fundraiser.png";
import giftbox from "../../../../public/host/lists-gift-box.png";
import Samantha from "../../../../public/host/Samantha.png";
import { Plus } from "lucide-react";

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

        <div className="w-full flex flex-col space-y-8">
          <div className="w-full flex flex-col space-y-4">
            <h1 className="text-[#85753C] font-semibold text-lg">Your Lists</h1>
            <p className="text-[#85753C] text-sm">
              Here&apos;s where all your gift registries live.
              <br /> Create new ones, update details, or share them with ease.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-8 items-center">
            <div className="flex flex-col rounded-2xl border border-[#DCDCDE] overflow-hidden w-[230px]">
              <div className="bg-[#FFFCF3] p-4 w-full flex items-center justify-center relative h-[200px]">
                <div className="w-full h-full">
                  <Image
                    src={giftbox}
                    alt="gift box"
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-[#A2845E] bg-[#FFFFFF] p-4 w-full h-[70px] line-clamp-2">
                Kwame & Fey&apos;s Baby Shower
              </p>
            </div>

            <div className="flex flex-col rounded-2xl border border-[#DCDCDE] overflow-hidden w-[230px]">
              <div className="bg-[#FFFCF3] w-full relative h-[200px]">
                <div className="w-full h-full">
                  <Image
                    src={Samantha}
                    alt="Samantha"
                    fill
                    priority
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <p className="text-sm text-[#A2845E] bg-[#FFFFFF] p-4 w-full h-[70px] line-clamp-2">
                Samantha&apos;s Birthday
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button className="cursor-pointer flex flex-col space-y-4 items-center rounded-full bg-white px-4 py-6 border border-[#DAC67E] text-[#A5914B]">
                <Plus className="size-8" />
                <span className="w-full flex items-center justify-center relative h-[100px] -my-[1rem]">
                  <span className="w-full h-full">
                    <Image
                      src={giftbox}
                      alt="gift box"
                      fill
                      priority
                      className="object-contain"
                    />
                  </span>
                </span>
              </button>
              <button className="text-[#A2845E] cursor-pointer text-xs/tight flex items-center justify-center">
                Add to Registry
              </button>
            </div>
          </div>
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}
