import React, { useState } from 'react';
import type { Trace } from "@/types/audio";
import { TUNING_TARGETS } from "@/lib/targets";

interface Props {
  traces: Trace[];
  theme?: 'dark' | 'light';
  isCompensated?: boolean;
  selectedTarget?: string;
}

export function DifferenceTable({ traces, theme = 'dark', isCompensated, selectedTarget }: Props) {
  const visibleTraces = traces.filter(t => t.visible);
  const [isSwapped, setIsSwapped] = useState(false);
  
  const targetObj = TUNING_TARGETS.find(t => t.id === selectedTarget);

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
  
  const getLogInterpolatedDb = (trace: Trace, targetHz: number) => {
    const { hz, db } = trace.normalized;
    if (!hz || hz.length === 0) return null;

    // Match chart's normalization (offset to 60dB at 1kHz)
    const refPoints = hz
      .map((f, i) => ({ hz: f, db: db[i] }))
      .filter((p) => p.hz >= 900 && p.hz <= 1100);
    const refMean = refPoints.length > 0
      ? refPoints.reduce((sum, p) => sum + p.db, 0) / refPoints.length
      : 0;

    let rawDb = null;
    if (targetHz <= hz[0]) {
      rawDb = db[0];
    } else if (targetHz >= hz[hz.length - 1]) {
      rawDb = db[db.length - 1];
    } else {
      for (let i = 0; i < hz.length - 1; i++) {
        if (targetHz >= hz[i] && targetHz <= hz[i + 1]) {
          const logHz = Math.log10(targetHz);
          const logH0 = Math.log10(hz[i]);
          const logH1 = Math.log10(hz[i + 1]);
          const t = (logHz - logH0) / (logH1 - logH0);
          rawDb = db[i] + t * (db[i + 1] - db[i]);
          break;
        }
      }
    }
    
    if (rawDb === null) return null;
    let adjustedDb = rawDb - refMean;
    if (isCompensated && targetObj) {
      adjustedDb -= interpolateTarget(targetHz);
    } else {
      adjustedDb += 60;
    }
    return adjustedDb;
  };

  const frequencies = [20, 100, 1000, 3000, 5000, 10000];
  const isValid = visibleTraces.length === 2;
  
  let traceA = null;
  let traceB = null;
  if (isValid) {
    traceA = isSwapped ? visibleTraces[1] : visibleTraces[0];
    traceB = isSwapped ? visibleTraces[0] : visibleTraces[1];
  }

  const compareData = frequencies.map(freq => {
    const valA = traceA ? getLogInterpolatedDb(traceA, freq) : null;
    const valB = traceB ? getLogInterpolatedDb(traceB, freq) : null;
    let delta = null;

    if (valA !== null && valB !== null) {
      delta = valA - valB;
    }

    return {
      freq,
      valA,
      valB,
      delta
    };
  });

  return (
    <div className={`mt-4 rounded-lg overflow-hidden border transition-colors relative ${
      theme === 'light' 
        ? 'border-slate-200 bg-white' 
        : 'border-slate-800 bg-[#0d0f14]'
    }`}>
      <div className={`px-4 py-2 border-b text-sm font-semibold flex items-center justify-between ${
        theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#151923] border-slate-800 text-slate-200'
      }`}>
        <span>A/B Comparison Table</span>
        <div className="flex items-center gap-4">
          {isValid && (
            <button 
              onClick={() => setIsSwapped(!isSwapped)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Swap Trace A and Trace B"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      
      {!isValid && (
        <div className="absolute inset-0 top-[37px] z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className={`px-4 py-2 rounded-md shadow-lg text-sm font-medium ${
            theme === 'light' ? 'bg-white text-slate-800 border border-slate-200' : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}>
            Please select exactly 2 traces to view the A/B comparison. (Currently selected: {visibleTraces.length})
          </div>
        </div>
      )}

      <div className={`overflow-x-auto ${!isValid ? 'opacity-30 pointer-events-none filter blur-[1px]' : ''}`}>
        <table className="w-full text-sm text-left">
          <thead className={`text-xs uppercase ${
            theme === 'light' ? 'text-slate-500 bg-slate-50 border-b border-slate-200' : 'text-slate-400 bg-[#151923] border-b border-slate-800'
          }`}>
            <tr>
              <th className="px-4 py-3 font-medium w-1/4">Freq (Hz)</th>
              <th className="px-4 py-3 font-medium w-1/4">
                {traceA ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: traceA.color }}></div>
                    <span className="truncate max-w-[150px]" title={traceA.label}>{traceA.label} (A)</span>
                  </div>
                ) : (
                  <span className="opacity-50">Trace A</span>
                )}
              </th>
              <th className="px-4 py-3 font-medium w-1/4">
                {traceB ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: traceB.color }}></div>
                    <span className="truncate max-w-[150px]" title={traceB.label}>{traceB.label} (B)</span>
                  </div>
                ) : (
                  <span className="opacity-50">Trace B</span>
                )}
              </th>
              <th className="px-4 py-3 font-medium text-right w-1/4">Delta (dB)</th>
            </tr>
          </thead>
          <tbody className={theme === 'light' ? 'divide-y divide-slate-100' : 'divide-y divide-slate-800/50'}>
            {compareData.map((row) => (
              <tr key={row.freq} className={`transition-colors ${
                theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'
              }`}>
                <td className="px-4 py-2.5 font-medium">{row.freq >= 1000 ? `${row.freq/1000}k` : row.freq}</td>
                <td className="px-4 py-2.5">
                  {row.valA !== null ? (isCompensated ? (row.valA > 0 ? `+${row.valA.toFixed(1)}` : row.valA.toFixed(1)) : row.valA.toFixed(1)) : '-'}
                </td>
                <td className="px-4 py-2.5">
                  {row.valB !== null ? (isCompensated ? (row.valB > 0 ? `+${row.valB.toFixed(1)}` : row.valB.toFixed(1)) : row.valB.toFixed(1)) : '-'}
                </td>
                <td className={`px-4 py-2.5 text-right font-medium ${
                  row.delta === null ? '' : 
                  row.delta > 2 ? 'text-red-400' : 
                  row.delta < -2 ? 'text-blue-400' : 
                  theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  {row.delta !== null ? (row.delta > 0 ? `+${row.delta.toFixed(1)}` : row.delta.toFixed(1)) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
