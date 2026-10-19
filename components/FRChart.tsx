"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Trace } from "@/types/audio";
import { PARAMETER_BANDS } from "@/lib/parameterBands";
import { TUNING_TARGETS, getTargetGridDb, interpolateTargetAtHz } from "@/lib/targets";
import { computeRefMean } from "@/lib/parseMeasurementFile";
import { resolveTraceColorForTheme } from "@/lib/colors";

const Plot = dynamic(
  async () => {
    const [{ default: createPlotlyComponent }, { default: Plotly }] = await Promise.all([
      import("react-plotly.js/factory"),
      import("plotly.js-basic-dist-min"),
    ]);
    return createPlotlyComponent(Plotly);
  },
  { ssr: false }
);

export type SamplePresetId = "ab-comparison" | "channel-matching";

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  hoveredBands?: Set<string>;
  selectedTarget?: string;
  isCompensated?: boolean;
  onChartHover?: (hz: number | null) => void;
  theme?: "dark" | "light";
  onLoadSample?: (preset: SamplePresetId) => void;
  onFocusSearch?: () => void;
}

// Standard FR chart range: 20–20 kHz on X
const X_MIN = Math.log10(20);
const X_MAX = Math.log10(20000);

const ZOOM_PRESETS = [
  { id: "full", label: "Full (20–20k)", range: [X_MIN, X_MAX] as [number, number] },
  {
    id: "bass",
    label: "Bass (20–300 Hz)",
    range: [Math.log10(20), Math.log10(300)] as [number, number],
  },
  {
    id: "mids",
    label: "Mids (300–3k)",
    range: [Math.log10(300), Math.log10(3000)] as [number, number],
  },
  {
    id: "treble",
    label: "Treble (3k–20k)",
    range: [Math.log10(3000), Math.log10(20000)] as [number, number],
  },
];

const BASE_TICK_VALS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const BASE_TICK_TEXT = ["20", "50", "100", "200", "500", "1k", "2k", "5k", "10k", "20k"];
const EMPTY_SET = new Set<string>();

const PLOT_CONFIG: any = {
  scrollZoom: true,
  displayModeBar: true,
  modeBarButtonsToRemove: [
    "toImage",
    "zoom2d",
    "pan2d",
    "zoomIn2d",
    "zoomOut2d",
    "autoScale2d",
    "lasso2d",
    "select2d",
  ] as any[],
  displaylogo: false,
  responsive: true,
  doubleClick: "reset",
};

const formatFreq = (hz: number) => (hz >= 1000 ? `${Number((hz / 1000).toFixed(1))}k` : `${hz}`);

