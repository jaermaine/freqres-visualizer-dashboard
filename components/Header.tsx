"use client";

import React from "react";
import { TUNING_TARGETS } from "@/lib/targets";

interface HeaderProps {
  selectedTarget: string;
  onSelectTarget: (id: string) => void;
  isCompensated: boolean;
  onToggleCompensated: () => void;
  isInteractiveGraph: boolean;
  onToggleInteractiveGraph: () => void;
  onOpenSidebar: () => void;
  traceCount: number;
}

export function Header({
  selectedTarget,
  onSelectTarget,
  isCompensated,
  onToggleCompensated,
  isInteractiveGraph,
  onToggleInteractiveGraph,
  onOpenSidebar,
  traceCount,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 flex items-center justify-between gap-4 shrink-0 shadow-sm select-none z-30">
      {/* Brand & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-[var(--text-muted)] hover:text-white p-1"
          aria-label="Open sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-base">
            〰
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
                FreqRes
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Studio
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:inline">
              Frequency Response Comparator
            </span>
          </div>
        </div>
      </div>

      {/* Middle Controls (Target Curve & Compensation Pill) */}
      <div className="flex items-center gap-2 bg-[var(--bg-base)] p-1 rounded-lg border border-[var(--border)]">
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
            Target:
          </span>
          <select
            value={selectedTarget}
            onChange={(e) => onSelectTarget(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer py-1"
          >
            <option value="none" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              Raw (None)
            </option>
            {TUNING_TARGETS.map((t) => (
              <option key={t.id} value={t.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {selectedTarget !== "none" && (
          <button
            onClick={onToggleCompensated}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              isCompensated
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]"
            }`}
            title="Toggle target-compensated delta view"
          >
            {isCompensated ? "Δ Compensated" : "Raw Graph"}
          </button>
        )}

        <button
          onClick={onToggleInteractiveGraph}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all hidden sm:inline-block ${
            isInteractiveGraph
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              : "text-[var(--text-muted)] hover:text-white"
          }`}
          title="Toggle interactive acoustic band overlay on click"
        >
          Interactive Bands
        </button>
      </div>

      {/* Right Controls (Trace count indicator) */}
      <div className="flex items-center gap-2">
        {traceCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-raised)] rounded-md border border-[var(--border)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {traceCount} {traceCount === 1 ? "Trace" : "Traces"}
          </span>
        )}
      </div>
    </header>
  );
}
