"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function RegistryTypesV3() {
  const collections = [
    {
      title: "Wedding",
      subtitle: "Timeless pieces for your new life.",
      image: "/registry-wedding.png",
    },
    {
      title: "Baby",
      subtitle: "Essentials for your newest addition.",
      image: "/registry-baby.png",
    },
    {
      title: "Celebration",
      subtitle: "Milestones deserving of the best.",
      image: "/registry-birthday.png",
    },
  ];

  return (
    <section className="py-32 bg-white border-t border-gray-100 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="block text-[#FF6581] uppercase font-didot-bold text-l mb-4">
            The Catalogue
          </span>
          <h2 className="text-4xl md:text-5xl font-didot-bold font-bold text-gray-900 mb-6">
            Curated Collections
          </h2>
          <p className="max-w-xl mx-auto text-gray-500 font-brasley-medium leading-relaxed">
            Explore our hand-picked selections for every occasion. One platform,
            infinite possibilities.
          </p>
        </div>

        {/* Single Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {collections.map((item, i) => (
            <div
              key={i}
              className="group relative aspect-[3/4] overflow-hidden bg-gray-50 shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              {/* Image */}
              <Image
                src={item.image}
                alt={item.title}
                className="object-cover transition-transform duration-1000 transform group-hover:scale-110"
                priority
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />

              {/* Content - Dark Overlay ONLY at bottom for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>

              {/* Content Positioned at Bottom */}
              <div className="absolute bottom-0 left-0 w-full p-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-3xl font-didot-bold font-bold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-white/90 font-brasley-medium text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  {item.subtitle}
                </p>
                <Link href={`/gift-guides/${item?.title?.toLowerCase()}`} className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[#FDD17D] uppercase tracking-widest text-xs font-bold border-b border-[#FDD17D] pb-1 hover:text-white hover:border-white transition-colors">
                  Explore
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-16">
          <Link href="/gift-guides" className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 border border-gray-900 text-gray-900 font-brasley-medium rounded-full uppercase tracking-widest text-xs hover:bg-gray-900 hover:text-white transition-all duration-300">
            View All Collections
          </Link>
        </div>
      </div>
    </section>
  );
}
