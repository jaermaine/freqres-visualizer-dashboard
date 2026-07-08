"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { TraceList } from "./TraceList";
import { BandToggleGroup } from "./BandToggleGroup";
import { ImportStatus } from "./HelpPanel";
import type { Trace, ImportResult } from "@/types/audio";

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  lastResult: ImportResult | null;
  loading: boolean;
  onImport: (url: string) => void;
  onToggleTrace: (id: string) => void;
  onRemoveTrace: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onToggleBand: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  traces,
  enabledBands,
  lastResult,
  loading,
  onImport,
  onToggleTrace,
  onRemoveTrace,
  onColorChange,
  onLabelChange,
  onReorderTraces,
  onToggleBand,
  isOpen,
  onClose,
}: Props) {
  const [url, setUrl] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleImport = useCallback(() => {
    if (!url.trim() || loading || cooldown > 0) return;
    onImport(url.trim());
    setCooldown(3); // 3-second UI rate limit
  }, [url, onImport, loading, cooldown]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleImport();
      }
    },
    [handleImport]
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" 
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full overflow-y-auto transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        style={{
          width: 300,
          minWidth: 300,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <Image src="/logo.png" alt="FreqRes Logo" width={20} height={20} className="object-contain" />
        <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
          FreqRes
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Link
            href="/tutorial"
            className="label-xs hover:text-indigo-400 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Guide
          </Link>
          {/* Mobile Close Button */}
          <button 
            className="md:hidden text-[var(--text-muted)] hover:text-white"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </span>
      </div>

      <div className="flex flex-col gap-4 p-3 flex-1">
        {/* URL Input */}
        <section>
          <p className="label-xs mb-1.5">Import URL</p>
          <textarea
            id="url-input"
            className="input-field"
            rows={2}
            placeholder="Paste Squiglink or raw file URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
          />
          <button
            id="import-btn"
            className="btn-primary w-full mt-2"
            onClick={handleImport}
            disabled={loading || !url.trim() || cooldown > 0}
          >
            {loading ? "Importing…" : cooldown > 0 ? `Wait ${cooldown}s…` : "Import"}
          </button>
        </section>

        <hr className="divider" />

        {/* Traces */}
        <section>
          <p className="label-xs mb-1.5">Traces ({traces.length})</p>
          <TraceList
            traces={traces}
            onToggle={onToggleTrace}
            onRemove={onRemoveTrace}
            onColorChange={onColorChange}
            onLabelChange={onLabelChange}
            onReorder={onReorderTraces}
          />
        </section>

        <hr className="divider" />

        {/* Parameter Bands */}
        <section>
          <p className="label-xs mb-1.5">Parameter Bands</p>
          <BandToggleGroup enabled={enabledBands} onToggle={onToggleBand} />
        </section>

        <hr className="divider" />

        <div className="pb-2 flex flex-col gap-2">
          <Link
            href="/tutorial"
            className="text-xs hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            📖 Tutorial & Troubleshooting →
          </Link>
          <Link
            href="/legal"
            className="text-xs hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            ⚖️ Legal & Privacy Policy
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}