export const FRChart = React.memo(function FRChart({
  traces,
  enabledBands,
  hoveredBands = EMPTY_SET,
  selectedTarget,
  isCompensated,
  onChartHover,
  theme = "dark",
  onLoadSample,
  onFocusSearch,
}: Props) {
  const [xAxisRange, setXAxisRange] = useState<[number, number]>([X_MIN, X_MAX]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const hoverHzRef = useRef<number | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const pendingZoomFactorRef = useRef<number>(1);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const stepFactor = e.deltaY < 0 ? 0.86 : 1.16;
      pendingZoomFactorRef.current *= stepFactor;

      if (wheelRafRef.current !== null) return;

      wheelRafRef.current = requestAnimationFrame(() => {
        const zoomFactor = pendingZoomFactorRef.current;
        pendingZoomFactorRef.current = 1;
        wheelRafRef.current = null;

        setXAxisRange((prevRange) => {
          const currentMin = prevRange[0];
          const currentMax = prevRange[1];
          const currentWidth = currentMax - currentMin;
          let newWidth = currentWidth * zoomFactor;

          const maxWidth = X_MAX - X_MIN;
          const minWidth = 0.15;

          if (newWidth >= maxWidth) {
            return [X_MIN, X_MAX];
          }
          if (newWidth < minWidth) {
            newWidth = minWidth;
          }

          let centerLog = (currentMin + currentMax) / 2;
          if (
            hoverHzRef.current !== null &&
            hoverHzRef.current >= 20 &&
            hoverHzRef.current <= 20000
          ) {
            centerLog = Math.log10(hoverHzRef.current);
          }

          const ratio = (centerLog - currentMin) / currentWidth;
          let newMin = centerLog - ratio * newWidth;
          let newMax = centerLog + (1 - ratio) * newWidth;

          if (newMin < X_MIN) {
            newMin = X_MIN;
            newMax = X_MIN + newWidth;
          }
          if (newMax > X_MAX) {
            newMax = X_MAX;
            newMin = X_MAX - newWidth;
          }

          return [newMin, newMax];
        });
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
      if (wheelRafRef.current !== null) {
        cancelAnimationFrame(wheelRafRef.current);
      }
    };
  }, []);

  const visibleTraces = useMemo(
    () => traces.filter((t) => t.visible && t.normalized.hz.length > 0),
    [traces]
  );

  const targetObj = useMemo(
    () => TUNING_TARGETS.find((t) => t.id === selectedTarget),
    [selectedTarget]
  );

  // Calibrated theme tokens matching DESIGN.md
  const CHART_BG = theme === "light" ? "#ffffff" : "#0b0c0e";
  const GRID_COLOR = theme === "light" ? "#e7e7e2" : "#181b22";
  const TEXT_COLOR = theme === "light" ? "#374151" : "#9ca3af";
  const ZERO_COLOR = theme === "light" ? "#c7c7be" : "#262a34";
  const TARGET_COLOR = theme === "light" ? "#4b5563" : "#9ca3af";
  const LEGEND_BG = theme === "light" ? "rgba(255,255,255,0.94)" : "rgba(17,19,24,0.92)";
  const LEGEND_BORDER = theme === "light" ? "#d4d4cc" : "#262a34";
  const BORDER_COLOR = theme === "light" ? "#b8b8ae" : "#2d323e";

  // Memoize trace plotting data and dynamic Y-axis bounds
  const { plotData, yMin, yMax } = useMemo(() => {
    let minBound = isCompensated ? 40 : 30;
    let maxBound = isCompensated ? 80 : 85;
    const targetGridDb = isCompensated && targetObj ? getTargetGridDb(targetObj.id) : null;

    const data: any[] = visibleTraces.map((t) => {
      const { hz, db } = t.normalized;
      const refMean = computeRefMean(hz, db);

      let yVals: number[];
      let customData: string[] | undefined = undefined;

      if (isCompensated && targetObj) {
        const useGridLookup = targetGridDb !== null && targetGridDb.length === hz.length;
        const cData = new Array<string>(hz.length);
        yVals = new Array<number>(hz.length);

        for (let i = 0; i < hz.length; i++) {
          const traceAdjusted = db[i] - refMean;
          const targetInterp = useGridLookup
            ? targetGridDb![i]
            : interpolateTargetAtHz(targetObj, hz[i]);
          const delta = traceAdjusted - targetInterp;
          cData[i] = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
          yVals[i] = 60 + delta;
        }
        customData = cData;
      } else {
        yVals = db.map((val) => val - refMean + 60);
      }

      for (let i = 0; i < yVals.length; i++) {
        const v = yVals[i];
        if (v < minBound) minBound = Math.floor((v - 2) / 5) * 5;
        if (v > maxBound) maxBound = Math.ceil((v + 2) / 5) * 5;
      }

      const displayColor = resolveTraceColorForTheme(t.color, theme);

      return {
        x: hz,
        y: yVals,
        customdata: customData,
        type: "scatter",
        mode: "lines",
        name: t.label,
        line: { color: displayColor, width: 2.6, shape: "linear" },
        hovertemplate: isCompensated
          ? "%{customdata} dB<extra></extra>"
          : "%{y:.1f} dB<extra></extra>",
      };
    });

    return { plotData: data, yMin: minBound, yMax: maxBound };
  }, [visibleTraces, isCompensated, targetObj, theme]);

  // Memoize parameter bands and custom X-axis ticks
  const { bandLines, bandShapes, customTickVals, customTickText } = useMemo(() => {
    const activeBands = PARAMETER_BANDS.filter(
      (b) => enabledBands.has(b.id) || hoveredBands.has(b.id)
    );

    const lines: any[] = [];
    const shapes: any[] = [];
    const tickVals = [...BASE_TICK_VALS];
    const tickText = [...BASE_TICK_TEXT];

    const bandStep = Math.min(0.9, 8 / Math.max(activeBands.length, 1));

    activeBands.forEach((band, index) => {
      const isLocked = enabledBands.has(band.id);
      const yPos = yMax - index * bandStep - 0.4;
      const bandColor = band.color.replace(/[\d.]+\)$/, isLocked ? "0.9)" : "0.45)");

      lines.push({
        x: [band.freqLow, band.freqHigh],
        y: [yPos, yPos],
        type: "scatter",
        mode: "lines",
        name: band.label,
        line: { color: bandColor, width: 6 },
        hoverinfo: "skip",
        showlegend: false,
      });

      shapes.push(
        {
          type: "line",
          x0: band.freqLow,
          x1: band.freqLow,
          y0: yMin,
          y1: yPos,
          line: { color: bandColor, width: 1.25, dash: "dot" },
        },
        {
          type: "line",
          x0: band.freqHigh,
          x1: band.freqHigh,
          y0: yMin,
          y1: yPos,
          line: { color: bandColor, width: 1.25, dash: "dot" },
        }
      );

      if (isLocked) {
        const textColor = band.color.replace(/[\d.]+\)$/, "1)");
        [band.freqLow, band.freqHigh].forEach((freq) => {
          const existingIdx = tickVals.indexOf(freq);
          const styledText = `<b><span style="color:${textColor}">${formatFreq(freq)}</span></b>`;
          if (existingIdx !== -1) {
            tickText[existingIdx] = styledText;
          } else {
            tickVals.push(freq);
            tickText.push(styledText);
          }
        });
      }
    });

    return {
      bandLines: lines,
      bandShapes: shapes,
      customTickVals: tickVals,
      customTickText: tickText,
    };
  }, [enabledBands, hoveredBands, yMin, yMax]);

  // Memoize target overlay trace
  const targetTraces = useMemo(() => {
    if (!targetObj) return [];

    let targetYVals: number[];
    let targetCustomData: string[] | undefined = undefined;

    if (isCompensated) {
      targetYVals = targetObj.hz.map(() => 60);
      targetCustomData = targetObj.hz.map(() => "0.0");
    } else {
      targetYVals = targetObj.db.map((db) => db + 60);
    }

    return [
      {
        x: targetObj.hz,
        y: targetYVals,
        customdata: targetCustomData,
        type: "scatter",
        mode: "lines",
        name: `Target: ${targetObj.label}`,
        line: {
          color: TARGET_COLOR,
          width: 2.2,
          dash: "longdash",
          shape: "spline",
        },
        opacity: 0.85,
        hovertemplate: isCompensated
          ? "%{customdata} dB<extra></extra>"
          : "%{y:.1f} dB<extra></extra>",
      },
    ];
  }, [targetObj, isCompensated, TARGET_COLOR]);

  const allPlotData = useMemo(
    () => [...plotData, ...targetTraces, ...bandLines],
    [plotData, targetTraces, bandLines]
  );

  const layout = useMemo(() => {
    const yTickVals: number[] = [];
    const yTickText: string[] = [];
    for (let db = yMin; db <= yMax; db += 5) {
      yTickVals.push(db);
      if (isCompensated) {
        const delta = db - 60;
        yTickText.push(delta > 0 ? `+${delta}` : delta === 0 ? "0" : `${delta}`);
      } else {
        yTickText.push(`${db}`);
      }
    }

    return {
      shapes: bandShapes,
      showlegend: visibleTraces.length >= 2 || (visibleTraces.length >= 1 && Boolean(targetObj)),
      paper_bgcolor: CHART_BG,
      plot_bgcolor: CHART_BG,
      margin: {
        l: 54,
        r: 20,
        t: visibleTraces.length > 4 ? 38 : 26,
        b: 50,
      },
      xaxis: {
        type: "log",
        range: xAxisRange,
        fixedrange: false,
        showline: true,
        linewidth: 1,
        linecolor: BORDER_COLOR,
        mirror: "all",
        showspikes: true,
        spikemode: "across",
        spikesnap: "cursor",
        spikecolor: theme === "light" ? "#6b7280" : "#4b5563",
        spikethickness: 1,
        spikedash: "dot",
        tickvals: customTickVals,
        ticktext: customTickText,
        gridcolor: GRID_COLOR,
        zerolinecolor: GRID_COLOR,
        tickfont: {
          size: 10,
          color: TEXT_COLOR,
          family: "JetBrains Mono, ui-monospace, monospace",
        },
        title: { text: "Frequency (Hz)", font: { size: 11, color: TEXT_COLOR } },
      },
      yaxis: {
        range: [yMin, yMax],
        fixedrange: true,
        showline: true,
        linewidth: 1,
        linecolor: BORDER_COLOR,
        mirror: "all",
        tickvals: yTickVals,
        ticktext: yTickText,
        gridcolor: GRID_COLOR,
        zerolinecolor: ZERO_COLOR,
        zerolinewidth: 1,
        tickfont: {
          size: 10,
          color: TEXT_COLOR,
          family: "JetBrains Mono, ui-monospace, monospace",
        },
        title: {
          text: isCompensated ? "Delta (dB)" : "dB SPL (1 kHz = 60 dB)",
          font: { size: 11, color: TEXT_COLOR },
        },
      },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.01,
        xanchor: "right",
        x: 1,
        bgcolor: LEGEND_BG,
        bordercolor: LEGEND_BORDER,
        borderwidth: 1,
        font: { size: 10.5, color: TEXT_COLOR },
        traceorder: "normal",
      },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: theme === "light" ? "rgba(255, 255, 255, 0.96)" : "rgba(17, 19, 24, 0.96)",
        bordercolor: LEGEND_BORDER,
        font: {
          color: theme === "light" ? "#111827" : "#f3f4f6",
          size: 11,
          family: "JetBrains Mono, ui-monospace, monospace",
        },
      },
      dragmode: "pan",
    };
  }, [
    bandShapes,
    visibleTraces.length,
    targetObj,
    CHART_BG,
    xAxisRange,
    BORDER_COLOR,
    theme,
    customTickVals,
    customTickText,
    GRID_COLOR,
    TEXT_COLOR,
    yMin,
    yMax,
    ZERO_COLOR,
    isCompensated,
    LEGEND_BG,
    LEGEND_BORDER,
  ]);

  // Option 1: Interactive Empty-State Canvas when no curves or targets are active
  if (visibleTraces.length === 0 && !targetObj) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-8 select-none bg-[var(--chart-bg)]">
        <div className="w-full max-w-2xl panel p-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 13.5C4.5 13.5 5.5 6 8.2 6C11 6 12.2 18 15 18C17.5 18 18.8 10.5 22 10.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">
                  Ready for Frequency Response Analysis
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Search any Squig.link IEM/headphone database in the sidebar, paste a share URL, or
                  load a calibrated sample workspace below.
                </p>
              </div>
            </div>
          </div>

          {/* 1-Click Sample Presets */}
          {onLoadSample && (
            <div className="flex flex-col gap-2">
              <span className="label-xs">Instant Calibration Presets</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onLoadSample("ab-comparison")}
                  className="text-left p-3 rounded border border-[var(--border)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] transition-colors flex flex-col gap-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                      Load Sample A/B Comparison
                    </span>
                    <span className="tag tag-info">2 Traces + Target</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Plots Reference Studio IEM vs. Warm Harman Dynamic IEM against Harman IE 2019 v2
                    with live delta readout.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onLoadSample("channel-matching")}
                  className="text-left p-3 rounded border border-[var(--border)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] transition-colors flex flex-col gap-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors">
                      Load L/R Channel Matching Demo
                    </span>
                    <span className="tag tag-info">L vs R Delta</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Loads Left and Right coupler channels to demonstrate driver imbalance detection
                    and `L/R → Avg` merging.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Compact Instrument Workflow Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Cross-Host Search
                </span>
                {onFocusSearch && (
                  <button
                    type="button"
                    onClick={onFocusSearch}
                    className="text-[10px] font-mono text-[var(--accent-text)] hover:underline"
                  >
                    Focus Input →
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Query Super*Review, Precogvision, Jaytiss, or paste any Squig.link / `.txt` URL.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                1 kHz Norm & Targets
              </span>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Curves align at 1 kHz (60 dB). Select a Target in the top bar and toggle{" "}
                <span className="font-mono text-[var(--text-secondary)]">Δ Compensated</span>.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Keyboard Control
              </span>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Press <kbd className="font-mono text-[var(--text-secondary)]">1–9</kbd> to mute
                traces, <kbd className="font-mono text-[var(--text-secondary)]">Ctrl+Z</kbd> to
                undo, or <kbd className="font-mono text-[var(--text-secondary)]">?</kbd> for all
                shortcuts.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={chartContainerRef} className="relative w-full h-full flex flex-col bg-[var(--chart-bg)]">
      {/* Frequency Region Zoom Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs shrink-0">
        <div
          role="group"
          aria-label="Frequency range zoom presets"
          className="flex items-center gap-1 flex-wrap"
        >
          <span className="label-xs mr-1.5">Band Zoom</span>
          {ZOOM_PRESETS.map((preset) => {
            const isActive =
              Math.abs(xAxisRange[0] - preset.range[0]) < 0.01 &&
              Math.abs(xAxisRange[1] - preset.range[1]) < 0.01;
            return (
              <button
                type="button"
                key={preset.id}
                onClick={() => setXAxisRange(preset.range)}
                aria-pressed={isActive}
                className={`px-2.5 py-0.5 rounded-sm text-xs font-mono transition-colors ${
                  isActive
                    ? "bg-[var(--accent)] text-white font-semibold"
                    : "bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)] hidden md:inline">
          Scroll wheel zooms at cursor · Double-click plot to reset
        </span>
      </div>

      <div className="relative w-full flex-1 min-h-0">
        <Plot
          data={allPlotData}
          layout={layout}
          config={PLOT_CONFIG}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
          onHover={(e: any) => {
            if (e.points && e.points.length > 0) {
              const hz = e.points[0].x as number;
              hoverHzRef.current = hz;
              if (onChartHover) onChartHover(hz);
            }
          }}
          onUnhover={() => {
            hoverHzRef.current = null;
            if (onChartHover) onChartHover(null);
          }}
          onRelayout={(eventData: any) => {
            if (
              eventData["xaxis.range[0]"] !== undefined &&
              eventData["xaxis.range[1]"] !== undefined
            ) {
              let r0 = eventData["xaxis.range[0]"];
              let r1 = eventData["xaxis.range[1]"];
              if (r1 - r0 >= X_MAX - X_MIN) {
                r0 = X_MIN;
                r1 = X_MAX;
              } else {
                if (r0 < X_MIN) {
                  const diff = X_MIN - r0;
                  r0 = X_MIN;
                  r1 = Math.min(X_MAX, r1 + diff);
                }
                if (r1 > X_MAX) {
                  const diff = r1 - X_MAX;
                  r1 = X_MAX;
                  r0 = Math.max(X_MIN, r0 - diff);
                }
              }
              setXAxisRange([r0, r1]);
            } else if (eventData["xaxis.autorange"] || eventData["autosize"]) {
              setXAxisRange([X_MIN, X_MAX]);
            }
          }}
        />
      </div>
    </div>
  );
});
