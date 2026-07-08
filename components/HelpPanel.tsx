"use client";

import type { ImportResult } from "@/types/audio";

interface Props {
  result: ImportResult | null;
  loading: boolean;
}

export function ImportStatus({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="panel p-2.5">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          ⏳ Fetching…
        </p>
      </div>
    );
  }
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="panel p-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="tag tag-error">Error</span>
          <span className="label-xs">{result.code}</span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {result.message}
        </p>
      </div>
    );
  }

  if (result.mode === "metadata-only") {
    return (
      <div className="panel p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="tag tag-info">Graph URL</span>
          <span className="label-xs" style={{ color: "var(--text-muted)" }}>metadata-only</span>
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
    <div className="panel p-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="tag tag-ok">Loaded</span>
        <span className="label-xs" style={{ color: "var(--text-muted)" }}>
          {result.curves.length} curve{result.curves.length !== 1 ? "s" : ""}
        </span>
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
