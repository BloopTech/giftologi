"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";

const DEFAULT_FALLBACK_IMAGE = "/host/giftologi-gift-box.svg";

const VALID_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".avif",
];

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;

  // Check for data URLs
  if (url.startsWith("data:image/")) return true;

  // Allow blob URLs
  if (url.startsWith("blob:")) return true;

  // Allow absolute and root-relative URLs even when extension is omitted
  if (/^(https?:\/\/|\/)/i.test(url)) return true;

  // Check for valid extensions
  const lowerUrl = url.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => lowerUrl.includes(ext));
}

export default function ImageWithFallback({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
  ...props
}) {
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setError(false);
    setImgSrc(src);
  }, [src]);

  const handleError = useCallback(() => {
    setError(true);
    setImgSrc(fallbackSrc);
  }, [fallbackSrc]);

  // Validate initial URL - if invalid, use fallback immediately
  const isValid = isValidImageUrl(src);
  const finalSrc = error || !isValid ? fallbackSrc : imgSrc;

  if (fill) {
    return (
      <Image
        src={finalSrc}
        alt={alt || "Image"}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        onError={handleError}
        {...props}
      />
    );
  }

  return (
    <Image
      src={finalSrc}
      alt={alt || "Image"}
      width={width || 100}
      height={height || 100}
      className={className}
      priority={priority}
      onError={handleError}
      {...props}
    />
  );
}

export { isValidImageUrl, DEFAULT_FALLBACK_IMAGE };
