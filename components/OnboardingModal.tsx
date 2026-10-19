"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { SamplePresetId } from "./FRChart";

interface Props {
  onClose: () => void;
  onLoadSample?: (preset: SamplePresetId) => void;
}

const SHORTCUTS = [
  { key: "1 – 9", action: "Toggle visibility of trace 1 through 9" },
  { key: "Alt + ↑ / ↓", action: "Reorder focused trace up or down in rack" },
  { key: "Ctrl + Z", action: "Undo trace change or removal" },
  { key: "Ctrl + Y", action: "Redo trace change" },
  { key: "Ctrl + S", action: "Generate & copy shareable shortlink" },
  { key: "Scroll Wheel", action: "Zoom frequency axis centered at cursor" },
  { key: "Double-Click", action: "Reset chart zoom to full 20 Hz – 20 kHz" },
  { key: "?", action: "Toggle this Quick-Start & Shortcuts reference" },
];

export function OnboardingModal({ onClose, onLoadSample }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickstart-title"
      >
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[var(--accent-text)] flex items-center justify-center">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
              </svg>
            </div>
            <div>
              <h2 id="quickstart-title" className="text-sm font-semibold text-[var(--text-primary)]">
                Quick-Start & Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Precision controls for frequency response inspection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Keyboard Shortcuts Table */}
          <div>
            <span className="label-xs block mb-2">Keyboard & Mouse Accelerators</span>
            <div className="grid grid-cols-1 gap-1.5">
              {SHORTCUTS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-3 py-1.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs"
                >
                  <span className="text-[var(--text-secondary)]">{item.action}</span>
                  <kbd className="px-2 py-0.5 rounded-xs bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-[11px] shrink-0 ml-3">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Core Capabilities Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <strong className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">
                Avg ⇄ L/R Channel Split
              </strong>
              <span className="text-[11px] text-[var(--text-muted)] leading-snug block">
                Imports default to clean mono Average curves. Click{" "}
                <span className="font-mono text-[var(--accent-text)]">Avg→L/R</span> on any trace
                to inspect Left/Right coupler matching.
              </span>
            </div>
            <div className="p-3 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <strong className="block text-xs font-semibold text-[var(--text-primary)] mb-0.5">
                Target Compensation
              </strong>
              <span className="text-[11px] text-[var(--text-muted)] leading-snug block">
                Select Harman, IEF Neutral, or B&K 5128 in the header and toggle{" "}
                <span className="font-mono text-[var(--accent-text)]">Δ Compensated</span> to
                flatten the target to 0 dB.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Link href="/tutorial" onClick={onClose} className="btn-ghost py-1.5 px-3 text-xs">
                Full Guide & URL Checker
              </Link>
              {onLoadSample && (
                <button
                  type="button"
                  onClick={() => {
                    onLoadSample("ab-comparison");
                    onClose();
                  }}
                  className="btn-ghost py-1.5 px-3 text-xs text-[var(--accent-text)] border-[var(--accent-border)]"
                >
                  Load Sample Curves
                </button>
              )}
            </div>
            <button type="button" onClick={onClose} className="btn-primary py-1.5 px-4 text-xs">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
