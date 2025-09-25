"use client";
import React, { useState } from "react";
import { PiFileImageLight, PiGiftDuotone, PiShareBold } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../../../components/footer";
import Advertisement from "../../../../components/advertisement";
import CarouselHero from "../../components/CarouselHero";
import wedding from "../../../../../public/host/wedding.png";
import birthday from "../../../../../public/host/birthday.png";
import babyshower from "../../../../../public/host/babyshower.png";
import fundraiser from "../../../../../public/host/fundraiser.png";
import giftbox from "../../../../../public/host/lists-gift-box.png";
import Samantha from "../../../../../public/host/Samantha.png";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../components/Dialog";
import CreateRegistryDialog from "../../components/createRegistryDialog";

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

export default function HostDashboardRegistryListsContent(props) {
  const { registry } = props;

  const [createRegistryOpen, setCreateRegistryOpen] = useState(false);

  const openCreateRegistry = () => setCreateRegistryOpen(true);
  const closeCreateRegistry = () => setCreateRegistryOpen(false);

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      <main className="flex flex-col space-y-16 w-full">
        <CarouselHero items={carouselItems} />

        <Dialog open={createRegistryOpen} onOpenChange={setCreateRegistryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Registry</DialogTitle>
            </DialogHeader>
            <CreateRegistryDialog onClose={closeCreateRegistry} />
          </DialogContent>
        </Dialog>

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
            {registry?.length
              ? registry?.map(({ id, title, cover_photo, registry_code }) => {
                  return (
                    <div
                      key={id}
                      className="flex flex-col rounded-2xl border border-[#DCDCDE] overflow-hidden w-[230px]"
                    >
                      <div className="bg-[#FFFCF3] p-4 w-full flex items-center justify-center relative h-[200px] overflow-hidden">
                        <div className="w-full h-full">
                          <Image
                            src={cover_photo ? cover_photo : giftbox}
                            alt="gift box"
                            fill
                            priority
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/h/registry/${registry_code}`}
                          className="cursor-pointer hover:underline"
                        >
                          <p className="text-sm text-[#A2845E] bg-[#FFFFFF] p-4 w-full h-[70px] line-clamp-2">
                            {title}
                          </p>
                        </Link>
                      </div>
                    </div>
                  );
                })
              : null}

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={openCreateRegistry}
                className="cursor-pointer flex flex-col space-y-4 items-center rounded-full bg-white px-4 py-6 border border-[#DAC67E] text-[#A5914B]"
              >
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
              <button
                type="button"
                onClick={openCreateRegistry}
                className="text-[#A2845E] cursor-pointer text-xs/tight flex items-center justify-center"
              >
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
