import React, { useState, useMemo } from "react";
import type { Trace } from "@/types/audio";
import { TUNING_TARGETS, interpolateTargetAtHz } from "@/lib/targets";
import { computeRefMean, interpolateLogHz } from "@/lib/parseMeasurementFile";

interface Props {
  traces: Trace[];
  theme?: "dark" | "light";
  isCompensated?: boolean;
  selectedTarget?: string;
}

const COMPARE_FREQUENCIES = [20, 100, 1000, 3000, 5000, 10000] as const;

export const DifferenceTable = React.memo(function DifferenceTable({
  traces,
  theme = "dark",
  isCompensated,
  selectedTarget,
}: Props) {
  const [isSwapped, setIsSwapped] = useState(false);

  const visibleTraces = useMemo(() => traces.filter((t) => t.visible), [traces]);
  const targetObj = useMemo(
    () => TUNING_TARGETS.find((t) => t.id === selectedTarget),
    [selectedTarget]
  );

  const isValid = visibleTraces.length === 2;
  const traceA = isValid ? (isSwapped ? visibleTraces[1] : visibleTraces[0]) : null;
  const traceB = isValid ? (isSwapped ? visibleTraces[0] : visibleTraces[1]) : null;

  const { compareData, isChannelMatching, maxImbalance } = useMemo(() => {
    const evaluateTraceAtFreqs = (trace: Trace | null): (number | null)[] => {
      if (!trace || !trace.normalized.hz || trace.normalized.hz.length === 0) {
        return COMPARE_FREQUENCIES.map(() => null);
      }
      const { hz, db } = trace.normalized;
      // Compute 900–1100 Hz reference mean ONCE per trace instead of 6 times
      const refMean = computeRefMean(hz, db);

      return COMPARE_FREQUENCIES.map((targetHz) => {
        const rawDb = interpolateLogHz(hz, db, targetHz);
        let adjustedDb = rawDb - refMean;
        if (isCompensated && targetObj) {
          adjustedDb -= interpolateTargetAtHz(targetObj, targetHz);
        } else {
          adjustedDb += 60;
        }
        return adjustedDb;
      });
    };

    const valsA = evaluateTraceAtFreqs(traceA);
    const valsB = evaluateTraceAtFreqs(traceB);

    const rows = COMPARE_FREQUENCIES.map((freq, idx) => {
      const valA = valsA[idx];
      const valB = valsB[idx];
      const delta = valA !== null && valB !== null ? valA - valB : null;
      return { freq, valA, valB, delta };
    });

    const channelMatch =
      isValid &&
      !!traceA &&
      !!traceB &&
      ((traceA.channel === "L" && traceB.channel === "R") ||
        (traceA.channel === "R" && traceB.channel === "L") ||
        (traceA.label.includes("(L)") && traceB.label.includes("(R)")) ||
        (traceA.label.includes("(R)") && traceB.label.includes("(L)")));

    const maxImb = channelMatch
      ? Math.max(...rows.map((d) => (d.delta !== null ? Math.abs(d.delta) : 0)))
      : 0;

    return {
      compareData: rows,
      isChannelMatching: channelMatch,
      maxImbalance: maxImb,
    };
  }, [traceA, traceB, isValid, isCompensated, targetObj]);

  return (
    <div
      className={`mt-4 rounded-lg overflow-hidden border transition-colors relative ${
        theme === "light" ? "border-slate-200 bg-white" : "border-slate-800 bg-[#0d0f14]"
      }`}
    >
      <div
        className={`px-4 py-2 border-b text-sm font-semibold flex items-center justify-between flex-wrap gap-2 ${
          theme === "light"
            ? "bg-slate-50 border-slate-200 text-slate-800"
            : "bg-[#151923] border-slate-800 text-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span>
            {isChannelMatching
              ? "Channel Imbalance & Matching Table (L vs R)"
              : "A/B Comparison Table"}
          </span>
          {isChannelMatching && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Channel Matching
            </span>
          )}
          {isChannelMatching && maxImbalance > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-300">
              Max Imbalance: {maxImbalance.toFixed(1)} dB
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isValid && (
            <button
              onClick={() => setIsSwapped(!isSwapped)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                theme === "light"
                  ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
              title="Swap Trace A and Trace B"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 14 20 9 15 4"></polyline>
                <line x1="4" y1="9" x2="20" y2="9"></line>
                <polyline points="9 10 4 15 9 20"></polyline>
                <line x1="20" y1="15" x2="4" y2="15"></line>
              </svg>
              Swap A/B
            </button>
          )}
          <span className="text-xs font-normal opacity-70">Delta = A - B</span>
        </div>
      </div>

      {!isValid ? (
        <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
          <div
            className={`px-4 py-2.5 rounded-lg text-xs font-medium border ${
              theme === "light"
                ? "bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] shadow-sm"
            }`}
          >
            <span className="font-semibold text-[var(--text-primary)]">A/B Comparison Table: </span>
            Please select exactly 2 visible traces in the sidebar to compare frequency response
            delta. (Currently active: {visibleTraces.length})
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead
              className={`text-xs uppercase ${
                theme === "light"
                  ? "text-slate-500 bg-slate-50 border-b border-slate-200"
                  : "text-slate-400 bg-[#151923] border-b border-slate-800"
              }`}
            >
              <tr>
                <th className="px-4 py-3 font-medium w-1/4">Freq (Hz)</th>
                <th className="px-4 py-3 font-medium w-1/4">
                  {traceA ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: traceA.color }}
                      ></div>
                      <span className="truncate max-w-[150px]" title={traceA.label}>
                        {traceA.label} (A)
                      </span>
                    </div>
                  ) : (
                    <span className="opacity-50">Trace A</span>
                  )}
                </th>
                <th className="px-4 py-3 font-medium w-1/4">
                  {traceB ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: traceB.color }}
                      ></div>
                      <span className="truncate max-w-[150px]" title={traceB.label}>
                        {traceB.label} (B)
                      </span>
                    </div>
                  ) : (
                    <span className="opacity-50">Trace B</span>
                  )}
                </th>
                <th className="px-4 py-3 font-medium text-right w-1/4">Delta (dB)</th>
              </tr>
            </thead>
            <tbody
              className={
                theme === "light" ? "divide-y divide-slate-100" : "divide-y divide-slate-800/50"
              }
            >
              {compareData.map((row) => (
                <tr
                  key={row.freq}
                  className={`transition-colors ${
                    theme === "light" ? "hover:bg-slate-50" : "hover:bg-slate-800/20"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium">
                    {row.freq >= 1000 ? `${row.freq / 1000}k` : row.freq}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.valA !== null
                      ? isCompensated
                        ? row.valA > 0
                          ? `+${row.valA.toFixed(1)}`
                          : row.valA.toFixed(1)
                        : row.valA.toFixed(1)
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.valB !== null
                      ? isCompensated
                        ? row.valB > 0
                          ? `+${row.valB.toFixed(1)}`
                          : row.valB.toFixed(1)
                        : row.valB.toFixed(1)
                      : "-"}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-medium ${
                      row.delta === null
                        ? ""
                        : row.delta > 2
                        ? "text-red-400"
                        : row.delta < -2
                        ? "text-blue-400"
                        : theme === "light"
                        ? "text-slate-600"
                        : "text-slate-300"
                    }`}
                  >
                    {row.delta !== null
                      ? row.delta > 0
                        ? `+${row.delta.toFixed(1)}`
                        : row.delta.toFixed(1)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
