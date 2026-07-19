"use client";

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
}

const CHART_BG   = "#0d0f14";
const GRID_COLOR = "#1c2030";
const TEXT_COLOR = "#8892a4";
const ZERO_COLOR = "#2a3048";

// Standard FR chart range: 20–20 kHz on X
const X_MIN = Math.log10(20);
const X_MAX = Math.log10(20000);

export function FRChart({ traces, enabledBands, hoveredBands = new Set(), selectedTarget, isCompensated, onChartHover }: Props) {
  const visibleTraces = traces.filter((t) => t.visible && t.normalized.hz.length > 0);
  const targetObj = TUNING_TARGETS.find(t => t.id === selectedTarget);

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
        ? "<b>%{data.name}</b><br>%{x:.0f} Hz<br>%{customdata} dB<extra></extra>"
        : "<b>%{data.name}</b><br>%{x:.0f} Hz<br>%{y:.1f} dB<extra></extra>",
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
      hoverinfo: "text",
      hovertemplate: `<b>${band.label}</b>${!isLocked ? " <span style='font-size:10px;color:#8892a4'>(Click to lock)</span>" : ""}<extra></extra>`,
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
        color: "#aebbc9",
        width: 3,
        dash: "longdash",
        shape: "spline",
      },
      opacity: 0.8,
      hovertemplate: isCompensated
        ? `<b>${targetObj.label}</b><br>%{x:.0f} Hz<br>%{customdata} dB<extra></extra>`
        : `<b>${targetObj.label}</b><br>%{x:.0f} Hz<br>%{y:.1f} dB<extra></extra>`,
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
      // Lock to 20–20 kHz — prevent zooming past the useful range
      range: [X_MIN, X_MAX],
      fixedrange: true,
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
      bgcolor: "rgba(13,15,20,0.85)",
      bordercolor: "#252b3a",
      borderwidth: 1,
      font: { size: 11, color: TEXT_COLOR },
    },

    hovermode: "x",
    // No drag zoom — chart is already constrained to 20–20 kHz
    dragmode: false,
  };

  const config: any = {
    // Scroll zoom disabled — prevents infinite zoom
    scrollZoom: false,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      "zoom2d", "pan2d", "zoomIn2d", "zoomOut2d",
      "autoScale2d", "lasso2d", "select2d",
    ] as any[],
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
    <Plot
      data={allPlotData}
      layout={layout}
      config={config}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
      onHover={(e) => {
        if (e.points && e.points.length > 0 && onChartHover) {
          onChartHover(e.points[0].x as number);
        }
      }}
      onUnhover={() => {
        if (onChartHover) onChartHover(null);
      }}
    />
  );
}
