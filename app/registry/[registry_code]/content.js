"use client";
import React from "react";
import RegistryPageViewTracker from "../../components/RegistryPageViewTracker";
import Image from "next/image";
import Footer from "../../components/footer";
import Advertisement from "../../components/advertisement";
import { CircleChevronDown } from "lucide-react";

export default function PublicRegistryContent(props) {
  const { registry, event, host, products } = props;
  
  const displayName = host?.firstname
    ? `${host.firstname} ${host?.lastname || ""}`.trim()
    : host?.email || "";
  const coverPhoto = registry?.cover_photo || event?.cover_photo || "";
  const hasProducts = Array.isArray(products) && products.length > 0;

  return (
    <div className="dark:text-white bg-[#FAFAFA] py-8 dark:bg-gray-950 mx-auto max-w-5xl w-full font-poppins min-h-screen">
      <RegistryPageViewTracker registryId={registry?.id} />
      <main className="flex flex-col space-y-16 w-full">
        <div className="w-full bg-[#B1D1FC] border border-[#D4D4D4] rounded-md py-8 px-4 h-[250px] flex items-center justify-center overflow-hidden">
          {coverPhoto ? (
            <Image
              src={coverPhoto}
              alt={registry?.title || "Registry cover"}
              width={960}
              height={320}
              className="h-full w-full object-cover"
              priority
            />
          ) : null}
        </div>

        <div className="w-full rounded-3xl border border-[#DCDCDE] p-4 bg-white flex flex-col space-y-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <h1 className="text-[#394B71] text-2xl font-bold">
                {registry?.title || "Registry"}
              </h1>
              {displayName ? (
                <span className="text-xs text-[#6A7282]">
                  Hosted by {displayName}
                </span>
              ) : null}
            </div>
            <div className="flex justify-end items-center space-x-2">
              <button className="text-[#A5914B] cursor-pointer text-sm/tight px-4 py-2 flex items-center">
                Gift Category{" "}
                <CircleChevronDown className="fill-[#A5914B] text-white size-6 font-bold" />
              </button>
              <button className="text-[#A5914B] cursor-pointer text-sm/tight px-4 py-2 flex items-center">
                Sort By{" "}
                <CircleChevronDown className="fill-[#A5914B] text-white size-6 font-bold" />
              </button>
            </div>
          </div>
          {hasProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((p, index) => {
                const odd = index % 2 === 0;
                const desiredLabel = `Desired ${p.desired ?? 0}`;
                const purchasedLabel = `Purchased ${p.purchased ?? 0}`;

                return (
                  <div
                    key={p.id}
                    className={`flex bg-white rounded-lg flex-col space-y-4 py-4 w-full border ${
                      odd ? " border-[#8DC76C]" : "border-[#F6E9B7]"
                    }`}
                  >
                    <div className="flex items-center justify-center px-4">
                      <Image
                        src={p.image}
                        alt={p.title}
                        width={150}
                        height={150}
                        className="object-contain"
                        priority
                      />
                    </div>
                    <div className="flex flex-col space-y-2 w-full">
                      <p className="text-sm font-semibold text-black line-clamp-2 w-full px-4">
                        {p.title}
                      </p>
                      <div className="flex items-center w-full justify-between px-4">
                        <p className="text-xs text-[#939393]">{desiredLabel}</p>
                        <p className="text-xs text-[#939393]">
                          {purchasedLabel}
                        </p>
                      </div>
                      <div className="flex items-center w-full justify-between">
                        <p className="text-xs text-[#939393] pl-4">{p.price}</p>
                        <div className={odd ? "hidden" : "flex pr-4"}>
                          <button className="text-xs text-white cursor-pointer bg-[#A5914B] border border-[#A5914B] hover:bg-white hover:text-[#A5914B] rounded-xl px-4 py-1 flex items-center">
                            Buy Gift
                          </button>
                        </div>
                        <div className={odd ? "flex" : "hidden"}>
                          <p className="text-xs text-white bg-[#8DC76C] border border-[#8DC76C] rounded-l-xl px-2 py-1 flex items-center">
                            Purchased
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#6A7282]">
              No gifts have been added to this registry yet.
            </div>
          )}
        </div>

        <Advertisement />

        <Footer />
      </main>
    </div>
  );
}
