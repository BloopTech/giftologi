"use client";
import React, { useState } from "react";
import { PiFileImageLight, PiGiftDuotone, PiShareBold } from "react-icons/pi";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import Footer from "../../components/footer";
import Advertisement from "../../components/advertisement";
import CarouselHero from "./components/CarouselHero";
import wedding from "../../../public/host/wedding.png";
import birthday from "../../../public/host/birthday.png";
import babyshower from "../../../public/host/babyshower.png";
import fundraiser from "../../../public/host/fundraiser.png";
import giftbox from "../../../public/host/lists-gift-box.png";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../../components/Dialog";
import VisuallyHidden from "../../components/accessibility/VisuallyHidden";
import CreateRegistryDialog from "./components/createRegistryDialog";
import RegistryType from "./components/registryType";


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

export default function HostDashboardContent(props) {
  const { registry } = props;
  const [createRegistryOpen, setCreateRegistryOpen] = useState(false);

  const openCreateRegistry = () => setCreateRegistryOpen(true);
  const closeCreateRegistry = () => setCreateRegistryOpen(false);

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-6xl w-full font-brasley-medium min-h-screen">
      <main id="host-dashboard-content" role="main" aria-label="Host dashboard" className="flex flex-col space-y-16 w-full">
        <CarouselHero
          items={carouselItems}
          openCreateRegistry={openCreateRegistry}
        />

        <Dialog open={createRegistryOpen} onOpenChange={setCreateRegistryOpen}>
          <DialogContent className="max-w-2xl">
            <VisuallyHidden>
              <DialogTitle>Create New Registry</DialogTitle>
            </VisuallyHidden>
            <CreateRegistryDialog onClose={closeCreateRegistry} />
          </DialogContent>
        </Dialog>

        <RegistryType openCreateRegistry={openCreateRegistry} />

        <div className="w-full flex flex-col space-y-8">
          <div className="w-full flex flex-col space-y-4">
            <h1 className="text-[#85753C] font-semibold text-lg">Your Lists</h1>
            <p className="text-[#85753C] text-sm">
              Here&apos;s where all your gift registries live.
              <br /> Create new ones, update details, or share them with ease.
            </p>
          </div>

          {registry?.length ? (
            <div className="flex w-full flex-wrap gap-8 items-center">
              {registry?.map(({ id, cover_photo, title, registry_code }) => {
                return (
                  <div
                    key={id}
                    className="flex flex-col rounded-2xl border border-[#DCDCDE] overflow-hidden w-[230px]"
                  >
                    <div className="bg-[#FFFCF3] p-4 w-full flex items-center justify-center relative h-[200px] overflow-hidden">
                      <div className="w-full h-full">
                        <ImageWithFallback
                          src={cover_photo}
                          alt="gift box"
                          fill
                          priority
                          sizes="230px"
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
              })}
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={openCreateRegistry}
                  className="cursor-pointer flex flex-col space-y-4 items-center rounded-full bg-white px-4 py-6 border border-[#DAC67E] text-[#A5914B]"
                >
                  <Plus className="size-8" />
                  <span className="w-full flex items-center justify-center relative h-[100px] -my-[1rem]">
                    <span className="w-full h-full">
                      <ImageWithFallback
                        src={giftbox}
                        alt="gift box"
                        fill
                        priority
                        sizes="100px"
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
          ) : (
            <div className="flex items-center justify-center mx-auto max-w-md w-full rounded-4xl border border-[#A9C4FC] px-4 py-8 bg-white flex-col space-y-4">
              <div className="inline-block">
                <ImageWithFallback
                  src="/host/giftologi-gift-box.svg"
                  alt="open gift"
                  width={100}
                  height={100}
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[#394B71] font-semibold text-center text-sm">
                Ready to make your first registry? <br /> Click below to create
                and share.
              </p>
              <button
                type="button"
                onClick={openCreateRegistry}
                className="text-white cursor-pointer text-xs/tight bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-2xl px-4 py-2 flex items-center"
              >
                Create Registry
              </button>
            </div>
          )}
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}
