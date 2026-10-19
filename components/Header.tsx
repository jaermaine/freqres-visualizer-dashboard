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
  onOpenQuickStart?: () => void;
  traceCount: number;
  visibleTraceCount?: number;
}

export const Header = React.memo(function Header({
  selectedTarget,
  onSelectTarget,
  isCompensated,
  onToggleCompensated,
  isInteractiveGraph,
  onToggleInteractiveGraph,
  onOpenSidebar,
  onOpenQuickStart,
  traceCount,
  visibleTraceCount = traceCount,
}: HeaderProps) {
  return (
    <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 md:px-4 flex items-center justify-between gap-3 shrink-0 select-none z-30">
      {/* Left: Mobile Drawer Trigger + Target & Analysis Mode Controls */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
          aria-label="Open control sidebar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>

        {/* Mobile-only Brand Identity (Sidebar already displays brand on md+) */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 13.5C4.5 13.5 5.5 6 8.2 6C11 6 12.2 18 15 18C17.5 18 18.8 10.5 22 10.5" />
            </svg>
          </div>
          <span className="font-semibold text-xs tracking-tight text-[var(--text-primary)]">
            FreqRes
          </span>
        </div>

        {/* Instrument Control Strip: Target Reference & Compensation */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-base)] p-1 rounded border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 px-2">
            <label
              htmlFor="header-target-select"
              className="label-xs hidden sm:inline cursor-pointer"
            >
              Target
            </label>
            <select
              id="header-target-select"
              value={selectedTarget}
              onChange={(e) => onSelectTarget(e.target.value)}
              className="bg-transparent text-xs font-medium text-[var(--text-primary)] outline-none cursor-pointer py-0.5 pr-1 font-mono"
              aria-label="Reference tuning target"
            >
              <option value="none" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Raw (Uncompensated)
              </option>
              {TUNING_TARGETS.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {selectedTarget !== "none" && (
            <>
              <span className="h-4 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
              <button
                type="button"
                onClick={onToggleCompensated}
                aria-pressed={isCompensated}
                className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors font-mono ${
                  isCompensated
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
                title="Flatten reference target to 0 dB baseline to inspect relative delta"
              >
                {isCompensated ? "Δ Compensated" : "Raw SPL"}
              </button>
            </>
          )}

          <span className="h-4 w-px bg-[var(--border-subtle)] hidden sm:inline" aria-hidden="true" />

          <button
            type="button"
            onClick={onToggleInteractiveGraph}
            aria-pressed={isInteractiveGraph}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors hidden sm:inline-flex items-center gap-1.5 ${
              isInteractiveGraph
                ? "bg-[var(--accent-dim)] text-[var(--accent-text)] border border-[var(--accent-border)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent"
            }`}
            title="Hover and click frequency regions on the graph to toggle acoustic parameter bands"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isInteractiveGraph ? "bg-[var(--accent-text)]" : "bg-[var(--text-muted)] opacity-50"
              }`}
            />
            Interactive Bands
          </button>
        </div>
      </div>

      {/* Right: Active Trace Counter & Quick-Start / Shortcuts Trigger */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono tabular-nums text-[var(--text-secondary)] bg-[var(--bg-base)] rounded border border-[var(--border-subtle)]"
          title="Visible / Total loaded traces"
        >
          <span className="text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
            Channels
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {visibleTraceCount}/{traceCount}
          </span>
        </div>

        {onOpenQuickStart && (
          <button
            type="button"
            onClick={onOpenQuickStart}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border)] transition-colors"
            title="Quick-Start & Keyboard Shortcuts (?)"
            aria-label="Open Quick-Start and Keyboard Shortcuts"
          >
            <svg
              width="13"
              height="13"
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
            <span className="hidden md:inline">Shortcuts</span>
            <kbd className="px-1 py-0.2 text-[10px] rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
              ?
            </kbd>
          </button>
        )}
      </div>
    </header>
  );
});
