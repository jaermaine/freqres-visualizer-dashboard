"use client";

import { useState, useCallback, useId, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { FRChart } from "./FRChart";
import { DifferenceTable } from "./DifferenceTable";
import { ExportStudioModal, type ExportOptions } from "./ExportStudioModal";
import { ImportStatus } from "./HelpPanel";
import { OnboardingModal } from "./OnboardingModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Trace, ImportResult } from "@/types/audio";
import { PARAMETER_BANDS } from "@/lib/parameterBands";

import { getTraceSourceLabel, getReviewerName } from "@/lib/sourceUtils";
import { PALETTE } from '@/lib/colors';

function getAvailableColor(traces: Trace[], currentLabel: string, theme: string): string {
  if (currentLabel.toLowerCase().includes("target")) return theme === 'light' ? "#334155" : "#ffffff";
  const usedColors = new Set(traces.map(t => t.color));
  const availableColor = PALETTE.find(c => !usedColors.has(c));
  // If all colors in the palette are in use, fallback to cyclical assignment
  return availableColor || PALETTE[traces.length % PALETTE.length];
}

export function AppShell() {
  const [tracesRaw, setTracesRaw] = useState<Trace[]>([]);
  const [history, setHistory] = useState<{stack: Trace[][], index: number}>({ stack: [], index: -1 });

  const setTraces = useCallback((action: Trace[] | ((prev: Trace[]) => Trace[])) => {
    setTracesRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next !== prev) {
        setHistory((hs) => {
          const upToCurrent = hs.stack.slice(0, hs.index + 1);
          const newStack = [...upToCurrent, next].slice(-50);
          return { stack: newStack, index: newStack.length - 1 };
        });
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((hs) => {
      if (hs.index > 0) {
        const newIndex = hs.index - 1;
        setTracesRaw(hs.stack[newIndex]);
        return { ...hs, index: newIndex };
      }
      return hs;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((hs) => {
      if (hs.index < hs.stack.length - 1) {
        const newIndex = hs.index + 1;
        setTracesRaw(hs.stack[newIndex]);
        return { ...hs, index: newIndex };
      }
      return hs;
    });
  }, []);

  const traces = tracesRaw;
  const [enabledBands, setEnabledBands] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>("none");
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);
  const [hoveredHz, setHoveredHz] = useState<number | null>(null);
  const [isInteractiveGraph, setIsInteractiveGraph] = useState(true);
  const [isCompensated, setIsCompensated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [savedWorkspaces, setSavedWorkspaces] = useState<Record<string, any>>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [fetchingShared, setFetchingShared] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const uid = useId();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = localStorage.getItem('freqres_hasSeenOnboarding') === 'true';
      if (!hasSeen) {
        setShowOnboarding(true);
      }
      const savedTheme = localStorage.getItem("freqres_theme");
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add(`theme-${savedTheme}`);
      } else {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        const initialTheme = prefersLight ? 'light' : 'dark';
        setTheme(initialTheme);
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add(`theme-${initialTheme}`);
      }

      const workspacesStr = localStorage.getItem('freqres_saved_workspaces');
      if (workspacesStr) {
        try {
          setSavedWorkspaces(JSON.parse(workspacesStr));
        } catch (e) {
          console.error("Failed to parse saved workspaces", e);
        }
      }
    }
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('freqres_hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const handleImport = useCallback(async (url: string, channelMode: "separate" | "avg" = "separate") => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, channelMode }),
      });
      const data: ImportResult = await res.json();
      setLastResult(data);

      if (data.ok && data.mode === "fr-data") {
        setTraces((prev) => {
          let currentTraces = [...prev];
          data.curves.forEach((curve) => {
            const isDuplicate = currentTraces.some(t => {
              if (t.label !== curve.label) return false;
              if (t.source.kind !== data.source.kind) return false;
              if (t.source.kind === 'squiglink-share-url' && data.source.kind === 'squiglink-share-url') {
                return t.source.host === data.source.host;
              }
              if (t.source.kind === 'hangout-graph-url' && data.source.kind === 'hangout-graph-url') {
                return t.source.rigId === data.source.rigId;
              }
              if (t.source.kind === 'raw-measurement-file-url' && data.source.kind === 'raw-measurement-file-url') {
                return t.source.url === data.source.url;
              }
              return false;
            });
            if (isDuplicate) return;

            currentTraces.push({
              id: `${uid}-${Date.now()}-${currentTraces.length}`,
              label: curve.label,
              channel: curve.channel,
              color: getAvailableColor(currentTraces, curve.label, theme),
              normalized: curve.normalized,
              source: data.source,
              visible: true,
            });
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
      return false;
    } finally {
      setLoading(false);
    }
  }, [uid, theme]);

  // Initial Hydration: Check URL first, fallback to Local Storage
  useEffect(() => {
    if (typeof window === 'undefined' || hasHydrated) return;
    setHasHydrated(true);

    const searchParams = new URLSearchParams(window.location.search);
      const shortId = searchParams.get('s');
      if (shortId) {
        setFetchingShared(true);
        fetch(`/api/workspace?id=${shortId}`)
          .then(res => res.json())
          .then(result => {
            if (result.workspace) {
              const data = result.workspace;
              if (data.target) setSelectedTarget(data.target);
              if (data.bands) setEnabledBands(new Set(data.bands));
              if (data.compensated !== undefined) setIsCompensated(data.compensated);
              if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);
              
              if (data.urls && Array.isArray(data.urls)) {
                (async () => {
                  for (const url of data.urls) {
                    await handleImport(url);
                  }
                  setFetchingShared(false);
                })();
              } else {
                setFetchingShared(false);
              }
            } else {
              setLinkExpired(true);
              setFetchingShared(false);
            }
          })
          .catch(err => {
            console.error("Failed to load shortlink workspace:", err);
            setLinkExpired(true);
            setFetchingShared(false);
          })
          .finally(() => {
            window.history.replaceState({}, '', '/');
          });
        return; // Hydration complete via shortlink
      }

      // --- 2. Legacy fallback for Base64 `?workspace=` (keeps old links working) ---
      const workspaceBase64 = searchParams.get('workspace');
      if (workspaceBase64) {
        try {
          const jsonStr = atob(workspaceBase64);
          const data = JSON.parse(jsonStr);
          
          if (data.target) setSelectedTarget(data.target);
          if (data.bands) setEnabledBands(new Set(data.bands));
          if (data.compensated !== undefined) setIsCompensated(data.compensated);
          if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);
          
          if (data.urls && Array.isArray(data.urls)) {
            (async () => {
              for (const url of data.urls) {
                await handleImport(url);
              }
            })();
          }
          
          // Clean up URL
          window.history.replaceState({}, '', '/');
          return;
        } catch (e) {
          console.error("Failed to parse base64 workspace URL", e);
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
    if (!hasHydrated) return; // wait until hydrated before saving
    
    const stateToSave = {
      traces,
      bands: Array.from(enabledBands),
      target: selectedTarget,
      compensated: isCompensated,
      interactive: isInteractiveGraph
    };
    localStorage.setItem('freqres_workspace', JSON.stringify(stateToSave));
  }, [traces, enabledBands, selectedTarget, isCompensated, isInteractiveGraph]);

  // URL Sharing (Database Shortlink)
  const [isSharing, setIsSharing] = useState(false);
  const handleShareWorkspace = useCallback(async () => {
    setIsSharing(true);
    try {
      const urls = traces.map(t => {
        if (t.source.kind === 'squiglink-share-url') {
          return `${t.source.baseUrl}?share=${t.source.models.map(m => encodeURIComponent(m.raw)).join(',')}`;
        }
        if (t.source.kind === 'raw-measurement-file-url') {
          return t.source.url;
        }
        return null;
      }).filter(Boolean) as string[];

      const uniqueUrls = Array.from(new Set(urls));

      let imageBase64 = null;
      try {
        const Plotly = (await import('plotly.js-basic-dist-min')).default;
        const graphDiv = document.querySelector('.js-plotly-plot') as HTMLElement;
        if (graphDiv) {
          // Generate a 1200x630 (standard OG size) snapshot of the graph as JPEG to save Redis payload size
          imageBase64 = await Plotly.toImage(graphDiv, {format: 'jpeg', width: 1200, height: 630});
        }
      } catch (imgErr) {
        console.error("Failed to capture graph image:", imgErr);
      }

      const state = {
        urls: uniqueUrls,
        target: selectedTarget,
        bands: Array.from(enabledBands),
        compensated: isCompensated,
        interactive: isInteractiveGraph,
        ...(imageBase64 ? { image: imageBase64 } : {})
      };

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!res.ok) throw new Error("Failed to generate shortlink");
        const data = await res.json();
        const shortUrl = `${window.location.origin}/s/${data.id}`;
        
        try {
          await navigator.clipboard.writeText(shortUrl);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy to clipboard:", err);
          // Fallback UI or prompt could go here
        }
      } catch (err) {
        console.error("Failed to share workspace:", err);
        alert("Failed to share workspace. Please try again.");
      } finally {
        setIsSharing(false);
      }
  }, [traces, selectedTarget, enabledBands, isCompensated, isInteractiveGraph]);

  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);

  const renderGraphSnapshot = useCallback(async (options: ExportOptions, targetWidth?: number) => {
    const visibleTraces = traces.filter((t) => t.visible);
    if (visibleTraces.length === 0) return null;

    const Plotly = (await import('plotly.js-basic-dist-min')).default;
    const graphDiv = document.querySelector('.js-plotly-plot') as any;
    if (!graphDiv) return null;

    let width = targetWidth || 1200;
    let height = 675;
    if (options.aspectRatio === '1:1') {
      width = targetWidth || 900;
      height = targetWidth || 900;
    } else if (options.aspectRatio === '4:3') {
      width = targetWidth || 1200;
      height = Math.round((width * 3) / 4);
    } else {
      height = Math.round((width * 9) / 16);
    }

    const isDark = options.exportTheme === 'dark';

    // Store original layout theme attributes
    const origLayout = {
      paper_bgcolor: graphDiv.layout.paper_bgcolor,
      plot_bgcolor: graphDiv.layout.plot_bgcolor,
      'xaxis.gridcolor': graphDiv.layout.xaxis?.gridcolor,
      'xaxis.tickfont.color': graphDiv.layout.xaxis?.tickfont?.color,
      'yaxis.gridcolor': graphDiv.layout.yaxis?.gridcolor,
      'yaxis.tickfont.color': graphDiv.layout.yaxis?.tickfont?.color,
    };

    // Apply target theme layout for snapshot
    const exportThemeLayout = {
      paper_bgcolor: isDark ? "#0d0f14" : "#ffffff",
      plot_bgcolor: isDark ? "#0d0f14" : "#ffffff",
      'xaxis.gridcolor': isDark ? "#1c2030" : "#e2e8f0",
      'xaxis.tickfont.color': isDark ? "#8892a4" : "#475569",
      'yaxis.gridcolor': isDark ? "#1c2030" : "#e2e8f0",
      'yaxis.tickfont.color': isDark ? "#8892a4" : "#475569",
    };

    await Plotly.relayout(graphDiv, exportThemeLayout);

    const dataUrl = await Plotly.toImage(graphDiv, {
      format: 'png',
      width,
      height,
    });

    // Revert layout back to current UI theme
    await Plotly.relayout(graphDiv, origLayout);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    canvas.width = width;
    canvas.height = height;

    // Fill solid background
    ctx.fillStyle = isDark ? "#0d0f14" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Render Watermark & Reviewer Attribution
    const fontSize = Math.max(12, Math.round(width * 0.018));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(15, 23, 42, 0.5)";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    const reviewers = Array.from(new Set(visibleTraces.map(getReviewerName).filter(Boolean)));

    let watermarkString = "FreqRes";
    if (options.includeSourceCredit && reviewers.length > 0) {
      watermarkString += ` • Measured by ${reviewers.join(", ")}`;
    }

    ctx.fillText(watermarkString, width - 20, height - 16);

    return canvas.toDataURL("image/png");
  }, [traces]);

  const handleGeneratePreview = useCallback(async (options: ExportOptions) => {
    return await renderGraphSnapshot(options, 600);
  }, [renderGraphSnapshot]);

  const handleExportImage = useCallback(async (options: ExportOptions) => {
    const visibleTraces = traces.filter((t) => t.visible);
    if (visibleTraces.length === 0) return;
    setIsExportingImage(true);
    
    try {
      const dataUrl = await renderGraphSnapshot(options);
      if (!dataUrl) return;

      const a = document.createElement("a");
      a.href = dataUrl;
      const filename = visibleTraces.length === 1 
        ? `${visibleTraces[0].label} Frequency Response.png` 
        : `${visibleTraces.map(t => t.label).join(" vs ")} Comparison.png`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setIsExportingImage(false);
    }
  }, [traces, renderGraphSnapshot]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          handleShareWorkspace();
        }
      } else {
        if (e.key >= '1' && e.key <= '9') {
          const index = parseInt(e.key) - 1;
          if (index < traces.length) {
            setTraces((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], visible: !next[index].visible };
              return next;
            });
          }
        } else if (e.key === 'Escape') {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [traces, undo, redo, handleShareWorkspace, setTraces]);

  const handleToggleTrace = useCallback((id: string) => {
    setTraces((prev) => prev.map((t) => t.id === id ? { ...t, visible: !t.visible } : t));
  }, []);

  const handleRemoveTrace = useCallback((id: string) => {
    setTraces((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleColorChange = (id: string, color: string) => {
    setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  };

  const handleLabelChange = (id: string, label: string) => {
    setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  };

  const handleNoteChange = (id: string, notes: string) => {
    setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)));
  };

  const handleReorderTraces = (dragIndex: number, hoverIndex: number) => {
    setTraces((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, dragged);
      return next;
    });
  };

  const handleToggleChannelMode = useCallback(async (id: string) => {
    let target: Trace | undefined;
    setTraces((prev) => {
      target = prev.find((t) => t.id === id);
      return prev;
    });

    if (!target) return;

    // If rawChannels is missing but it's from a squiglink/hangout URL, fetch both channels on demand
    let fetchedChannels = target.rawChannels;
    if (!fetchedChannels && (target.source.kind === "squiglink-share-url" || target.source.kind === "hangout-graph-url")) {
      try {
        setLoading(true);
        const modelRaw = target.source.models[0]?.raw || target.label;
        const shareParam = encodeURIComponent(modelRaw);
        const fetchUrl = `${target.source.baseUrl}?share=${shareParam}`;
        
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fetchUrl, channelMode: "separate" }),
        });
        const data = await res.json();
        if (data.ok && data.mode === "fr-data" && data.curves.length >= 2) {
          const leftCurve = data.curves.find((c: any) => c.channel === "L") || data.curves[0];
          const rightCurve = data.curves.find((c: any) => c.channel === "R") || data.curves[1];
          if (leftCurve && rightCurve) {
            fetchedChannels = {
              left: leftCurve.normalized,
              right: rightCurve.normalized,
            };
          }
        }
      } catch (err) {
        console.error("Failed to fetch L/R channels on demand:", err);
      } finally {
        setLoading(false);
      }
    }

    setTraces((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      const currentTarget = { ...prev[index], rawChannels: fetchedChannels || prev[index].rawChannels };
      const raw = currentTarget.rawChannels;

      // Split Average trace into L & R traces
      if ((!currentTarget.channel || currentTarget.channel === "avg") && raw?.left && raw?.right) {
        const baseName = currentTarget.label.replace(/\s*\((Avg|Average|[LR])\)\s*/gi, "").trim();
        const leftTrace: Trace = {
          id: `${uid}-${Date.now()}-L`,
          label: `${baseName} (L)`,
          channel: "L",
          color: currentTarget.color,
          normalized: raw.left,
          source: currentTarget.source,
          visible: currentTarget.visible,
          notes: currentTarget.notes,
          rawChannels: raw,
        };
        const rightTrace: Trace = {
          id: `${uid}-${Date.now()}-R`,
          label: `${baseName} (R)`,
          channel: "R",
          color: getAvailableColor(prev, `${baseName} (R)`, theme),
          normalized: raw.right,
          source: currentTarget.source,
          visible: currentTarget.visible,
          notes: currentTarget.notes,
          rawChannels: raw,
        };
        const next = [...prev];
        next.splice(index, 1, leftTrace, rightTrace);
        return next;
      }

      // Combine L and R traces into Average trace
      if ((currentTarget.channel === "L" || currentTarget.channel === "R") && raw?.left && raw?.right) {
        const baseName = currentTarget.label.replace(/\s*\([LR]\)\s*$/gi, "").trim();
        const matchingTraces = prev.filter((t) => {
          const name = t.label.replace(/\s*\([LR]\)\s*$/gi, "").trim();
          return name === baseName;
        });

        const hz = raw.left.hz;
        const avgDb = hz.map((_, i) => (raw.left!.db[i] + raw.right!.db[i]) / 2);

        const avgTrace: Trace = {
          id: `${uid}-${Date.now()}-avg`,
          label: baseName,
          channel: "avg",
          color: currentTarget.color,
          normalized: { hz, db: avgDb },
          source: currentTarget.source,
          visible: currentTarget.visible,
          notes: currentTarget.notes,
          rawChannels: raw,
        };

        const matchingIds = new Set(matchingTraces.map((t) => t.id));
        const next = prev.filter((t) => !matchingIds.has(t.id));
        const insertIdx = Math.min(index, next.length);
        next.splice(insertIdx, 0, avgTrace);
        return next;
      }

      return prev;
    });
  }, [uid, theme]);

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

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('freqres_theme', newTheme);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${newTheme}`);
  };

  const handleSaveWorkspace = useCallback((name: string) => {
    const state = {
      traces,
      bands: Array.from(enabledBands),
      target: selectedTarget,
      compensated: isCompensated,
      interactive: isInteractiveGraph
    };
    setSavedWorkspaces(prev => {
      const next = { ...prev, [name]: state };
      localStorage.setItem('freqres_saved_workspaces', JSON.stringify(next));
      return next;
    });
  }, [traces, enabledBands, selectedTarget, isCompensated, isInteractiveGraph]);

  const handleLoadWorkspace = useCallback((name: string) => {
    const ws = savedWorkspaces[name];
    if (!ws) return;
    
    if (ws.traces) setTraces(ws.traces);
    if (ws.bands) setEnabledBands(new Set(ws.bands));
    if (ws.target !== undefined) setSelectedTarget(ws.target);
    if (ws.compensated !== undefined) setIsCompensated(ws.compensated);
    if (ws.interactive !== undefined) setIsInteractiveGraph(ws.interactive);
  }, [savedWorkspaces, setTraces]);

  const handleDeleteWorkspace = useCallback((name: string) => {
    setSavedWorkspaces(prev => {
      const next = { ...prev };
      delete next[name];
      localStorage.setItem('freqres_saved_workspaces', JSON.stringify(next));
      return next;
    });
  }, []);

  if (!hasHydrated || fetchingShared) {
    return (
      <div className="flex h-screen w-full bg-[var(--bg-base)]">
        <div className="w-80 h-full border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 flex flex-col gap-4 animate-pulse">
          <div className="h-8 bg-[var(--bg-raised)] rounded w-3/4"></div>
          <div className="h-20 bg-[var(--bg-raised)] rounded w-full"></div>
          <div className="h-40 bg-[var(--bg-raised)] rounded w-full mt-4"></div>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4 animate-pulse">
          <div className="h-10 bg-[var(--bg-raised)] rounded w-full"></div>
          <div className="flex-1 bg-[var(--bg-raised)] rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (linkExpired) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="p-8 panel max-w-md text-center flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="text-[var(--text-secondary)]">This shared workspace link has expired. Shared links are automatically purged after 3 days to free up space.</p>
          <button 
            onClick={() => setLinkExpired(false)} 
            className="btn-primary mt-2">
            Create a New Comparison
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <ErrorBoundary>
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
          onNoteChange={handleNoteChange}
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
          onExportImage={() => setIsExportStudioOpen(true)}
          isCopied={isCopied}
          isSharing={isSharing}
          isExportingImage={isExportingImage}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          theme={theme}
          onToggleTheme={toggleTheme}
          savedWorkspaces={savedWorkspaces}
          onSaveWorkspace={handleSaveWorkspace}
          onLoadWorkspace={handleLoadWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onToggleChannelMode={handleToggleChannelMode}
        />
      </ErrorBoundary>
      <main className="flex-1 flex flex-col relative h-full bg-[var(--bg-base)] overflow-hidden">
        <Header
          selectedTarget={selectedTarget}
          onSelectTarget={setSelectedTarget}
          isCompensated={isCompensated}
          onToggleCompensated={() => setIsCompensated((p) => !p)}
          isInteractiveGraph={isInteractiveGraph}
          onToggleInteractiveGraph={() => setIsInteractiveGraph((p) => !p)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          traceCount={traces.length}
        />

        <div className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden">
          <div 
            className="flex-1 min-h-[60vh] shrink-0"
            onMouseLeave={() => setHoveredHz(null)}
            onPointerDownCapture={() => {
              if (isInteractiveGraph && hoveredHz !== null) {
                handleChartClick(hoveredHz);
              }
            }}
          >
            <ErrorBoundary>
              <FRChart 
                traces={traces} 
                enabledBands={enabledBands} 
                hoveredBands={hoveredBandsOnly}
                selectedTarget={selectedTarget} 
                isCompensated={isCompensated}
                onChartHover={setHoveredHz}
                theme={theme}
              />
            </ErrorBoundary>
          </div>
          
          <div className="shrink-0 px-4 md:px-6 pb-6">
            <DifferenceTable traces={traces} theme={theme} isCompensated={isCompensated} selectedTarget={selectedTarget} />
          </div>
        </div>
        
        {/* Floating Toast Notification */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 z-40 shadow-lg md:max-w-[320px]">
          <ImportStatus result={lastResult} loading={loading} />
        </div>
      </main>

      <ExportStudioModal
        isOpen={isExportStudioOpen}
        onClose={() => setIsExportStudioOpen(false)}
        traces={traces}
        currentTheme={theme}
        onExport={handleExportImage}
        generatePreview={handleGeneratePreview}
        isExporting={isExportingImage}
      />

      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
    </div>
  );
}
