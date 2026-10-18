"use client";

import { useState, useCallback, useId, useEffect, useRef, useMemo } from "react";
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
import { getReviewerName } from "@/lib/sourceUtils";
import { PALETTE } from "@/lib/colors";

function getAvailableColor(traces: Trace[], currentLabel: string, theme: string): string {
  if (currentLabel.toLowerCase().includes("target")) {
    return theme === "light" ? "#334155" : "#ffffff";
  }
  const usedColors = new Set(traces.map((t) => t.color));
  const availableColor = PALETTE.find((c) => !usedColors.has(c));
  return availableColor || PALETTE[traces.length % PALETTE.length];
}

type TraceHistoryState = {
  current: Trace[];
  stack: Trace[][];
  index: number;
};

export function AppShell() {
  const [traceState, setTraceState] = useState<TraceHistoryState>({
    current: [],
    stack: [],
    index: -1,
  });

  // Pure, StrictMode-safe state updater that atomically records undo history
  const setTraces = useCallback((action: Trace[] | ((prev: Trace[]) => Trace[])) => {
    setTraceState((prev) => {
      const next = typeof action === "function" ? action(prev.current) : action;
      if (next === prev.current) return prev;
      const upToCurrent = prev.stack.slice(0, prev.index + 1);
      const newStack = [...upToCurrent, next].slice(-50);
      return {
        current: next,
        stack: newStack,
        index: newStack.length - 1,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setTraceState((prev) => {
      if (prev.index > 0) {
        const newIndex = prev.index - 1;
        return {
          ...prev,
          current: prev.stack[newIndex],
          index: newIndex,
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setTraceState((prev) => {
      if (prev.index < prev.stack.length - 1) {
        const newIndex = prev.index + 1;
        return {
          ...prev,
          current: prev.stack[newIndex],
          index: newIndex,
        };
      }
      return prev;
    });
  }, []);

  const traces = traceState.current;
  const tracesRef = useRef<Trace[]>(traces);
  tracesRef.current = traces;

  const [enabledBands, setEnabledBands] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>("none");
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);
  const [chartHoveredBandKey, setChartHoveredBandKey] = useState<string>("");
  const hoveredHzRef = useRef<number | null>(null);
  const [isInteractiveGraph, setIsInteractiveGraph] = useState(true);
  const isInteractiveGraphRef = useRef<boolean>(isInteractiveGraph);
  isInteractiveGraphRef.current = isInteractiveGraph;

  const [isCompensated, setIsCompensated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [savedWorkspaces, setSavedWorkspaces] = useState<Record<string, any>>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [fetchingShared, setFetchingShared] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const uid = useId();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeen = localStorage.getItem("freqres_hasSeenOnboarding") === "true";
      if (!hasSeen) {
        setShowOnboarding(true);
      }
      const savedTheme = localStorage.getItem("freqres_theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        document.documentElement.classList.remove("theme-light", "theme-dark");
        document.documentElement.classList.add(`theme-${savedTheme}`);
      } else {
        const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
        const initialTheme = prefersLight ? "light" : "dark";
        setTheme(initialTheme);
        document.documentElement.classList.remove("theme-light", "theme-dark");
        document.documentElement.classList.add(`theme-${initialTheme}`);
      }

      const workspacesStr = localStorage.getItem("freqres_saved_workspaces");
      if (workspacesStr) {
        try {
          setSavedWorkspaces(JSON.parse(workspacesStr));
        } catch (e) {
          console.error("Failed to parse saved workspaces", e);
        }
      }
    }
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    localStorage.setItem("freqres_hasSeenOnboarding", "true");
    setShowOnboarding(false);
  }, []);

  const handleImport = useCallback(
    async (url: string, channelMode: "separate" | "avg" = "separate") => {
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
            const currentTraces = [...prev];
            let added = false;

            data.curves.forEach((curve) => {
              const isDuplicate = currentTraces.some((t) => {
                if (t.label !== curve.label) return false;
                if (t.source.kind !== data.source.kind) return false;
                if (
                  t.source.kind === "squiglink-share-url" &&
                  data.source.kind === "squiglink-share-url"
                ) {
                  return t.source.host === data.source.host;
                }
                if (
                  t.source.kind === "hangout-graph-url" &&
                  data.source.kind === "hangout-graph-url"
                ) {
                  return t.source.rigId === data.source.rigId;
                }
                if (
                  t.source.kind === "raw-measurement-file-url" &&
                  data.source.kind === "raw-measurement-file-url"
                ) {
                  return t.source.url === data.source.url;
                }
                return false;
              });
              if (isDuplicate) return;

              added = true;
              currentTraces.push({
                id: `${uid}-${Date.now()}-${currentTraces.length}`,
                label: curve.label,
                channel: curve.channel,
                color: getAvailableColor(currentTraces, curve.label, theme),
                normalized: curve.normalized,
                source: data.source,
                visible: true,
                ...(curve.rawChannels ? { rawChannels: curve.rawChannels } : {}),
              });
            });

            return added ? currentTraces : prev;
          });

          // Auto-dismiss success toast after 4s
          setTimeout(() => {
            setLastResult((prev) => (prev === data ? null : prev));
          }, 4000);
          return true;
        }
        return false;
      } catch (err: any) {
        setLastResult({
          ok: false,
          code: "FETCH_ERROR",
          message: err.message || "Unknown error occurred",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [uid, theme, setTraces]
  );

  // Initial Hydration: Check URL first, fallback to Local Storage
  useEffect(() => {
    if (typeof window === "undefined" || hasHydrated) return;
    setHasHydrated(true);

    const searchParams = new URLSearchParams(window.location.search);
    const shortId = searchParams.get("s");
    if (shortId) {
      setFetchingShared(true);
      fetch(`/api/workspace?id=${encodeURIComponent(shortId)}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.workspace) {
            const data = result.workspace;
            if (data.target) setSelectedTarget(data.target);
            if (data.bands) setEnabledBands(new Set(data.bands));
            if (data.compensated !== undefined) setIsCompensated(data.compensated);
            if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);

            if (data.urls && Array.isArray(data.urls)) {
              Promise.all(data.urls.map((u: string) => handleImport(u))).finally(() => {
                setFetchingShared(false);
              });
            } else {
              setFetchingShared(false);
            }
          } else {
            setLinkExpired(true);
            setFetchingShared(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load shortlink workspace:", err);
          setLinkExpired(true);
          setFetchingShared(false);
        })
        .finally(() => {
          window.history.replaceState({}, "", "/");
        });
      return;
    }

    // Legacy fallback for Base64 `?workspace=`
    const workspaceBase64 = searchParams.get("workspace");
    if (workspaceBase64) {
      try {
        const jsonStr = atob(workspaceBase64);
        const data = JSON.parse(jsonStr);

        if (data.target) setSelectedTarget(data.target);
        if (data.bands) setEnabledBands(new Set(data.bands));
        if (data.compensated !== undefined) setIsCompensated(data.compensated);
        if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);

        if (data.urls && Array.isArray(data.urls)) {
          void Promise.all(data.urls.map((u: string) => handleImport(u)));
        }

        window.history.replaceState({}, "", "/");
        return;
      } catch (e) {
        console.error("Failed to parse base64 workspace URL", e);
      }
    } else {
      // Restore from Local Storage
      const saved = localStorage.getItem("freqres_workspace");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.traces) setTraces(data.traces);
          if (data.bands) setEnabledBands(new Set(data.bands));
          if (data.target) setSelectedTarget(data.target);
          if (data.compensated !== undefined) setIsCompensated(data.compensated);
          if (data.interactive !== undefined) setIsInteractiveGraph(data.interactive);
        } catch (e) {
          console.error("Failed to parse local storage workspace", e);
        }
      }
    }
  }, [hasHydrated, handleImport, setTraces]);

  // Debounced Serialization: Save to Local Storage 300ms after state settles
  useEffect(() => {
    if (!hasHydrated) return;

    const timer = setTimeout(() => {
      const stateToSave = {
        traces,
        bands: Array.from(enabledBands),
        target: selectedTarget,
        compensated: isCompensated,
        interactive: isInteractiveGraph,
      };
      try {
        localStorage.setItem("freqres_workspace", JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Failed to persist workspace to localStorage:", e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [hasHydrated, traces, enabledBands, selectedTarget, isCompensated, isInteractiveGraph]);

  // URL Sharing (Database Shortlink)
  const [isSharing, setIsSharing] = useState(false);
  const handleShareWorkspace = useCallback(async () => {
    setIsSharing(true);
    try {
      const urls = traces
        .map((t) => {
          if (t.source.kind === "squiglink-share-url") {
            return `${t.source.baseUrl}?share=${t.source.models
              .map((m) => encodeURIComponent(m.raw))
              .join(",")}`;
          }
          if (t.source.kind === "raw-measurement-file-url") {
            return t.source.url;
          }
          return null;
        })
        .filter(Boolean) as string[];

      const uniqueUrls = Array.from(new Set(urls));

      let imageBase64 = null;
      try {
        const Plotly = (await import("plotly.js-basic-dist-min")).default;
        const graphDiv = document.querySelector(".js-plotly-plot") as HTMLElement;
        if (graphDiv) {
          imageBase64 = await Plotly.toImage(graphDiv, {
            format: "jpeg",
            width: 1200,
            height: 630,
          });
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
        ...(imageBase64 ? { image: imageBase64 } : {}),
      };

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch (err) {
      console.error("Failed to share workspace:", err);
      alert("Failed to share workspace. Please try again.");
    } finally {
      setIsSharing(false);
    }
  }, [traces, selectedTarget, enabledBands, isCompensated, isInteractiveGraph]);

  // Cache base Plotly snapshots so watermark toggles don't re-invoke Plotly.toImage
  const baseSnapshotCacheRef = useRef<{ key: string; dataUrl: string } | null>(null);
  useEffect(() => {
    baseSnapshotCacheRef.current = null;
  }, [traces, selectedTarget, isCompensated, enabledBands]);

  const renderGraphSnapshot = useCallback(
    async (options: ExportOptions, targetWidth?: number) => {
      const visibleTraces = traces.filter((t) => t.visible);
      if (visibleTraces.length === 0) return null;

      let width = targetWidth || 1200;
      let height = 675;
      if (options.aspectRatio === "1:1") {
        width = targetWidth || 900;
        height = targetWidth || 900;
      } else if (options.aspectRatio === "4:3") {
        width = targetWidth || 1200;
        height = Math.round((width * 3) / 4);
      } else {
        height = Math.round((width * 9) / 16);
      }

      const isDark = options.exportTheme === "dark";
      const cacheKey = `${width}x${height}-${options.exportTheme}`;
      let baseDataUrl =
        baseSnapshotCacheRef.current?.key === cacheKey
          ? baseSnapshotCacheRef.current.dataUrl
          : null;

      if (!baseDataUrl) {
        const Plotly = (await import("plotly.js-basic-dist-min")).default;
        const graphDiv = document.querySelector(".js-plotly-plot") as any;
        if (!graphDiv) return null;

        // Render offscreen figure specification without mutating or flashing the live DOM chart
        const clonedLayout = {
          ...graphDiv.layout,
          paper_bgcolor: isDark ? "#0d0f14" : "#ffffff",
          plot_bgcolor: isDark ? "#0d0f14" : "#ffffff",
          xaxis: {
            ...graphDiv.layout?.xaxis,
            gridcolor: isDark ? "#1c2030" : "#e2e8f0",
            tickfont: {
              ...graphDiv.layout?.xaxis?.tickfont,
              color: isDark ? "#8892a4" : "#475569",
            },
          },
          yaxis: {
            ...graphDiv.layout?.yaxis,
            gridcolor: isDark ? "#1c2030" : "#e2e8f0",
            tickfont: {
              ...graphDiv.layout?.yaxis?.tickfont,
              color: isDark ? "#8892a4" : "#475569",
            },
          },
        };

        baseDataUrl = await Plotly.toImage(
          { data: graphDiv.data, layout: clonedLayout },
          { format: "png", width, height }
        );

        if (baseDataUrl) {
          baseSnapshotCacheRef.current = { key: cacheKey, dataUrl: baseDataUrl };
        }
      }

      if (!baseDataUrl) return null;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const img = new Image();
      img.src = baseDataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = isDark ? "#0d0f14" : "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

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
    },
    [traces]
  );

  const handleGeneratePreview = useCallback(
    async (options: ExportOptions) => {
      return await renderGraphSnapshot(options, 600);
    },
    [renderGraphSnapshot]
  );

  const handleExportImage = useCallback(
    async (options: ExportOptions) => {
      const visibleTraces = traces.filter((t) => t.visible);
      if (visibleTraces.length === 0) return;
      setIsExportingImage(true);

      try {
        const dataUrl = await renderGraphSnapshot(options);
        if (!dataUrl) return;

        const a = document.createElement("a");
        a.href = dataUrl;
        const filename =
          visibleTraces.length === 1
            ? `${visibleTraces[0].label} Frequency Response.png`
            : `${visibleTraces.map((t) => t.label).join(" vs ")} Comparison.png`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error("Export failed:", e);
      } finally {
        setIsExportingImage(false);
      }
    },
    [traces, renderGraphSnapshot]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key === "y") {
          e.preventDefault();
          redo();
        } else if (e.key === "s") {
          e.preventDefault();
          handleShareWorkspace();
        }
      } else {
        if (e.key >= "1" && e.key <= "9") {
          const index = parseInt(e.key, 10) - 1;
          setTraces((prev) => {
            if (index >= prev.length) return prev;
            const next = [...prev];
            next[index] = { ...next[index], visible: !next[index].visible };
            return next;
          });
        } else if (e.key === "Escape") {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, handleShareWorkspace, setTraces]);

  const handleToggleTrace = useCallback(
    (id: string) => {
      setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)));
    },
    [setTraces]
  );

  const handleToggleAllTraces = useCallback(() => {
    setTraces((prev) => {
      if (prev.length === 0) return prev;
      const allVisible = prev.every((t) => t.visible);
      return prev.map((t) => ({ ...t, visible: !allVisible }));
    });
  }, [setTraces]);

  const handleRemoveTrace = useCallback(
    (id: string) => {
      setTraces((prev) => prev.filter((t) => t.id !== id));
    },
    [setTraces]
  );

  const handleClearAllTraces = useCallback(() => {
    setTraces((prev) => (prev.length === 0 ? prev : []));
  }, [setTraces]);

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
    },
    [setTraces]
  );

  const handleLabelChange = useCallback(
    (id: string, label: string) => {
      setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
    },
    [setTraces]
  );

  const handleNoteChange = useCallback(
    (id: string, notes: string) => {
      setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)));
    },
    [setTraces]
  );

  const handleReorderTraces = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      setTraces((prev) => {
        const next = [...prev];
        const [dragged] = next.splice(dragIndex, 1);
        next.splice(hoverIndex, 0, dragged);
        return next;
      });
    },
    [setTraces]
  );

  const handleToggleChannelMode = useCallback(
    async (id: string) => {
      const target = tracesRef.current.find((t) => t.id === id);
      if (!target) return;

      // Only fetch over the network if rawChannels wasn't already cached on the trace
      let fetchedChannels = target.rawChannels;
      if (
        !fetchedChannels &&
        (target.source.kind === "squiglink-share-url" || target.source.kind === "hangout-graph-url")
      ) {
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
        const currentTarget = {
          ...prev[index],
          rawChannels: fetchedChannels || prev[index].rawChannels,
        };
        const raw = currentTarget.rawChannels;

        // Split Average trace into L & R traces
        if (
          (!currentTarget.channel || currentTarget.channel === "avg") &&
          raw?.left &&
          raw?.right
        ) {
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
        if (
          (currentTarget.channel === "L" || currentTarget.channel === "R") &&
          raw?.left &&
          raw?.right
        ) {
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
    },
    [uid, theme, setTraces]
  );

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
    const categoryBands = PARAMETER_BANDS.filter((b) => b.category === categoryId).map(
      (b) => b.id
    );
    setEnabledBands((prev) => {
      const next = new Set(prev);
      categoryBands.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  // Only update React state when the set of matched parameter bands actually changes
  const handleChartHover = useCallback((hz: number | null) => {
    hoveredHzRef.current = hz;
    if (!isInteractiveGraphRef.current || hz === null) {
      setChartHoveredBandKey((prev) => (prev === "" ? prev : ""));
      return;
    }
    const matchedIds: string[] = [];
    for (let i = 0; i < PARAMETER_BANDS.length; i++) {
      const b = PARAMETER_BANDS[i];
      if (b.category !== "quality" && hz >= b.freqLow && hz <= b.freqHigh) {
        matchedIds.push(b.id);
      }
    }
    const nextKey = matchedIds.join(",");
    setChartHoveredBandKey((prev) => (prev === nextKey ? prev : nextKey));
  }, []);

  const handleChartClick = useCallback(
    (hz: number) => {
      if (!isInteractiveGraph) return;
      const matchingBands = PARAMETER_BANDS.filter(
        (b) => b.category !== "quality" && hz >= b.freqLow && hz <= b.freqHigh
      );
      if (matchingBands.length === 0) return;

      setEnabledBands((prev) => {
        const next = new Set(prev);
        const allEnabled = matchingBands.every((b) => next.has(b.id));
        if (allEnabled) {
          matchingBands.forEach((b) => next.delete(b.id));
        } else {
          matchingBands.forEach((b) => next.add(b.id));
        }
        return next;
      });
    },
    [isInteractiveGraph]
  );

  const hoveredBandsOnly = useMemo(() => {
    const out = new Set<string>();
    if (hoveredBand && !enabledBands.has(hoveredBand)) {
      out.add(hoveredBand);
    }
    if (isInteractiveGraph && chartHoveredBandKey) {
      const ids = chartHoveredBandKey.split(",");
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id && !enabledBands.has(id)) {
          out.add(id);
        }
      }
    }
    return out;
  }, [hoveredBand, isInteractiveGraph, chartHoveredBandKey, enabledBands]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "dark" ? "light" : "dark";
      localStorage.setItem("freqres_theme", newTheme);
      document.documentElement.classList.remove("theme-light", "theme-dark");
      document.documentElement.classList.add(`theme-${newTheme}`);
      return newTheme;
    });
  }, []);

  const handleToggleInteractiveGraph = useCallback(() => {
    setIsInteractiveGraph((p) => {
      const next = !p;
      if (!next) setChartHoveredBandKey("");
      return next;
    });
  }, []);

  const handleToggleCompensated = useCallback(() => {
    setIsCompensated((p) => !p);
  }, []);

  const handleOpenExportStudio = useCallback(() => {
    setIsExportStudioOpen(true);
  }, []);

  const handleCloseExportStudio = useCallback(() => {
    setIsExportStudioOpen(false);
  }, []);

  const handleOpenSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleDismissLastResult = useCallback(() => {
    setLastResult(null);
  }, []);

  const handleSaveWorkspace = useCallback(
    (name: string) => {
      const state = {
        traces,
        bands: Array.from(enabledBands),
        target: selectedTarget,
        compensated: isCompensated,
        interactive: isInteractiveGraph,
      };
      setSavedWorkspaces((prev) => {
        const next = { ...prev, [name]: state };
        localStorage.setItem("freqres_saved_workspaces", JSON.stringify(next));
        return next;
      });
    },
    [traces, enabledBands, selectedTarget, isCompensated, isInteractiveGraph]
  );

  const handleLoadWorkspace = useCallback(
    (name: string) => {
      const ws = savedWorkspaces[name];
      if (!ws) return;

      if (ws.traces) setTraces(ws.traces);
      if (ws.bands) setEnabledBands(new Set(ws.bands));
      if (ws.target !== undefined) setSelectedTarget(ws.target);
      if (ws.compensated !== undefined) setIsCompensated(ws.compensated);
      if (ws.interactive !== undefined) setIsInteractiveGraph(ws.interactive);
    },
    [savedWorkspaces, setTraces]
  );

  const handleDeleteWorkspace = useCallback((name: string) => {
    setSavedWorkspaces((prev) => {
      const next = { ...prev };
      delete next[name];
      localStorage.setItem("freqres_saved_workspaces", JSON.stringify(next));
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
          <p className="text-[var(--text-secondary)]">
            This shared workspace link has expired. Shared links are automatically purged after 3
            days to free up space.
          </p>
          <button onClick={() => setLinkExpired(false)} className="btn-primary mt-2">
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
          loading={loading}
          onImport={handleImport}
          onToggleTrace={handleToggleTrace}
          onToggleAllTraces={handleToggleAllTraces}
          onRemoveTrace={handleRemoveTrace}
          onClearAllTraces={handleClearAllTraces}
          onColorChange={handleColorChange}
          onLabelChange={handleLabelChange}
          onNoteChange={handleNoteChange}
          onReorderTraces={handleReorderTraces}
          onToggleBand={handleToggleBand}
          onClearAllBands={handleClearAllBands}
          onClearCategory={handleClearCategory}
          onHoverBand={setHoveredBand}
          onShareWorkspace={handleShareWorkspace}
          onExportImage={handleOpenExportStudio}
          isCopied={isCopied}
          isSharing={isSharing}
          isExportingImage={isExportingImage}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
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
          onToggleCompensated={handleToggleCompensated}
          isInteractiveGraph={isInteractiveGraph}
          onToggleInteractiveGraph={handleToggleInteractiveGraph}
          onOpenSidebar={handleOpenSidebar}
          traceCount={traces.length}
        />

        <div className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden">
          <div
            className="flex-1 min-h-[60vh] shrink-0"
            onMouseLeave={() => handleChartHover(null)}
            onPointerDownCapture={() => {
              if (isInteractiveGraph && hoveredHzRef.current !== null) {
                handleChartClick(hoveredHzRef.current);
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
                onChartHover={handleChartHover}
                theme={theme}
              />
            </ErrorBoundary>
          </div>

          <div className="shrink-0 px-4 md:px-6 pb-6">
            <DifferenceTable
              traces={traces}
              theme={theme}
              isCompensated={isCompensated}
              selectedTarget={selectedTarget}
            />
          </div>
        </div>

        {/* Floating Toast Notification */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 z-40 md:max-w-[320px]">
          <ImportStatus
            result={lastResult}
            loading={loading}
            onDismiss={handleDismissLastResult}
          />
        </div>
      </main>

      <ExportStudioModal
        isOpen={isExportStudioOpen}
        onClose={handleCloseExportStudio}
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
