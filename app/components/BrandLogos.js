"use client";
import React from "react";

export default function BrandLogos() {
    // Placeholder brand names that will be displayed as styled text logos
    const brands = [
        "Crate & Barrel", "West Elm", "Pottery Barn", "Williams Sonoma",
        "Bloomingdale's", "Neiman Marcus", "Nordstrom", "Target",
        "Amazon", "Macy's", "Bed Bath & Beyond", "CB2"
    ];

    return (
        <section className="py-20 bg-white overflow-hidden border-y border-gray-100">
            <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-24 mb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <h4 className="text-[13px] font-bold tracking-[0.4em] text-[#FF6581] uppercase">Our Partners</h4>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                            World-Class <br />
                            <span className="italic font-light">Collaborations.</span>
                        </h2>
                    </div>
                    <p className="text-sm text-gray-400 font-medium max-w-xs uppercase tracking-widest leading-loose">
                        Integrated with hundreds of premium partner brands.
                    </p>
                </div>
            </div>

            {/* Marquee Container */}
            <div className="relative overflow-hidden">
                <div className="flex animate-scroll">
                    {/* First set of logos */}
                    <div className="flex shrink-0 items-center gap-16 px-8">
                        {brands.map((brand, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-center h-16 px-8 grayscale hover:grayscale-0 transition-all duration-500 opacity-50 hover:opacity-100"
                            >
                                <span className="text-2xl md:text-3xl font-didot-bold text-gray-400 hover:text-gray-900 transition-colors duration-500 whitespace-nowrap">
                                    {brand}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Duplicate set for seamless loop */}
                    <div className="flex shrink-0 items-center gap-16 px-8">
                        {brands.map((brand, index) => (
                            <div
                                key={`dup-${index}`}
                                className="flex items-center justify-center h-16 px-8 grayscale hover:grayscale-0 transition-all duration-500 opacity-50 hover:opacity-100"
                            >
                                <span className="text-2xl md:text-3xl font-didot-bold text-gray-400 hover:text-gray-900 transition-colors duration-500 whitespace-nowrap">
                                    {brand}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                    animation: scroll 25s linear infinite;
                }
                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
}
