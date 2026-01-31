"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/Dialog";
import { PiShareBold } from "react-icons/pi";
import { Send, Share2, QrCode } from "lucide-react";

export default function ShareRegistryDialog(props) {
  const { event, registryCode } = props;
  const [url, setUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Registry Link");
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      if (registryCode) {
        setUrl(`${baseUrl}/registry/${registryCode}`);
      } else {
        setUrl(`${baseUrl}/registry`);
      }
    }
  }, [registryCode]);

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

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Check out my gift registry!");
    const body = encodeURIComponent(
      `I've created a gift registry. You can view it here: ${url}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareSocial = () => {
    if (navigator.share) {
      navigator.share({
        title: "My Gift Registry",
        text: "Check out my gift registry!",
        url,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const handleShareQr = () => {
    setShowQr((prev) => !prev);
  };

  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        url
      )}`
    : "";

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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs whitespace-nowrap text-white cursor-pointer bg-primary border border-primary hover:bg-white hover:text-primary rounded-full px-3 py-2"
              >
                {copyLabel}
              </button>
            </div>
          </div>

          {/* Second section: three share boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleShareEmail}
              className="flex flex-col items-center justify-center space-y-4 border border-primary rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer"
            >
              <Send className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                Share via e-mail
              </p>
            </button>
            <button
              type="button"
              onClick={handleShareSocial}
              className="flex flex-col items-center justify-center space-y-4 border border-primary rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer"
            >
              <Share2 className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                Share on Social
              </p>
            </button>
            <button
              type="button"
              onClick={handleShareQr}
              className="flex flex-col items-center justify-center space-y-4 border border-primary rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer"
            >
              <QrCode className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                {showQr ? "Hide QR" : "Share on QR"}
              </p>
            </button>
          </div>

          {showQr && qrSrc ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#DCDCDE] bg-[#FAFAFA] p-4">
              <img
                src={qrSrc}
                alt="Registry QR code"
                className="h-40 w-40"
              />
              <a
                href={qrSrc}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white cursor-pointer bg-primary border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-2"
              >
                Open QR Code
              </a>
            </div>
          ) : null}
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
