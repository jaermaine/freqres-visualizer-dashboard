"use client";

import { useEffect } from "react";

export function Redirector({ id }: { id: string }) {
  useEffect(() => {
    // Client-side redirect so crawlers don't follow it and read the OG tags instead
    window.location.replace(`/?s=${id}`);
  }, [id]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#0e0e11] text-white">
      <div className="animate-pulse flex flex-col items-center">
        <svg className="animate-spin mb-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <p className="text-sm text-gray-400">Loading workspace...</p>
      </div>
    </div>
  );
}
