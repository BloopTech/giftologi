"use client";
import { useState } from "react";
import { Send, Share2, QrCode, Check, Copy } from "lucide-react";
import { toast } from "sonner";

function ShareOptionCard({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-2xl hover:border-[#A5914B] hover:bg-[#FFFCF3] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[120px]"
    >
      <Icon className="w-10 h-10 text-[#A5914B] mb-3" strokeWidth={1.5} />
      <span className="text-sm text-gray-700 font-medium text-center">{label}</span>
    </button>
  );
}

export default function ShareStep({
  formData,
  updateFormData,
  errors = {},
  disabled = false,
  registryCode = "",
}) {
  const [copied, setCopied] = useState(false);
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://mygiftologi.com";
  const registryLink = registryCode
    ? `${baseUrl}/find-registry/${registryCode}`
    : `${baseUrl}/find-registry`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registryLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Check out my gift registry!");
    const body = encodeURIComponent(
      `I've created a gift registry. You can view it here: ${registryLink}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareSocial = () => {
    if (navigator.share) {
      navigator.share({
        title: "My Gift Registry",
        text: "Check out my gift registry!",
        url: registryLink,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleShareQR = () => {
    toast.info("QR Code feature coming soon!");
  };

  return (
    <div className="space-y-6">
      {/* Registry Link with Copy Button */}
      <div className="flex items-center gap-3">
        <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 truncate">
          {registryLink}
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          disabled={disabled}
          className="px-5 py-3 bg-[#A5914B] text-white text-sm font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Registry Link
            </>
          )}
        </button>
      </div>

      {/* Share Options Grid */}
      <div className="grid grid-cols-3 gap-4">
        <ShareOptionCard
          icon={Send}
          label="Share via e-mail"
          onClick={handleShareEmail}
          disabled={disabled}
        />
        <ShareOptionCard
          icon={Share2}
          label="Share on Social"
          onClick={handleShareSocial}
          disabled={disabled}
        />
        <ShareOptionCard
          icon={QrCode}
          label="Share QR Code"
          onClick={handleShareQR}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
