"use client";

import React, { useState } from "react";
import { PARAMETER_BANDS, BAND_CATEGORIES } from "@/lib/parameterBands";

interface Props {
  enabled: Set<string>;
  onToggle: (id: string) => void;
  onClearCategory?: (categoryId: string) => void;
  onHover?: (id: string | null) => void;
  disabled?: boolean;
}

export const BandToggleGroup = React.memo(function BandToggleGroup({
  enabled,
  onToggle,
  onClearCategory,
  onHover,
  disabled,
}: Props) {
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
    <div className="flex flex-col gap-1.5">
      {BAND_CATEGORIES.map((cat) => {
        const bands = PARAMETER_BANDS.filter((b) => b.category === cat.id);
        const isOpen = openCats.has(cat.id);
        const activeCount = bands.filter((b) => enabled.has(b.id)).length;

        return (
          <div key={cat.id} className="panel flex flex-col overflow-hidden">
            <div
              className="px-2.5 py-1.5 flex justify-between items-center transition-colors"
              style={{ background: isOpen ? "var(--bg-raised)" : "transparent" }}
            >
              <button
                type="button"
                onClick={() => toggleCat(cat.id)}
                aria-expanded={isOpen}
                className="flex items-center gap-2 flex-1 text-left py-0.5"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-150 text-[var(--text-muted)] ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="label-xs leading-none">
                  {cat.label}
                </span>
                {activeCount > 0 && (
                  <span className="font-mono text-[10px] font-semibold text-[var(--accent-text)] tabular-nums">
                    ({activeCount})
                  </span>
                )}
              </button>

              {activeCount > 0 && onClearCategory && (
                <button
                  type="button"
                  onClick={() => onClearCategory(cat.id)}
                  className="text-[10px] font-mono text-[var(--accent-text)] hover:opacity-80 transition-opacity px-1 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>

            {isOpen && (
              <div
                className="px-2 py-1.5 flex flex-col gap-0.5"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                {bands.map((band) => {
                  const on = enabled.has(band.id);
                  return (
                    <label
                      key={band.id}
                      className={`flex items-center gap-2 py-1 px-1.5 rounded-sm select-none transition-colors ${
                        disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:bg-[var(--bg-hover)]"
                      }`}
                      onMouseEnter={() => !disabled && onHover?.(band.id)}
                      onMouseLeave={() => !disabled && onHover?.(null)}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onToggle(band.id)}
                        disabled={disabled}
                        className="w-3.5 h-3.5 rounded-sm accent-[var(--accent)] disabled:cursor-not-allowed"
                        id={`band-${band.id}`}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-xs flex-shrink-0 border border-black/20"
                        style={{ background: band.color.replace(/[\d.]+\)$/, "0.85)") }}
                      />
                      <span className="text-xs flex-1 text-[var(--text-primary)]">
                        {band.label}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
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
});
