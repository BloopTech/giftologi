"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/Dialog";
import { PiShareBold } from "react-icons/pi";
import { Send, QrCode, Download } from "lucide-react";
import {
  FacebookShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  FacebookIcon,
  WhatsappIcon,
  LinkedinIcon,
  XIcon,
} from "react-share";

export default function ShareRegistryDialog(props) {
  const { event, registryCode } = props;
  const [url, setUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Registry Link");
  const [showQr, setShowQr] = useState(false);
  const qrCanvasRef = useRef(null);

  const registryTitle = event?.name
    ? `Check out ${event.name}'s gift registry!`
    : "Check out my gift registry!";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      if (registryCode) {
        setUrl(`${baseUrl}/find-registry/${registryCode}`);
      } else {
        setUrl(`${baseUrl}/find-registry`);
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
    const subject = encodeURIComponent(registryTitle);
    const body = encodeURIComponent(
      `I've created a gift registry. You can view it here: ${url}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareQr = () => {
    setShowQr((prev) => !prev);
  };

  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
        url,
      )}`
    : "";

  const handleDownloadQr = useCallback(async () => {
    if (!qrSrc) return;
    try {
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `registry-qr-${registryCode || "code"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open in new tab
      window.open(qrSrc, "_blank");
    }
  }, [qrSrc, registryCode]);

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
          {/* URL input with copy button */}
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

          {/* Share buttons: Email + QR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              onClick={handleShareQr}
              className="flex flex-col items-center justify-center space-y-4 border border-primary rounded-2xl py-4 bg-white hover:shadow-sm cursor-pointer"
            >
              <QrCode className="size-12 text-[#9B9B9B]" />
              <p className="text-xs text-[#394B71] font-semibold">
                {showQr ? "Hide QR" : "QR Code"}
              </p>
            </button>
          </div>

          {/* Social share buttons */}
          {url && (
            <div>
              <p className="text-xs font-semibold text-[#394B71] mb-3">
                Share on Social
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <FacebookShareButton url={url} hashtag="#giftregistry">
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
                <WhatsappShareButton url={url} title={registryTitle}>
                  <WhatsappIcon size={40} round />
                </WhatsappShareButton>
                <LinkedinShareButton
                  url={url}
                  title={registryTitle}
                  summary={`View and contribute to this gift registry: ${url}`}
                >
                  <LinkedinIcon size={40} round />
                </LinkedinShareButton>
                <TwitterShareButton
                  url={url}
                  title={registryTitle}
                  hashtags={["giftregistry"]}
                >
                  <XIcon size={40} round />
                </TwitterShareButton>
              </div>
            </div>
          )}

          {/* QR Code section with download */}
          {showQr && qrSrc ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#DCDCDE] bg-[#FAFAFA] p-4">
              <img
                ref={qrCanvasRef}
                src={qrSrc}
                alt="Registry QR code"
                className="h-40 w-40"
                crossOrigin="anonymous"
              />
              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-2 text-xs text-white cursor-pointer bg-primary border border-primary hover:bg-white hover:text-primary rounded-full px-4 py-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download QR Code
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
