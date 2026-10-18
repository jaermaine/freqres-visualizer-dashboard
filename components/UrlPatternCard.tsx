import React from "react";

interface Card {
  title: string;
  type: "graph-url" | "raw-file" | "unsupported";
  example: string;
  note: string;
}

export const UrlPatternCard = React.memo(function UrlPatternCard({ card }: { card: Card }) {
  const badgeStyle = {
    "graph-url": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    "raw-file": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    "unsupported": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  }[card.type];

  const typeLabel = {
    "graph-url": "Supported",
    "raw-file": "Raw File",
    "unsupported": "Unsupported",
  }[card.type];

  return (
    <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[var(--text-primary)]">{card.title}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${badgeStyle}`}>
          {typeLabel}
        </span>
      </div>
      <code className="block text-[11px] px-3 py-1.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-slate-300 font-mono break-all mb-2">
        {card.example}
      </code>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {card.note}
      </p>
    </div>
  );
});

export type { Card as UrlPatternCardData };

