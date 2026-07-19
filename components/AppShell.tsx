"use client";

import { useState, useCallback, useId, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { FRChart } from "./FRChart";
import { ImportStatus } from "./HelpPanel";
import { OnboardingModal } from "./OnboardingModal";
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
  const [selectedTarget, setSelectedTarget] = useState<string>("none");
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);
  const [hoveredHz, setHoveredHz] = useState<number | null>(null);
  const [isInteractiveGraph, setIsInteractiveGraph] = useState(true);
  const [isCompensated, setIsCompensated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasHydrated = useRef(false);
  const uid = useId();
  let traceCounter = traces.length;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = localStorage.getItem('freqres_hasSeenOnboarding');
      if (!hasSeen) {
        setShowOnboarding(true);
      }
    }
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('freqres_hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

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
            const isDuplicate = currentTraces.some((t) => {
              if (t.label !== curve.label) return false;
              if (t.source.kind !== data.source.kind) return false;
              if (t.source.kind === "squiglink-share-url" && data.source.kind === "squiglink-share-url") {
                return t.source.host === data.source.host;
              }
              if (t.source.kind === "hangout-graph-url" && data.source.kind === "hangout-graph-url") {
                return t.source.rigId === data.source.rigId;
              }
              if (t.source.kind === "raw-measurement-file-url" && data.source.kind === "raw-measurement-file-url") {
                return t.source.url === data.source.url;
              }
              return false;
            });
            if (isDuplicate) return;

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
        return true;
      }
      return false;
    } catch (err: any) {
      setLastResult({ ok: false, code: "FETCH_ERROR", message: err.message || "Unknown error occurred" });
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // Initial Hydration: Check URL first, fallback to Local Storage
  useEffect(() => {
    if (typeof window === 'undefined' || hasHydrated.current) return;
    hasHydrated.current = true;

    const params = new URLSearchParams(window.location.search);
    const workspaceParam = params.get('workspace');

    if (workspaceParam) {
      try {
        const decoded = atob(workspaceParam);
        const data = JSON.parse(decoded);
        
        if (data.target) setSelectedTarget(data.target);
        if (data.compensated !== undefined) setIsCompensated(data.compensated);
        if (data.bands) setEnabledBands(new Set(data.bands));
        if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);
        
        if (data.urls && Array.isArray(data.urls)) {
          // Batch fetch shared URLs sequentially to avoid backend rate-limiting/spamming
          (async () => {
            for (const url of data.urls) {
              await handleImport(url);
            }
          })();
        }
        
        // Clean up URL so it doesn't persist the giant base64 string
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch(e) {
        console.error("Failed to parse shared workspace URL", e);
      }
    } else {
      // Restore from Local Storage
      const saved = localStorage.getItem('freqres_workspace');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.traces) setTraces(data.traces);
          if (data.bands) setEnabledBands(new Set(data.bands));
          if (data.target) setSelectedTarget(data.target);
          if (data.compensated !== undefined) setIsCompensated(data.compensated);
          if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);
        } catch(e) {
          console.error("Failed to parse local storage workspace", e);
        }
      }
    }
  }, [handleImport]);

  // Serialization: Save to Local Storage on changes
  useEffect(() => {
    if (!hasHydrated.current) return; // wait until hydrated before saving
    
    const stateToSave = {
      traces,
      bands: Array.from(enabledBands),
      target: selectedTarget,
      compensated: isCompensated,
      interactive: isInteractiveGraph
    };
    localStorage.setItem('freqres_workspace', JSON.stringify(stateToSave));
  }, [traces, enabledBands, selectedTarget, isCompensated, isInteractiveGraph]);

  // URL Sharing
  const handleShareWorkspace = useCallback(() => {
    const urls = traces.map(t => {
      if (t.source.kind === 'squiglink-share-url') {
        // Use baseUrl to properly preserve subdirectories (e.g., https://host.squig.link/cables/)
        return `${t.source.baseUrl}?share=${t.source.models.map(m => encodeURIComponent(m.raw)).join(',')}`;
      }
      if (t.source.kind === 'raw-measurement-file-url') {
        return t.source.url;
      }
      return null;
    }).filter(Boolean) as string[];

    // Deduplicate URLs to prevent backend request spam
    const uniqueUrls = Array.from(new Set(urls));

    const state = {
      urls: uniqueUrls,
      target: selectedTarget,
      bands: Array.from(enabledBands),
      compensated: isCompensated,
      interactive: isInteractiveGraph
    };

    const encoded = btoa(JSON.stringify(state));
    const shareUrl = `${window.location.origin}${window.location.pathname}?workspace=${encoded}`;
    navigator.clipboard.writeText(shareUrl);
  }, [traces, selectedTarget, enabledBands, isCompensated, isInteractiveGraph]);

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

  const handleClearAllBands = useCallback(() => {
    setEnabledBands(new Set());
  }, []);

  const handleClearCategory = useCallback((categoryId: string) => {
    const categoryBands = PARAMETER_BANDS.filter(b => b.category === categoryId).map(b => b.id);
    setEnabledBands(prev => {
      const next = new Set(prev);
      categoryBands.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const handleChartClick = useCallback((hz: number) => {
    if (!isInteractiveGraph) return;
    const matchingBands = PARAMETER_BANDS.filter(b => b.category !== "quality" && hz >= b.freqLow && hz <= b.freqHigh);
    if (matchingBands.length === 0) return;
    
    setEnabledBands(prev => {
      const next = new Set(prev);
      const allEnabled = matchingBands.every(b => next.has(b.id));
      if (allEnabled) {
         matchingBands.forEach(b => next.delete(b.id));
      } else {
         matchingBands.forEach(b => next.add(b.id));
      }
      return next;
    });
  }, []);

  const hoveredBandsOnly = new Set<string>();
  if (hoveredBand && !enabledBands.has(hoveredBand)) hoveredBandsOnly.add(hoveredBand);
  if (isInteractiveGraph && hoveredHz !== null) {
     PARAMETER_BANDS.forEach(b => {
       if (b.category !== "quality" && hoveredHz >= b.freqLow && hoveredHz <= b.freqHigh) {
          if (!enabledBands.has(b.id)) {
            hoveredBandsOnly.add(b.id);
          }
       }
     });
  }

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
        onClearAllBands={handleClearAllBands}
        onClearCategory={handleClearCategory}
        onHoverBand={setHoveredBand}
        isInteractiveGraph={isInteractiveGraph}
        onToggleInteractiveGraph={() => setIsInteractiveGraph(p => !p)}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
        isCompensated={isCompensated}
        onToggleCompensated={() => setIsCompensated(p => !p)}
        onShareWorkspace={handleShareWorkspace}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col relative h-full bg-[var(--bg-base)] overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 text-base">〰</span>
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

        <div 
          className="flex-1 min-h-[50vh]"
          onMouseLeave={() => setHoveredHz(null)}
          onPointerDownCapture={() => {
            if (isInteractiveGraph && hoveredHz !== null) {
              handleChartClick(hoveredHz);
            }
          }}
        >
          <FRChart 
            traces={traces} 
            enabledBands={enabledBands} 
            hoveredBands={hoveredBandsOnly}
            selectedTarget={selectedTarget} 
            isCompensated={isCompensated}
            onChartHover={setHoveredHz}
          />
        </div>
        
        {/* Floating Toast Notification */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 z-40 shadow-lg md:max-w-[320px]">
          <ImportStatus result={lastResult} loading={loading} />
        </div>
      </main>

      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
    </div>
  );
}
