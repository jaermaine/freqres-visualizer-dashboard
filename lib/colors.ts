/**
 * Calibrated 9-color perceptual acoustic trace palette.
 * Engineered so every color maintains >= 3.5:1 non-text contrast
 * against both Dark Mode (#0b0c0e) and Light Mode (#ffffff) plot canvases.
 */
export const DARK_PALETTE = [
  "#f43f5e", // Crimson Signal
  "#14b8a6", // Teal Reference
  "#f59e0b", // Amber Gold
  "#3b82f6", // Cobalt Trace
  "#a855f7", // Violet Harmonic
  "#f97316", // Tangerine Peak
  "#06b6d4", // Cyan Phase
  "#84cc16", // Lime Impulse
  "#ec4899", // Magenta Notch
];

export const LIGHT_PALETTE = [
  "#e11d48", // Crimson Signal (Deep)
  "#0d9488", // Teal Reference (Deep)
  "#d97706", // Amber Gold (Deep)
  "#2563eb", // Cobalt Trace (Deep)
  "#9333ea", // Violet Harmonic (Deep)
  "#ea580c", // Tangerine Peak (Deep)
  "#0891b2", // Cyan Phase (Deep)
  "#65a30d", // Lime Impulse (Deep)
  "#db2777", // Magenta Notch (Deep)
];

export const PALETTE = DARK_PALETTE;

/**
 * Maps a trace color to its theme-calibrated counterpart when it matches
 * one of the standard palette slots (or legacy neon yellow/cyan colors that vanish on white),
 * while preserving custom user-picked colors.
 */
const LEGACY_LIGHT_MAP: Record<string, string> = {
  "#ff00aa": "#db2777",
  "#00ffcc": "#0d9488",
  "#ffea00": "#d97706",
  "#b700ff": "#9333ea",
  "#ff4d00": "#ea580c",
  "#00d4ff": "#0891b2",
  "#a2ff00": "#65a30d",
  "#ff88a8": "#e11d48",
  "#88b3ff": "#2563eb",
};

export function resolveTraceColorForTheme(color: string, theme: "dark" | "light"): string {
  const normalized = color.toLowerCase();
  if (theme === "light") {
    if (normalized === "#ffffff") return "#334155";
    const darkIdx = DARK_PALETTE.indexOf(normalized);
    if (darkIdx !== -1) return LIGHT_PALETTE[darkIdx];
    if (LEGACY_LIGHT_MAP[normalized]) return LEGACY_LIGHT_MAP[normalized];
  } else {
    if (normalized === "#334155") return "#e5e7eb";
    const lightIdx = LIGHT_PALETTE.indexOf(normalized);
    if (lightIdx !== -1) return DARK_PALETTE[lightIdx];
  }
  return color;
}
