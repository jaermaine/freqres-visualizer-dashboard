interface Card {
  title: string;
  type: "graph-url" | "raw-file" | "unsupported";
  example: string;
  note: string;
}

export function UrlPatternCard({ card }: { card: Card }) {
  const tagClass = {
    "graph-url": "tag-info",
    "raw-file": "tag-ok",
    "unsupported": "tag-error",
  }[card.type];

  const typeLabel = {
    "graph-url": "Graph URL",
    "raw-file": "Raw File",
    "unsupported": "Unsupported",
  }[card.type];

  return (
    <div className="panel p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`tag ${tagClass}`}>{typeLabel}</span>
        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{card.title}</span>
      </div>
      <code
        className="block text-xs px-2 py-1.5 rounded break-all"
        style={{
          background: "var(--bg-base)",
          color: "var(--text-secondary)",
          fontFamily: "JetBrains Mono, monospace",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {card.example}
      </code>
      <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {card.note}
      </p>
    </div>
  );
}

export type { Card as UrlPatternCardData };
