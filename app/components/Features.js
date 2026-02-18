"use client";
import React from "react";
import Image from "next/image";

export default function Features() {
    return (
        <section id="features" className="pt-32 pb-16 px-6 sm:px-12 lg:px-24 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid lg:grid-cols-2 gap-24 items-center w-full">
                    {/* Image Side - Photography: Human Subjects */}
                    <div className="relative order-2 lg:order-1 w-full">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#B0D1D9]/5 rounded-full blur-3xl -z-10"></div>

                        <div className="w-full relative aspect-[4/3] rounded-[4rem] overflow-hidden shadow-2xl transform -rotate-3 group hover:rotate-0 transition-transform duration-700">
                            <Image
                                src="/feature-lifestyle.png"
                                alt="Happy Moments with Giftologi"
                                className="object-cover transform scale-110 group-hover:scale-100 transition-transform duration-700"
                                priority
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                fill
                            />
                            {/* Accent Block Over Image */}
                            <div className="absolute bottom-12 right-0 bg-[#FDD17D] w-32 h-32 rounded-l-full opacity-80 mix-blend-multiply"></div>
                        </div>

                        {/* Floating Text Detail */}
                        <div className="absolute top-12 -right-8 bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-50 max-w-[200px] transform rotate-3">
                            <span className="block text-2xl font-didot-bold font-bold text-gray-900 mb-2">98%</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Client Satisfaction Rate</span>
                        </div>
                    </div>

                    {/* Text Side */}
                    <div className="space-y-16 order-1 lg:order-2">
                        <div className="space-y-6">
                            <h4 className="text-[13px] font-bold tracking-[0.2em] text-[#FF6581] uppercase">Core Principles</h4>
                            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                                Designed for <br />
                                <span className="editorial-underline">Every Story.</span>
                            </h2>
                        </div>

                        <div className="space-y-12">
                            {[
                                {
                                    title: "Personalized Lists",
                                    desc: "Craft a registry that reflects your unique style and needs, from essentials to experiences."
                                },
                                {
                                    title: "Infinite Choice",
                                    desc: "Add items from any store worldwide. One simple, elegant list for all your desires."
                                },
                                {
                                    title: "Elegant Sharing",
                                    desc: "Beautifully designed sharing pages that make it easy for friends and family to choose the perfect gift."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="group cursor-default">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#FF6581] transition-colors duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-500 font-light leading-relaxed max-w-sm">
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
