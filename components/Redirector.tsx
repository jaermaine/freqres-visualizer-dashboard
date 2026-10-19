"use client";

import { useEffect } from "react";

export function Redirector({ id }: { id: string }) {
  useEffect(() => {
    // Client-side redirect so crawlers don't follow it and read the OG tags instead
    window.location.replace(`/?s=${id}`);
  }, [id]);

  return (
    <div className="flex items-center justify-center h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="animate-spin text-[var(--accent-text)]"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p className="text-xs font-mono text-[var(--text-secondary)]">
          Loading shared workspace...
        </p>
      </div>
    </div>
  );
}
