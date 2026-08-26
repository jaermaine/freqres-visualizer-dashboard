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
      <div className="panel p-2.5 flex items-center gap-2 shadow-lg">
        <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Fetching...
        </p>
      </div>
    );
  }
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="panel p-2.5 flex flex-col gap-1 shadow-lg relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="tag tag-error">Error</span>
            <span className="label-xs">{result.code}</span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-white text-xs p-0.5"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {result.message}
        </p>
      </div>
    );
  }

  if (result.mode === "metadata-only") {
    return (
      <div className="panel p-2.5 flex flex-col gap-1.5 shadow-lg relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="tag tag-info">Graph URL</span>
            <span className="label-xs" style={{ color: "var(--text-muted)" }}>metadata-only</span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-white text-xs p-0.5"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {result.message}
        </p>
        {result.source.kind === "squiglink-share-url" && result.source.models.length > 0 && (
          <div>
            <p className="label-xs mb-1">Models detected</p>
            <div className="flex flex-wrap gap-1">
              {result.source.models.map((m) => (
                <span key={m.raw} className="tag tag-info text-xs">{m.label}</span>
              ))}
            </div>
          </div>
        )}
        {result.source.kind === "hangout-graph-url" && result.source.models.length > 0 && (
          <div>
            <p className="label-xs mb-1">Models detected</p>
            <div className="flex flex-wrap gap-1">
              {result.source.models.map((m) => (
                <span key={m.raw} className="tag tag-info text-xs">{m.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel p-2.5 flex flex-col gap-1 shadow-lg relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="tag tag-ok">Loaded</span>
          <span className="label-xs" style={{ color: "var(--text-muted)" }}>
            {result.curves.length} curve{result.curves.length !== 1 ? "s" : ""}
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[var(--text-muted)] hover:text-white text-xs p-0.5"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1 mt-1">
        {result.curves.map((curve, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs">
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{curve.label}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{curve.points.length} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
