"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Trace } from "@/types/audio";
import { PARAMETER_BANDS } from "@/lib/parameterBands";
import { TUNING_TARGETS } from "@/lib/targets";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  hoveredBands?: Set<string>;
  selectedTarget?: string;
  isCompensated?: boolean;
  onChartHover?: (hz: number | null) => void;
  theme?: 'dark' | 'light';
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

export function FRChart({ traces, enabledBands, hoveredBands = new Set(), selectedTarget, isCompensated, onChartHover, theme = 'dark' }: Props) {
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

  const visibleTraces = traces.filter((t) => t.visible && t.normalized.hz.length > 0);
  const targetObj = TUNING_TARGETS.find(t => t.id === selectedTarget);

  // Theme-aware colors
  const CHART_BG   = theme === 'light' ? "#f8fafc" : "#0d0f14";
  const GRID_COLOR = theme === 'light' ? "#e2e8f0" : "#1c2030";
  const TEXT_COLOR = theme === 'light' ? "#1e293b" : "#8892a4";
  const ZERO_COLOR = theme === 'light' ? "#94a3b8" : "#2a3048";
  const TARGET_COLOR = theme === 'light' ? "#64748b" : "#aebbc9";
  const LEGEND_BG = theme === 'light' ? "rgba(255,255,255,0.92)" : "rgba(13,15,20,0.85)";
  const LEGEND_BORDER = theme === 'light' ? "#cbd5e1" : "#252b3a";
  const BORDER_COLOR = theme === 'light' ? "#94a3b8" : "#2e364f";

  // Log-linear interpolation for precise target dB matching at arbitrary frequencies
  const interpolateTarget = (hz: number): number => {
    if (!targetObj) return 0;
    const { hz: tHz, db: tDb } = targetObj;
    if (hz <= tHz[0]) return tDb[0];
    if (hz >= tHz[tHz.length - 1]) return tDb[tDb.length - 1];
    for (let i = 0; i < tHz.length - 1; i++) {
      if (hz >= tHz[i] && hz <= tHz[i + 1]) {
        const logHz = Math.log10(hz);
        const logH0 = Math.log10(tHz[i]);
        const logH1 = Math.log10(tHz[i + 1]);
        const t = (logHz - logH0) / (logH1 - logH0);
        return tDb[i] + t * (tDb[i + 1] - tDb[i]);
      }
    }
    return 0;
  };

  // Base range: standard is 30-85, compensated defaults to 40-80 (+/- 20 dB) but will auto-expand if needed
  let yMin = isCompensated ? 40 : 30;
  let yMax = isCompensated ? 80 : 85;

  // Compute per-trace dB offset so each curve is centered around 60 dB
  // (mean dB over 1 kHz reference region 900–1100 Hz → offset to 60)
  const plotData: any[] = visibleTraces.map((t) => {
    // Find mean in 900–1100 Hz band for relative normalization
    const refPoints = t.normalized.hz
      .map((hz, i) => ({ hz, db: t.normalized.db[i] }))
      .filter((p) => p.hz >= 900 && p.hz <= 1100);
    const refMean =
      refPoints.length > 0
        ? refPoints.reduce((sum, p) => sum + p.db, 0) / refPoints.length
        : 0;

    let yVals = t.normalized.db.map((db) => db - refMean + 60);
    let customData: any[] | undefined = undefined;

    // Apply Compensation (Delta plotting) if enabled
    if (isCompensated && targetObj) {
      const cData: any[] = [];
      yVals = t.normalized.hz.map((hz, i) => {
        const traceAdjusted = t.normalized.db[i] - refMean;
        const targetInterp = interpolateTarget(hz);
        const delta = traceAdjusted - targetInterp;
        cData.push(delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1));
        return 60 + delta;
      });
      customData = cData;
    }

    return {
      x: t.normalized.hz,
      y: yVals,
      customdata: customData,
      type: "scatter",
      mode: "lines",
      name: t.label,
      // Linear shape preserves real peaks/dips; spline hides them
      line: { color: t.color, width: 2.8, shape: "linear" },
      hovertemplate: isCompensated
        ? "%{customdata} dB<extra></extra>"
        : "%{y:.1f} dB<extra></extra>",
    };
  });

  // Auto-expand Y-axis bounds to prevent clipping extreme deviations (like -26dB dips)
  plotData.forEach((trace) => {
    if (trace.y && trace.y.length > 0) {
      const traceMin = Math.min(...trace.y);
      const traceMax = Math.max(...trace.y);
      if (traceMin < yMin) yMin = Math.floor((traceMin - 2) / 5) * 5;
      if (traceMax > yMax) yMax = Math.ceil((traceMax + 2) / 5) * 5;
    }
  });

  const activeBands = PARAMETER_BANDS.filter((b) => enabledBands.has(b.id) || hoveredBands.has(b.id));

  const bandLines: any[] = [];
  const bandShapes: any[] = [];

  const baseTickVals = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const baseTickText = ["20", "50", "100", "200", "500", "1k", "2k", "5k", "10k", "20k"];
  const customTickVals = [...baseTickVals];
  const customTickText = [...baseTickText];

  const formatFreq = (hz: number) => hz >= 1000 ? `${Number((hz / 1000).toFixed(1))}k` : `${hz}`;

  // Parameter bands as thick horizontal traces stacked at the top of the graph
  activeBands.forEach((band, index) => {
    const isLocked = enabledBands.has(band.id);
    const yPos = yMax - (index * 1.5) - 0.5; // Stack from (yMax - 0.5) downwards
    const bandColor = band.color.replace(/[\d.]+\)$/, isLocked ? '0.9)' : '0.4)'); // visual distinction

    let xVals = [band.freqLow, band.freqHigh];
    if (visibleTraces.length > 0) {
      const hzArr = visibleTraces[0].normalized.hz;
      const insidePoints = hzArr.filter(hz => hz > band.freqLow && hz < band.freqHigh);
      xVals = [band.freqLow, ...insidePoints, band.freqHigh];
    }
    const yVals = xVals.map(() => yPos);

    bandLines.push({
      x: xVals,
      y: yVals,
      type: "scatter",
      mode: "lines",
      name: band.label,
      line: {
        color: bandColor,
        width: 10,
      },
      hoverinfo: "skip",
      showlegend: false, // hide from legend
    });

    // Vertical line at freqLow
    bandShapes.push({
      type: "line",
      x0: band.freqLow,
      x1: band.freqLow,
      y0: yMin,
      y1: yPos,
      line: {
        color: bandColor,
        width: 1.5,
        dash: "dot",
      },
    });

    // Vertical line at freqHigh
    bandShapes.push({
      type: "line",
      x0: band.freqHigh,
      x1: band.freqHigh,
      y0: yMin,
      y1: yPos,
      line: {
        color: bandColor,
        width: 1.5,
        dash: "dot",
      },
    });

    // Highlight on X axis
    const textColor = band.color.replace(/[\d.]+\)$/, '1)');
    [band.freqLow, band.freqHigh].forEach(freq => {
      const existingIdx = customTickVals.indexOf(freq);
      const styledText = `<b><span style="color:${textColor}">${formatFreq(freq)}</span></b>`;
      if (existingIdx !== -1) {
        customTickText[existingIdx] = styledText;
      } else {
        customTickVals.push(freq);
        customTickText.push(styledText);
      }
    });
  });

  const targetTraces: any[] = [];
  if (targetObj) {
    let targetYVals = targetObj.db.map(db => db + 60);
    let targetCustomData: any[] | undefined = undefined;
    
    if (isCompensated) {
      // Flatten target into a perfect 60dB line
      targetYVals = targetObj.hz.map(() => 60);
      targetCustomData = targetObj.hz.map(() => "0.0");
    }

    targetTraces.push({
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
    });
  }

  const allPlotData = [...plotData, ...targetTraces, ...bandLines];

  // Generate Y axis ticks and labels based on compensation state
  const yTickVals = [];
  const yTickText = [];
  for (let db = yMin; db <= yMax; db += 5) {
    yTickVals.push(db);
    if (isCompensated) {
      const delta = db - 60;
      yTickText.push(delta > 0 ? `+${delta}` : delta === 0 ? `0` : `${delta}`);
    } else {
      yTickText.push(`${db}`);
    }
  }

  const layout: any = {
    shapes: bandShapes,
    showlegend: visibleTraces.length >= 2, // only show legend if at least 2 graphs
    paper_bgcolor: CHART_BG,
    plot_bgcolor: CHART_BG,
    margin: { l: 56, r: 20, t: 28, b: 52 },

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
      spikecolor: theme === 'light' ? "#64748b" : "#475569",
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
      fixedrange: true, // Fixed Y-axis scale to prevent vertical unreadable distortion
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
      title: { text: isCompensated ? "Delta (dB)" : "dB SPL", font: { size: 11, color: TEXT_COLOR } },
    },

    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "right",
      x: 1,
      bgcolor: LEGEND_BG,
      bordercolor: LEGEND_BORDER,
      borderwidth: 1,
      font: { size: 11, color: TEXT_COLOR },
    },

    hovermode: "x unified",
    hoverlabel: {
      bgcolor: theme === 'light' ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
      bordercolor: theme === 'light' ? "#cbd5e1" : "#334155",
      font: {
        color: theme === 'light' ? "#0f172a" : "#f8fafc",
        size: 11,
      },
    },
    // Allow pan/zoom on touch devices
    dragmode: "pan",
  };

  const config: any = {
    // Enable scroll zoom for pinch-to-zoom on mobile
    scrollZoom: true,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      "toImage", // Feature 1: disable default Plotly camera
      "zoom2d", "pan2d", "zoomIn2d", "zoomOut2d",
      "autoScale2d", "lasso2d", "select2d",
    ] as any[],
    displaylogo: false,
    responsive: true,
    // Double-click resets to the fixed range
    doubleClick: "reset",
  };

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
        <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          Paste a graph page URL (e.g. squig.link) or a raw measurement file link in the sidebar and click{" "}
          <strong>Import</strong>.
        </p>
      </div>
    );
  }
  return (
    <div ref={chartContainerRef} className="relative w-full h-full flex flex-col">
      {/* Zoom to Region Toolbar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b text-xs shrink-0 ${
        theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#151923] border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[11px] tracking-wider uppercase opacity-70 mr-1">Zoom:</span>
          {ZOOM_PRESETS.map((preset) => {
            const isActive = Math.abs(xAxisRange[0] - preset.range[0]) < 0.01 && Math.abs(xAxisRange[1] - preset.range[1]) < 0.01;
            return (
              <button
                key={preset.id}
                onClick={() => setXAxisRange(preset.range)}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : theme === 'light'
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] opacity-60 hidden md:inline">Use mouse scroll wheel to zoom</span>
      </div>

      <div className="relative w-full flex-1 min-h-0">
        <Plot
          data={allPlotData}
          layout={layout}
          config={config}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
          onHover={(e) => {
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
            if (eventData["xaxis.range[0]"] !== undefined && eventData["xaxis.range[1]"] !== undefined) {
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
}
