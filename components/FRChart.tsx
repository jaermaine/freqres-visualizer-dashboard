"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { Trace } from "@/types/audio";
import { PARAMETER_BANDS } from "@/lib/parameterBands";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
}

const CHART_BG   = "#0d0f14";
const GRID_COLOR = "#1c2030";
const TEXT_COLOR = "#8892a4";
const ZERO_COLOR = "#2a3048";

// Standard FR chart range: 20–20 kHz on X, 30-85 dB on Y
const X_MIN = Math.log10(20);
const X_MAX = Math.log10(20000);
const Y_MIN = 30;
const Y_MAX = 85;

export function FRChart({ traces, enabledBands }: Props) {
  const visibleTraces = traces.filter((t) => t.visible && t.normalized.hz.length > 0);

  // Compute per-trace dB offset so each curve is centered around 60 dB
  // (mean dB over 1 kHz reference region 900–1100 Hz → offset to 60)
  const plotData: Plotly.Data[] = visibleTraces.map((t) => {
    // Find mean in 900–1100 Hz band for relative normalization
    const refPoints = t.normalized.hz
      .map((hz, i) => ({ hz, db: t.normalized.db[i] }))
      .filter((p) => p.hz >= 900 && p.hz <= 1100);
    const refMean =
      refPoints.length > 0
        ? refPoints.reduce((sum, p) => sum + p.db, 0) / refPoints.length
        : 0;

    return {
      x: t.normalized.hz,
      y: t.normalized.db.map((db) => db - refMean + 60),
      type: "scatter",
      mode: "lines",
      name: t.label,
      // Linear shape preserves real peaks/dips; spline hides them
      line: { color: t.color, width: 2.8, shape: "linear" },
      hovertemplate: "<b>%{data.name}</b><br>%{x:.0f} Hz<br>%{y:.1f} dB<extra></extra>",
    };
  });

  // Parameter bands as traces (for hover text)
  const activeBands = PARAMETER_BANDS.filter((b) => enabledBands.has(b.id));
  const bandTraces: Plotly.Data[] = activeBands.map((band) => {
    // Generate dummy points for 'x unified' hover mode interpolation across the whole band
    const numPoints = 10;
    const xArr: number[] = [];
    const yArr: number[] = [];
    const logMin = Math.log10(band.freqLow);
    const logMax = Math.log10(band.freqHigh);
    for (let i = 0; i <= numPoints; i++) {
      xArr.push(Math.pow(10, logMin + (logMax - logMin) * (i / numPoints)));
      yArr.push(Y_MAX - 2); // Put the hover trigger near the top
    }

    return {
      x: xArr,
      y: yArr,
      type: "scatter",
      mode: "lines",
      name: band.label,
      // Invisible line just to trigger hover text
      line: { width: 0, color: "transparent" },
      hovertemplate: `<b>${band.label}</b><extra></extra>`,
      showlegend: false,
      hoverinfo: "text",
    };
  });

  const bandShapes: Partial<Plotly.Shape>[] = activeBands.map((band) => ({
    type: "rect",
    xref: "x",
    yref: "paper",
    x0: Math.log10(band.freqLow),
    x1: Math.log10(band.freqHigh),
    y0: 0,
    y1: 1,
    fillcolor: band.color,
    line: { width: 0 },
    layer: "below",
  }));

  const allPlotData = [...plotData, ...bandTraces];

  const layout: Partial<Plotly.Layout> = {
    shapes: bandShapes,
    paper_bgcolor: CHART_BG,
    plot_bgcolor: CHART_BG,
    margin: { l: 56, r: 20, t: 28, b: 52 },

    xaxis: {
      type: "log",
      // Lock to 20–20 kHz — prevent zooming past the useful range
      range: [X_MIN, X_MAX],
      fixedrange: true,
      tickvals: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000],
      ticktext: ["20", "50", "100", "200", "500", "1k", "2k", "5k", "10k", "20k"],
      gridcolor: GRID_COLOR,
      zerolinecolor: GRID_COLOR,
      tickfont: { size: 10, color: TEXT_COLOR },
      title: { text: "Frequency (Hz)", font: { size: 11, color: TEXT_COLOR } },
    },

    yaxis: {
      // Fixed 30-85 dB window
      range: [Y_MIN, Y_MAX],
      fixedrange: true,
      dtick: 5,           // 5 dB grid lines
      gridcolor: GRID_COLOR,
      zerolinecolor: ZERO_COLOR,
      zerolinewidth: 1.5,
      tickfont: { size: 10, color: TEXT_COLOR },
      title: { text: "dB SPL", font: { size: 11, color: TEXT_COLOR } },
    },

    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "right",
      x: 1,
      bgcolor: "rgba(13,15,20,0.85)",
      bordercolor: "#252b3a",
      borderwidth: 1,
      font: { size: 11, color: TEXT_COLOR },
    },

    hovermode: "x unified",
    // No drag zoom — chart is already constrained to 20–20 kHz
    dragmode: false,
  };

  const config: Partial<Plotly.Config> = {
    // Scroll zoom disabled — prevents infinite zoom
    scrollZoom: false,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      "zoom2d", "pan2d", "zoomIn2d", "zoomOut2d",
      "autoScale2d", "lasso2d", "select2d",
    ] as Plotly.ModeBarDefaultButtons[],
    displaylogo: false,
    responsive: true,
    // Double-click resets to the fixed range
    doubleClick: "reset",
    toImageButtonOptions: {
      format: "png",
      filename: visibleTraces.length === 1 
        ? `${visibleTraces[0].label} Frequency Response` 
        : `${visibleTraces.map(t => t.label).join("|")} A|B Comparison`,
    },
  };

  if (visibleTraces.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: "var(--text-muted)" }}
      >
        <Image src="/logo.png" alt="FreqRes Logo" width={48} height={48} className="opacity-30 grayscale" />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          No frequency response curves loaded
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          Paste a raw measurement file URL (.txt / .csv / .tsv) in the sidebar and click{" "}
          <strong>Import</strong>. Graph page URLs show metadata only.
        </p>
      </div>
    );
  }
  return (
    <Plot
      data={allPlotData}
      layout={layout}
      config={config}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
