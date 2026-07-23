"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="p-6">
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 id="onboarding-title" className="text-xl font-bold mb-1 text-[var(--text-primary)]">
            Welcome to FreqRes
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-5">
            Plot, compare, and analyze frequency response measurements for headphones and IEMs.
          </p>
          
          <ul className="space-y-3.5 mb-6">
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold text-xs bg-indigo-500/10 border border-indigo-500/20 w-5 h-5 rounded flex items-center justify-center shrink-0">1</span>
              <div>
                <strong className="block text-xs font-semibold text-[var(--text-primary)]">Data Ingestion</strong>
                <span className="text-[11px] text-[var(--text-muted)] leading-tight block">Search Squig.link databases, paste share URLs, or upload raw measurement text files.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold text-xs bg-indigo-500/10 border border-indigo-500/20 w-5 h-5 rounded flex items-center justify-center shrink-0">2</span>
              <div>
                <strong className="block text-xs font-semibold text-[var(--text-primary)]">L/R Channel & Imbalance</strong>
                <span className="text-[11px] text-[var(--text-muted)] leading-tight block">Imports default to clean Average curves. Click "Avg to L/R" on any trace card to evaluate Left/Right channel matching.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold text-xs bg-indigo-500/10 border border-indigo-500/20 w-5 h-5 rounded flex items-center justify-center shrink-0">3</span>
              <div>
                <strong className="block text-xs font-semibold text-[var(--text-primary)]">Targets & A/B Difference</strong>
                <span className="text-[11px] text-[var(--text-muted)] leading-tight block">Overlay Harman, IEF Neutral, or 5128 targets. Compare any 2 visible traces in the dynamic decibel delta table.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold text-xs bg-indigo-500/10 border border-indigo-500/20 w-5 h-5 rounded flex items-center justify-center shrink-0">4</span>
              <div>
                <strong className="block text-xs font-semibold text-[var(--text-primary)]">Export & Share</strong>
                <span className="text-[11px] text-[var(--text-muted)] leading-tight block">Generate high-resolution PNG graph snapshots with reviewer credits or share workspace links in 1 click.</span>
              </div>
            </li>
          </ul>

          <div className="flex gap-2">
            <Link
              href="/tutorial"
              onClick={onClose}
              className="flex-1 text-center py-2 text-xs font-semibold rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Open Full Guide
            </Link>
            <button 
              onClick={onClose}
              className="flex-1 btn-primary py-2 text-xs font-semibold"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
