"use server";
import React from "react";
import { createClient } from "../../../../utils/supabase/server";
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
import HostDashboardRegistryListsContent from "./content";

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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .select("*, events!inner(*)")
    .eq("events.host_id", profile.id);

  return (
    <>
      <HostDashboardRegistryListsContent registry={registry} />
    </>
  );
}
