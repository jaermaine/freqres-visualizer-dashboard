import type { FRPoint, NormalizedCurve, ParseResult, ParserErrorCode } from "@/types/audio";

const MIN_POINTS = 10;
const LOG_GRID_START = Math.log10(20);
const LOG_GRID_END = Math.log10(20000);
const LOG_GRID_STEPS = 200;

// Build the shared log-frequency grid (exported for normalization)
export function buildLogGrid(): number[] {
  const out: number[] = [];
  for (let i = 0; i <= LOG_GRID_STEPS; i++) {
    out.push(Math.pow(10, LOG_GRID_START + (i / LOG_GRID_STEPS) * (LOG_GRID_END - LOG_GRID_START)));
  }
  return out;
}

function makeError(code: ParserErrorCode, message: string): ParseResult {
  return { ok: false, code, message };
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<!");
}

// Catches JSON error bodies like {"message":"Not Found"} from GitHub, AWS, etc.
function looksLikeJsonError(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    // If it's an object with a message/error field and no numeric data it's an error body
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return "message" in parsed || "error" in parsed || "errors" in parsed;
    }
  } catch {
    // not valid JSON — not a JSON error body
  }
  return false;
}

function detectDelimiter(lines: string[]): RegExp {
  const sample = lines.slice(0, 5).join("\n");
  if (sample.includes("\t")) return /\t/;
  if (sample.includes(",")) return /,/;
  if (sample.includes(";")) return /;/;
  return /\s+/;
}

const FREQ_HEADERS = new Set(["frequency", "freq", "hz"]);
const VALUE_HEADERS = new Set(["raw", "db", "spl", "amplitude", "level"]);
const LEFT_HEADERS = new Set(["left", "l"]);
const RIGHT_HEADERS = new Set(["right", "r"]);

type ColMap = { freqIdx: number; valIdx: number };

function detectColumns(header: string[]): ColMap | null {
  const lower = header.map((h) => h.trim().toLowerCase());
  const freqIdx = lower.findIndex((h) => FREQ_HEADERS.has(h));
  if (freqIdx === -1) return null;

  // Prefer "raw" column; then try left+right average
  const valIdx = lower.findIndex((h) => VALUE_HEADERS.has(h));
  if (valIdx !== -1 && valIdx !== freqIdx) return { freqIdx, valIdx: -valIdx - 1 }; // negative = single val

  const leftIdx = lower.findIndex((h) => LEFT_HEADERS.has(h));
  const rightIdx = lower.findIndex((h) => RIGHT_HEADERS.has(h));
  if (leftIdx !== -1 && rightIdx !== -1) {
    // encode stereo pair
    return { freqIdx, valIdx: -(leftIdx * 1000 + rightIdx) - 1 };
  }
  if (valIdx !== -1) return { freqIdx, valIdx };
  return { freqIdx, valIdx: freqIdx === 0 ? 1 : 0 };
}

function parseRow(
  cells: string[],
  colMap: ColMap
): FRPoint | null {
  const { freqIdx, valIdx } = colMap;
  const hz = parseFloat(cells[freqIdx]);
  if (!isFinite(hz) || hz <= 0) return null;

  let db: number;
  if (valIdx >= 0) {
    db = parseFloat(cells[valIdx]);
  } else {
    // decode packed index
    const packed = -valIdx - 1;
    if (packed < 1000) {
      // single value
      db = parseFloat(cells[packed]);
    } else {
      const leftIdx = Math.floor(packed / 1000);
      const rightIdx = packed % 1000;
      const l = parseFloat(cells[leftIdx]);
      const r = parseFloat(cells[rightIdx]);
      if (!isFinite(l) || !isFinite(r)) return null;
      db = (l + r) / 2;
    }
  }
  if (!isFinite(db)) return null;
  return { hz, db };
}

export function parseMeasurementText(raw: string): ParseResult {
  if (looksLikeHtml(raw)) {
    return makeError("HTML_RESPONSE", "The URL returned an HTML page, not a measurement file.");
  }
  if (looksLikeJsonError(raw)) {
    let msg: string;
    try { msg = (JSON.parse(raw.trimStart()) as { message?: string }).message ?? "unknown"; }
    catch { msg = "unknown"; }
    return makeError("HTML_RESPONSE", `The server returned an error response: "${msg}". The file may not exist or the URL is incorrect.`);
  }

  // Normalize
  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\uFEFF/, "");

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("*") && !l.startsWith("#") && !l.startsWith("//"));

  if (lines.length === 0) {
    return makeError("NO_VALID_ROWS", "The file appears to be empty or contains only comments.");
  }

  const delim = detectDelimiter(lines);
  const cells0 = lines[0].split(delim).map((s) => s.trim());

  // Determine if first line is a header
  const firstCellNum = parseFloat(cells0[0]);
  let hasHeader = isNaN(firstCellNum);
  let colMap: ColMap;

  if (hasHeader) {
    const detected = detectColumns(cells0);
    if (!detected) {
      // Could still be numeric data with a strange first token
      hasHeader = false;
      colMap = { freqIdx: 0, valIdx: 1 };
    } else {
      colMap = detected;
    }
  } else {
    colMap = { freqIdx: 0, valIdx: 1 };
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const points: FRPoint[] = [];

  for (const line of dataLines) {
    const cells = line.split(delim).map((s) => s.trim());
    if (cells.length < 2) continue;
    const pt = parseRow(cells, colMap);
    if (pt) points.push(pt);
  }

  if (points.length === 0) {
    return makeError("NO_VALID_ROWS", "No numeric frequency/dB rows could be parsed.");
  }
  if (points.length < MIN_POINTS) {
    return makeError("TOO_FEW_POINTS", `Only ${points.length} valid data points found (minimum ${MIN_POINTS}).`);
  }

  // Sort and deduplicate
  points.sort((a, b) => a.hz - b.hz);
  const deduped: FRPoint[] = [];
  for (const pt of points) {
    if (deduped.length === 0 || deduped[deduped.length - 1].hz !== pt.hz) {
      deduped.push(pt);
    }
  }

  const normalized = normalizeCurve(deduped);
  return { ok: true, points: deduped, normalized };
}

function normalizeCurve(points: FRPoint[]): import("@/types/audio").NormalizedCurve {
  const grid = buildLogGrid();
  const srcHz = points.map((p) => p.hz);
  const srcDb = points.map((p) => p.db);
  const db = grid.map((hz) => linearInterpolate(srcHz, srcDb, hz));
  return { hz: grid, db };
}

function linearInterpolate(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}
