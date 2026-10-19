import React from "react";

interface Card {
  title: string;
  type: "graph-url" | "raw-file" | "unsupported";
  example: string;
  note: string;
}

export const UrlPatternCard = React.memo(function UrlPatternCard({ card }: { card: Card }) {
  const badgeStyle = {
    "graph-url": "tag-ok",
    "raw-file": "tag-info",
    "unsupported": "tag-error",
  }[card.type];

  const typeLabel = {
    "graph-url": "Supported",
    "raw-file": "Raw File",
    "unsupported": "Unsupported",
  }[card.type];

  return (
    <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[var(--text-primary)]">{card.title}</span>
        <span className={`tag uppercase ${badgeStyle}`}>
          {typeLabel}
        </span>
      </div>
      <code className="block text-[11px] px-3 py-1.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono break-all mb-2">
        {card.example}
      </code>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {card.note}
      </p>
    </div>
  );
});

export type { Card as UrlPatternCardData };

