"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../../components/Dialog";
import { PiShareBold } from "react-icons/pi";
import { Mail, Share2, QrCode, Send, Share, Link } from "lucide-react";

export default function ShareRegistryDialog(props) {
  const { event } = props;
  const [url, setUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Registry Link");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.origin + "/event/" + event?.event_code);
    }
  }, [event]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy Registry Link"), 1500);
    } catch (e) {
      setCopyLabel("Press Ctrl+C");
      setTimeout(() => setCopyLabel("Copy Registry Link"), 2000);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer flex items-center flex-col justify-center space-y-2 border border-[#8DC76C] rounded-md py-4 px-8 bg-[#EBF9E3]">
          <PiShareBold className="size-10 text-[#5CAE2D] font-semibold" />
          <p className="text-xs text-[#5CAE2D]">Share Registry</p>
        </button>
      </DialogTrigger>

      <DialogContent className="p-6 rounded-4xl">
        <DialogHeader>
          <DialogTitle className="text-[#394B71]">Share Registry</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* First section: URL input with copy button */}
          <div>
            <div className="relative">
              <input
                type="text"
                value={url}
                readOnly
                className="w-full font-bold rounded-full border border-[#DCDCDE] bg-white dark:bg-[#0B1222] text-sm text-[#394B71] dark:text-gray-100 px-3 py-3 pr-40"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs whitespace-nowrap text-white cursor-pointer bg-[#BBA96C] border border-[#BBA96C] hover:bg-white hover:text-[#BBA96C] rounded-full px-3 py-2"
              >
                {copyLabel}
              </button>
            </div>
          </div>

          {/* Second section: three share boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center space-y-4 border border-[#BBA96C] rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer">
              <Send className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                Share via e-mail
              </p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4 border border-[#BBA96C] rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer">
              <Link className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                Share on Social
              </p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4 border border-[#BBA96C] rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer">
              <QrCode className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                Share on QR
              </p>
            </div>
          </div>
        </div>

        {/* <div className="mt-6 flex justify-end">
          <DialogClose asChild>
            <button className="text-xs text-white cursor-pointer bg-[#5CAE2D] border border-[#5CAE2D] hover:bg-white hover:text-[#5CAE2D] rounded-md px-4 py-2">
              Done
            </button>
          </DialogClose>
        </div> */}
      </DialogContent>
    </Dialog>
  );
}
