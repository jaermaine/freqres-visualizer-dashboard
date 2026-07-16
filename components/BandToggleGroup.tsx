"use client";

import { useState } from "react";
import { PARAMETER_BANDS, BAND_CATEGORIES } from "@/lib/parameterBands";
import type { BandCategory } from "@/types/audio";

interface Props {
  enabled: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function BandToggleGroup({ enabled, onToggle, disabled }: Props) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["bass"]));

  const toggleCat = (id: string) => {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {BAND_CATEGORIES.map((cat) => {
        const bands = PARAMETER_BANDS.filter((b) => b.category === cat.id);
        const isOpen = openCats.has(cat.id);
        const activeCount = bands.filter((b) => enabled.has(b.id)).length;

        return (
          <div key={cat.id} className="panel flex flex-col overflow-hidden">
            <div
              className="px-3 py-2 flex justify-between items-center cursor-pointer transition-colors"
              style={{ background: isOpen ? "var(--bg-hover)" : "transparent" }}
              onClick={() => toggleCat(cat.id)}
            >
              <p className="label-xs mb-0 m-0 leading-none">
                {cat.label} {activeCount > 0 && <span className="text-indigo-400">({activeCount})</span>}
              </p>
              <span className="text-xs leading-none" style={{ color: "var(--text-muted)" }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </div>
            {isOpen && (
              <div
                className="px-2 py-2 flex flex-col gap-0.5"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                {bands.map((band) => {
                  const on = enabled.has(band.id);
                  return (
                    <label
                      key={band.id}
                      className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-slate-800/40 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onToggle(band.id)}
                        disabled={disabled}
                        className="w-3.5 h-3.5 accent-indigo-500 disabled:cursor-not-allowed"
                        id={`band-${band.id}`}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: band.color.replace(/[\d.]+\)$/, "0.8)") }}
                      />
                      <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>
                        {band.label}
                      </span>
                      <span className="label-xs" style={{ fontSize: "10px" }}>
                        {band.freqLow >= 1000 ? `${band.freqLow / 1000}k` : band.freqLow}–
                        {band.freqHigh >= 1000 ? `${band.freqHigh / 1000}k` : band.freqHigh}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
