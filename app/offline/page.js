"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-gray-950">
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-6">
        <WifiOff className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        You&apos;re Offline
      </h1>

      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
        It looks like you&apos;ve lost your internet connection. Check your
        connection and try again.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 mt-12">
        Some pages you&apos;ve visited before may still be available offline.
      </p>
    </div>
  );
}
