"use client";

import { useEffect, useState } from "react";

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
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 id="onboarding-title" className="text-xl font-bold mb-2 text-[var(--text-primary)]">
            Welcome to FreqRes
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Get started quickly with these core features:
          </p>
          
          <ul className="space-y-4 mb-8">
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold">1</span>
              <div>
                <strong className="block text-sm text-[var(--text-primary)]">Import Data</strong>
                <span className="text-xs text-[var(--text-muted)]">Paste Squig.link URLs or upload raw measurement text files in the sidebar.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold">2</span>
              <div>
                <strong className="block text-sm text-[var(--text-primary)]">Compare & Align</strong>
                <span className="text-xs text-[var(--text-muted)]">Overlay industry-standard tuning targets (e.g., Harman) and automatically align curves.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-400 font-bold">3</span>
              <div>
                <strong className="block text-sm text-[var(--text-primary)]">Interactive Analysis</strong>
                <span className="text-xs text-[var(--text-muted)]">Toggle Parameter Bands (Sub Bass, Treble, etc.) or click directly on the graph to lock visual frequency guides.</span>
              </div>
            </li>
          </ul>

          <button 
            onClick={onClose}
            className="w-full btn-primary py-2.5 text-sm"
          >
            Got it, let's go!
          </button>
        </div>
      </div>
    </div>
  );
}
