"use client";

import { useState, useCallback, useId } from "react";
import Image from "next/image";
import { Sidebar } from "./Sidebar";
import { FRChart } from "./FRChart";
import { ImportStatus } from "./HelpPanel";
import type { Trace, ImportResult } from "@/types/audio";
import { PARAMETER_BANDS } from "@/lib/parameterBands";

// High-contrast luminous palette for graph traces to ensure they never blend in with parameter bands
const PALETTE = [
  "#ffffff", // White
  "#ff00aa", // Neon Pink
  "#00ffcc", // Neon Teal
  "#ffea00", // Neon Yellow
  "#b700ff", // Neon Purple
  "#ff4d00", // Neon Orange
  "#00d4ff", // Neon Blue
  "#a2ff00", // Neon Lime
  "#ff88a8", // Light Pink
  "#88b3ff", // Light Blue
];

function nextColor(traces: Trace[]): string {
  const usedColors = new Set(traces.map(t => t.color));
  const availableColor = PALETTE.find(c => !usedColors.has(c));
  // If all colors in the palette are in use, fallback to cyclical assignment
  return availableColor || PALETTE[traces.length % PALETTE.length];
}

export function AppShell() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [enabledBands, setEnabledBands] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const uid = useId();
  let traceCounter = traces.length;

  const handleImport = useCallback(async (url: string) => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: ImportResult = await res.json();
      setLastResult(data);

      if (data.ok && data.mode === "fr-data") {
        setTraces((prev) => {
          let currentTraces = [...prev];
          data.curves.forEach((curve) => {
            const newTrace: Trace = {
              id: `${uid}-${Date.now()}-${currentTraces.length}`,
              label: curve.label,
              color: nextColor(currentTraces),
              normalized: curve.normalized,
              source: data.source,
              visible: true,
            };
            currentTraces.push(newTrace);
          });
          return currentTraces;
        });

        // Auto-dismiss success toast after 4s
        setTimeout(() => {
          setLastResult((prev) => (prev === data ? null : prev));
        }, 4000);
      }
    } catch (e) {
      setLastResult({
        ok: false,
        code: "FETCH_ERROR",
        message: "Failed to contact the import API.",
      });
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const handleToggleTrace = useCallback((id: string) => {
    setTraces((prev) => prev.map((t) => t.id === id ? { ...t, visible: !t.visible } : t));
  }, []);

  const handleRemoveTrace = useCallback((id: string) => {
    setTraces((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleColorChange = useCallback((id: string, color: string) => {
    setTraces((prev) => prev.map((t) => t.id === id ? { ...t, color } : t));
  }, []);

  const handleLabelChange = useCallback((id: string, label: string) => {
    setTraces((prev) => prev.map((t) => t.id === id ? { ...t, label } : t));
  }, []);

  const handleReorderTraces = useCallback((dragIndex: number, hoverIndex: number) => {
    setTraces((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, dragged);
      return next;
    });
  }, []);

  const handleToggleBand = useCallback((bandId: string) => {
    setEnabledBands((prev) => {
      const next = new Set(prev);
      if (next.has(bandId)) next.delete(bandId);
      else next.add(bandId);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar
        traces={traces}
        enabledBands={enabledBands}
        lastResult={lastResult}
        loading={loading}
        onImport={handleImport}
        onToggleTrace={handleToggleTrace}
        onRemoveTrace={handleRemoveTrace}
        onColorChange={handleColorChange}
        onLabelChange={handleLabelChange}
        onReorderTraces={handleReorderTraces}
        onToggleBand={handleToggleBand}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col relative h-full bg-[var(--bg-base)] overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="FreqRes Logo" width={20} height={20} className="object-contain" />
            <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
              FreqRes
            </span>
          </div>
          <button 
            className="text-[var(--text-muted)] hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-[50vh]">
          <FRChart traces={traces} enabledBands={enabledBands} />
        </div>
        
        {/* Floating Toast Notification */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 z-40 shadow-lg md:max-w-[320px]">
          <ImportStatus result={lastResult} loading={loading} />
        </div>
      </div>
    </div>
  );
}
