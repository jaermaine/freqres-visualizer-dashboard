"use client";

import type { ImportResult } from "@/types/audio";

interface Props {
  result: ImportResult | null;
  loading: boolean;
  onDismiss?: () => void;
}

export function ImportStatus({ result, loading, onDismiss }: Props) {
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="panel p-2.5 flex items-center gap-2.5 shadow-xl"
      >
        <svg
          className="animate-spin h-3.5 w-3.5 text-[var(--accent-text)] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p className="text-xs font-mono text-[var(--text-secondary)]">
          Fetching measurement data...
        </p>
      </div>
    );
  }
  if (!result) return null;

  const DismissBtn = onDismiss ? (
    <button
      type="button"
      onClick={onDismiss}
      className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
      aria-label="Dismiss notification"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  ) : null;

  if (!result.ok) {
    return (
      <div
        role="alert"
        className="panel p-3 flex flex-col gap-1.5 shadow-xl border-[var(--error)]/40"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="tag tag-error">Error</span>
            <span className="label-xs">{result.code}</span>
          </div>
          {DismissBtn}
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {result.message}
        </p>
      </div>
    );
  }

  if (result.mode === "metadata-only") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="panel p-3 flex flex-col gap-1.5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="tag tag-warn">Metadata Only</span>
            <span className="label-xs">Unplottable Host</span>
          </div>
          {DismissBtn}
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {result.message}
        </p>
        {(result.source.kind === "squiglink-share-url" ||
          result.source.kind === "hangout-graph-url") &&
          result.source.models.length > 0 && (
            <div>
              <p className="label-xs mb-1">Models detected</p>
              <div className="flex flex-wrap gap-1">
                {result.source.models.map((m) => (
                  <span key={m.raw} className="tag tag-info">
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="panel p-3 flex flex-col gap-1.5 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="tag tag-ok">Imported</span>
          <span className="label-xs tabular-nums">
            {result.curves.length} curve{result.curves.length !== 1 ? "s" : ""}
          </span>
        </div>
        {DismissBtn}
      </div>
      <div className="flex flex-col gap-1 mt-0.5">
        {result.curves.map((curve, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs gap-2">
            <span className="font-medium text-[var(--text-primary)] truncate">
              {curve.label}
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
              {curve.pointCount ?? curve.points?.length ?? curve.normalized.hz.length} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
