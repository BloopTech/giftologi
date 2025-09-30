"use client";
import React from "react";
import Image from "next/image";
import wedding from "../../../../public/host/wedding.png";
import birthday from "../../../../public/host/birthday.png";
import babyshower from "../../../../public/host/babyshower.png";
import fundraiser from "../../../../public/host/fundraiser.png";
import giftbox from "../../../../public/host/lists-gift-box.png";

const customStyles = [
  {
    id: 1,
    title: "Wedding",
    image: wedding,
  },
  {
    id: 2,
    title: "Baby Shower",
    image: babyshower,
  },
  {
    id: 3,
    title: "Birthday",
    image: birthday,
  },
  {
    id: 4,
    title: "Fundraiser",
    image: fundraiser,
  },
  {
    id: 5,
    title: "Custom",
    image: giftbox,
  },
];

export default function RegistryType(props) {
  const { openCreateRegistry } = props;
  
  return (
    <div className="flex items-center gap-4 w-full md:flex-wrap lg:flex-nowrap">
      {customStyles.map((style) => (
        <div key={style.id} className="flex flex-col space-y-4">
          <div className="w-[200px] h-[200px] bg-[#E9E9ED] border border-[#DCDCDE] rounded-md relative overflow-hidden">
            <Image
              src={style.image}
              alt="gift box"
              fill
              priority
              className="object-cover"
            />
          </div>
          <button
            className="text-sm text-[#A2845E] cursor-pointer font-semibold"
            onClick={openCreateRegistry}
          >
            {style.title}
          </button>
        </div>
      ))}
    </div>
  );
}
