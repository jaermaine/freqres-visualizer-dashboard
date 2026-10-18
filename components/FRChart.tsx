"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Trace } from "@/types/audio";
import { PARAMETER_BANDS } from "@/lib/parameterBands";
import { TUNING_TARGETS, getTargetGridDb, interpolateTargetAtHz } from "@/lib/targets";
import { computeRefMean } from "@/lib/parseMeasurementFile";

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

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  hoveredBands?: Set<string>;
  selectedTarget?: string;
  isCompensated?: boolean;
  onChartHover?: (hz: number | null) => void;
  theme?: "dark" | "light";
}

// Standard FR chart range: 20–20 kHz on X
const X_MIN = Math.log10(20);
const X_MAX = Math.log10(20000);

const ZOOM_PRESETS = [
  { id: "full", label: "Full (20-20k)", range: [X_MIN, X_MAX] as [number, number] },
  { id: "bass", label: "Bass (20-300Hz)", range: [Math.log10(20), Math.log10(300)] as [number, number] },
  { id: "mids", label: "Mids (300-3k)", range: [Math.log10(300), Math.log10(3000)] as [number, number] },
  { id: "treble", label: "Treble (3k-20k)", range: [Math.log10(3000), Math.log10(20000)] as [number, number] },
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
}: Props) {
  const [xAxisRange, setXAxisRange] = useState<[number, number]>([X_MIN, X_MAX]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const hoverHzRef = useRef<number | null>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.18;
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
        if (hoverHzRef.current !== null && hoverHzRef.current >= 20 && hoverHzRef.current <= 20000) {
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
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
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

  // Theme-aware colors
  const CHART_BG = theme === "light" ? "#f8fafc" : "#0d0f14";
  const GRID_COLOR = theme === "light" ? "#e2e8f0" : "#1c2030";
  const TEXT_COLOR = theme === "light" ? "#1e293b" : "#8892a4";
  const ZERO_COLOR = theme === "light" ? "#94a3b8" : "#2a3048";
  const TARGET_COLOR = theme === "light" ? "#64748b" : "#aebbc9";
  const LEGEND_BG = theme === "light" ? "rgba(255,255,255,0.92)" : "rgba(13,15,20,0.85)";
  const LEGEND_BORDER = theme === "light" ? "#cbd5e1" : "#252b3a";
  const BORDER_COLOR = theme === "light" ? "#94a3b8" : "#2e364f";

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

      return {
        x: hz,
        y: yVals,
        customdata: customData,
        type: "scatter",
        mode: "lines",
        name: t.label,
        line: { color: t.color, width: 2.8, shape: "linear" },
        hovertemplate: isCompensated
          ? "%{customdata} dB<extra></extra>"
          : "%{y:.1f} dB<extra></extra>",
      };
    });

    return { plotData: data, yMin: minBound, yMax: maxBound };
  }, [visibleTraces, isCompensated, targetObj]);

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
    const refHzArr = visibleTraces.length > 0 ? visibleTraces[0].normalized.hz : null;

    activeBands.forEach((band, index) => {
      const isLocked = enabledBands.has(band.id);
      const yPos = yMax - index * bandStep - 0.4;
      const bandColor = band.color.replace(/[\d.]+\)$/, isLocked ? "0.9)" : "0.4)");

      let xVals = [band.freqLow, band.freqHigh];
      if (refHzArr) {
        const insidePoints = refHzArr.filter((hz) => hz > band.freqLow && hz < band.freqHigh);
        xVals = [band.freqLow, ...insidePoints, band.freqHigh];
      }
      const yVals = xVals.map(() => yPos);

      lines.push({
        x: xVals,
        y: yVals,
        type: "scatter",
        mode: "lines",
        name: band.label,
        line: { color: bandColor, width: 7 },
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
          line: { color: bandColor, width: 1.5, dash: "dot" },
        },
        {
          type: "line",
          x0: band.freqHigh,
          x1: band.freqHigh,
          y0: yMin,
          y1: yPos,
          line: { color: bandColor, width: 1.5, dash: "dot" },
        }
      );

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
    });

    return {
      bandLines: lines,
      bandShapes: shapes,
      customTickVals: tickVals,
      customTickText: tickText,
    };
  }, [enabledBands, hoveredBands, yMin, yMax, visibleTraces]);

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
          width: 3,
          dash: "longdash",
          shape: "spline",
        },
        opacity: 0.8,
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
      showlegend: visibleTraces.length >= 2,
      paper_bgcolor: CHART_BG,
      plot_bgcolor: CHART_BG,
      margin: {
        l: 56,
        r: 20,
        t: visibleTraces.length > 4 ? 40 : 28,
        b: 52,
      },
      xaxis: {
        type: "log",
        range: xAxisRange,
        fixedrange: false,
        showline: true,
        linewidth: 1.5,
        linecolor: BORDER_COLOR,
        mirror: "all",
        showspikes: true,
        spikemode: "across",
        spikesnap: "cursor",
        spikecolor: theme === "light" ? "#64748b" : "#475569",
        spikethickness: 1.5,
        spikedash: "dash",
        tickvals: customTickVals,
        ticktext: customTickText,
        gridcolor: GRID_COLOR,
        zerolinecolor: GRID_COLOR,
        tickfont: { size: 10, color: TEXT_COLOR },
        title: { text: "Frequency (Hz)", font: { size: 11, color: TEXT_COLOR } },
      },
      yaxis: {
        range: [yMin, yMax],
        fixedrange: true,
        showline: true,
        linewidth: 1.5,
        linecolor: BORDER_COLOR,
        mirror: "all",
        tickvals: yTickVals,
        ticktext: yTickText,
        gridcolor: GRID_COLOR,
        zerolinecolor: ZERO_COLOR,
        zerolinewidth: 1.5,
        tickfont: { size: 10, color: TEXT_COLOR },
        title: {
          text: isCompensated ? "Delta (dB)" : "dB SPL",
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
        bgcolor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
        bordercolor: theme === "light" ? "#cbd5e1" : "#334155",
        font: {
          color: theme === "light" ? "#0f172a" : "#f8fafc",
          size: 11,
        },
      },
      dragmode: "pan",
    };
  }, [
    bandShapes,
    visibleTraces.length,
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

  if (visibleTraces.length === 0 && !targetObj) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="text-4xl opacity-30">〰</div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          No frequency response curves loaded
        </p>
        <p
          className="text-xs text-center max-w-xs"
          style={{ color: "var(--text-muted)", lineHeight: 1.7 }}
        >
          Paste a graph page URL (e.g. squig.link) or a raw measurement file link in the sidebar and
          click <strong>Import</strong>.
        </p>
      </div>
    );
  }

  return (
    <div ref={chartContainerRef} className="relative w-full h-full flex flex-col">
      {/* Zoom to Region Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b text-xs shrink-0 ${
          theme === "light"
            ? "bg-slate-100 border-slate-200 text-slate-700"
            : "bg-[#151923] border-slate-800 text-slate-300"
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[11px] tracking-wider uppercase opacity-70 mr-1">
            Zoom:
          </span>
          {ZOOM_PRESETS.map((preset) => {
            const isActive =
              Math.abs(xAxisRange[0] - preset.range[0]) < 0.01 &&
              Math.abs(xAxisRange[1] - preset.range[1]) < 0.01;
            return (
              <button
                key={preset.id}
                onClick={() => setXAxisRange(preset.range)}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : theme === "light"
                    ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] opacity-60 hidden md:inline">
          Use mouse scroll wheel to zoom
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
