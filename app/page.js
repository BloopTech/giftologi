import { Gift } from "lucide-react";
import Image from "next/image";
import { EmailSignup } from "./email";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white text-black flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold flex flex-col md:flex-row items-baseline font-cormorant-garamond space-x-2">
          <span>COMING</span>
          <span className="flex items-baseline">
            <span>SOON</span>
            <Gift className="size-4 animate-pulse" />
            <Gift className="size-4 animate-pulse" />
            <Gift className="size-4 animate-pulse" />
          </span>
        </h1>
        {/* Add social media icons */}
        {/* <div className="flex gap-4">
          <Link
            href="https://www.instagram.com/giftologi/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-instagram-icon lucide-instagram"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </Link>
          <Link
            href="https://www.tiktok.com/@giftologi"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-2.99.37-.83.6-1.31 1.6-1.36 2.62-.06 1.1.32 2.19 1.03 2.98 1.01 1.14 2.8 1.43 4.16.81.68-.32 1.22-.88 1.5-1.58.11-.28.19-.58.2-.88.03-.98.01-1.96.01-2.94.01-4.51.01-9.02.01-13.54v-.01z" />
            </svg>
          </Link>
        </div> */}
      </main>
      <EmailSignup />
    </div>
  );
}
