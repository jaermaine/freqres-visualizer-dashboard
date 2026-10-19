import React, { useState, useMemo, useEffect } from "react";
import type { Trace } from "@/types/audio";
import { TUNING_TARGETS, interpolateTargetAtHz } from "@/lib/targets";
import { computeRefMean, interpolateLogHz } from "@/lib/parseMeasurementFile";
import { resolveTraceColorForTheme } from "@/lib/colors";

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
  const [selectedIdA, setSelectedIdA] = useState<string>("");
  const [selectedIdB, setSelectedIdB] = useState<string>("");

  const visibleTraces = useMemo(() => traces.filter((t) => t.visible), [traces]);
  const targetObj = useMemo(
    () => TUNING_TARGETS.find((t) => t.id === selectedTarget),
    [selectedTarget]
  );

  // Keep selected Trace A and Trace B synchronized with visible traces
  useEffect(() => {
    if (visibleTraces.length < 2) return;
    const hasA = visibleTraces.some((t) => t.id === selectedIdA);
    const hasB = visibleTraces.some((t) => t.id === selectedIdB);

    if (!hasA || !hasB || selectedIdA === selectedIdB) {
      setSelectedIdA(visibleTraces[0].id);
      setSelectedIdB(visibleTraces[1].id);
    }
  }, [visibleTraces, selectedIdA, selectedIdB]);

  const isValid = visibleTraces.length >= 2;
  const traceA = isValid
    ? visibleTraces.find((t) => t.id === selectedIdA) || visibleTraces[0]
    : null;
  const traceB = isValid
    ? visibleTraces.find((t) => t.id === selectedIdB && t.id !== traceA?.id) ||
      visibleTraces.find((t) => t.id !== traceA?.id) ||
      visibleTraces[1]
    : null;

  const handleSwap = () => {
    if (!traceA || !traceB) return;
    setSelectedIdA(traceB.id);
    setSelectedIdB(traceA.id);
  };

  const { compareData, isChannelMatching, maxImbalance } = useMemo(() => {
    const evaluateTraceAtFreqs = (trace: Trace | null): (number | null)[] => {
      if (!trace || !trace.normalized.hz || trace.normalized.hz.length === 0) {
        return COMPARE_FREQUENCIES.map(() => null);
      }
      const { hz, db } = trace.normalized;
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

  if (visibleTraces.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="A/B Frequency Response Delta Table"
      className="mt-3 panel overflow-hidden"
    >
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-semibold flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-primary)]">
            {isChannelMatching
              ? "L/R Channel Matching & Imbalance"
              : "A/B Frequency Delta Matrix"}
          </span>
          {isChannelMatching && (
            <span className="tag tag-info">
              Channel Match
            </span>
          )}
          {isChannelMatching && maxImbalance > 0 && (
            <span
              className={`tag tabular-nums ${
                maxImbalance > 1.5 ? "tag-warn" : "tag-ok"
              }`}
            >
              Max Variance: {maxImbalance.toFixed(1)} dB
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isValid && (
            <button
              type="button"
              onClick={handleSwap}
              className="btn-ghost py-0.5 px-2 text-xs font-mono inline-flex items-center gap-1.5"
              title="Swap Reference Trace A and Comparison Trace B"
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
                <polyline points="15 14 20 9 15 4" />
                <line x1="4" y1="9" x2="20" y2="9" />
                <polyline points="9 10 4 15 9 20" />
                <line x1="20" y1="15" x2="4" y2="15" />
              </svg>
              Swap A/B
            </button>
          )}
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Δ = A − B ({isCompensated ? "Target Rel." : "dB SPL"})
          </span>
        </div>
      </div>

      {!isValid ? (
        <div className="px-4 py-3 flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)]">
          <span>
            Enable or import at least <strong>2 visible traces</strong> (or click{" "}
            <span className="font-mono text-[var(--accent-text)]">Avg→L/R</span> on the current
            trace) to compute A/B decibel deltas.
          </span>
          <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums">
            {visibleTraces.length}/2 active
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left font-mono tabular-nums">
            <thead className="text-[11px] uppercase bg-[var(--bg-base)] border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2 font-semibold w-1/4">Freq (Hz)</th>
                <th className="px-4 py-2 font-semibold w-1/4">
                  {traceA && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{
                          backgroundColor: resolveTraceColorForTheme(traceA.color, theme),
                        }}
                      />
                      {visibleTraces.length > 2 ? (
                        <select
                          aria-label="Select Trace A"
                          value={traceA.id}
                          onChange={(e) => setSelectedIdA(e.target.value)}
                          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xs px-1.5 py-0.5 text-xs font-sans font-semibold text-[var(--text-primary)] max-w-[180px] truncate outline-none"
                        >
                          {visibleTraces.map((t) => (
                            <option key={t.id} value={t.id} disabled={t.id === traceB?.id}>
                              {t.label} (A)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="truncate max-w-[170px] font-sans font-semibold text-[var(--text-primary)]"
                          title={traceA.label}
                        >
                          {traceA.label} (A)
                        </span>
                      )}
                    </div>
                  )}
                </th>
                <th className="px-4 py-2 font-semibold w-1/4">
                  {traceB && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{
                          backgroundColor: resolveTraceColorForTheme(traceB.color, theme),
                        }}
                      />
                      {visibleTraces.length > 2 ? (
                        <select
                          aria-label="Select Trace B"
                          value={traceB.id}
                          onChange={(e) => setSelectedIdB(e.target.value)}
                          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xs px-1.5 py-0.5 text-xs font-sans font-semibold text-[var(--text-primary)] max-w-[180px] truncate outline-none"
                        >
                          {visibleTraces.map((t) => (
                            <option key={t.id} value={t.id} disabled={t.id === traceA?.id}>
                              {t.label} (B)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="truncate max-w-[170px] font-sans font-semibold text-[var(--text-primary)]"
                          title={traceB.label}
                        >
                          {traceB.label} (B)
                        </span>
                      )}
                    </div>
                  )}
                </th>
                <th className="px-4 py-2 font-semibold text-right w-1/4">Delta (dB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {compareData.map((row) => (
                <tr
                  key={row.freq}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="px-4 py-2 font-semibold text-[var(--text-primary)]">
                    {row.freq >= 1000 ? `${row.freq / 1000} kHz` : `${row.freq} Hz`}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">
                    {row.valA !== null
                      ? isCompensated
                        ? row.valA > 0
                          ? `+${row.valA.toFixed(1)}`
                          : row.valA.toFixed(1)
                        : row.valA.toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">
                    {row.valB !== null
                      ? isCompensated
                        ? row.valB > 0
                          ? `+${row.valB.toFixed(1)}`
                          : row.valB.toFixed(1)
                        : row.valB.toFixed(1)
                      : "—"}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      row.delta === null
                        ? "text-[var(--text-muted)]"
                        : row.delta > 2
                        ? "text-[var(--warning)]"
                        : row.delta < -2
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {row.delta !== null
                      ? row.delta > 0
                        ? `+${row.delta.toFixed(1)} dB`
                        : `${row.delta.toFixed(1)} dB`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});
