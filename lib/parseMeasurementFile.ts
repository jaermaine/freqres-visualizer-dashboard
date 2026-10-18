import type { FRPoint, NormalizedCurve, ParseResult, ParserErrorCode } from "@/types/audio";
import { PARSER_ERROR_MESSAGES } from "@/lib/errorMessages";

const MIN_POINTS = 10;
const LOG_GRID_START = Math.log10(20);
const LOG_GRID_END = Math.log10(20000);
const LOG_GRID_STEPS = 200;

// Precompute the shared 201-point log-frequency grid once at module load
const STATIC_LOG_GRID: number[] = Array.from({ length: LOG_GRID_STEPS + 1 }, (_, i) =>
  i === 0
    ? 20
    : i === LOG_GRID_STEPS
    ? 20000
    : Math.pow(10, LOG_GRID_START + (i / LOG_GRID_STEPS) * (LOG_GRID_END - LOG_GRID_START))
);

export function buildLogGrid(): number[] {
  return STATIC_LOG_GRID;
}

/**
 * O(log N) binary-search interpolation in log10(Hz) frequency space.
 * Assumes `xs` is sorted in ascending order and contains positive frequencies.
 */
export function interpolateLogHz(xs: number[], ys: number[], targetHz: number): number {
  const n = xs.length;
  if (n === 0) return 0;
  if (targetHz <= xs[0]) return ys[0];
  if (targetHz >= xs[n - 1]) return ys[n - 1];

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= targetHz) lo = mid;
    else hi = mid;
  }

  const h0 = xs[lo];
  const h1 = xs[hi];
  if (h1 <= h0) return ys[lo];
  const t = Math.log10(targetHz / h0) / Math.log10(h1 / h0);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

/**
 * Zero-allocation computation of the mean dB in the 900–1100 Hz reference band.
 */
export function computeRefMean(hz: number[], db: number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < hz.length; i++) {
    const f = hz[i];
    if (f >= 900 && f <= 1100) {
      sum += db[i];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

export type MultiChannelParsedCurve = {
  labelSuffix: string;
  channel: "L" | "R" | "avg";
  points: FRPoint[];
  normalized: NormalizedCurve;
  rawChannels?: {
    left: NormalizedCurve;
    right: NormalizedCurve;
  };
};

export type ParsedChannelCurve = MultiChannelParsedCurve;

export type MultiChannelParseResult =
  | { ok: true; curves: MultiChannelParsedCurve[] }
  | { ok: false; code: ParserErrorCode; message: string };

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<!");
}

// Catches JSON error bodies like {"message":"Not Found"} from GitHub, AWS, etc.
function looksLikeJsonError(text: string): { isError: boolean; message?: string } {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return { isError: false };
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      if ("message" in parsed || "error" in parsed || "errors" in parsed) {
        const msg = (parsed as { message?: string; error?: string }).message ?? (parsed as { error?: string }).error ?? "unknown";
        return { isError: true, message: String(msg) };
      }
    }
  } catch {
    // not valid JSON
  }
  return { isError: false };
}

function detectDelimiter(lines: string[]): RegExp {
  const sample = lines.slice(0, 20).join("\n");
  if (sample.includes("\t")) return /\t/;
  if (sample.includes(",")) return /,/;
  if (sample.includes(";")) return /;/;
  return /\s+/;
}

type ColMap = { freqIdx: number; valIdx: number };

function detectColumns(header: string[]): ColMap | null {
  const lower = header.map((h) => h.trim().toLowerCase());
  const freqIdx = lower.findIndex((h) => h.includes("freq") || h.includes("hz"));
  if (freqIdx === -1) return null;

  // Prefer value column; then try left+right average
  const valIdx = lower.findIndex(
    (h, i) =>
      i !== freqIdx &&
      (h.includes("db") ||
        h.includes("spl") ||
        h.includes("raw") ||
        h.includes("ampl") ||
        h.includes("level") ||
        h.includes("mag"))
  );

  if (valIdx !== -1) return { freqIdx, valIdx };

  const leftIdx = lower.findIndex((h) => h === "left" || h === "l");
  const rightIdx = lower.findIndex((h) => h === "right" || h === "r");
  if (leftIdx !== -1 && rightIdx !== -1 && leftIdx !== freqIdx && rightIdx !== freqIdx) {
    // encode stereo pair
    return { freqIdx, valIdx: -(leftIdx * 1000 + rightIdx) - 1 };
  }

  return { freqIdx, valIdx: freqIdx === 0 ? 1 : 0 };
}

function parseRow(cells: string[], colMap: ColMap): FRPoint | null {
  const { freqIdx, valIdx } = colMap;
  const hz = parseFloat(cells[freqIdx]);
  if (!isFinite(hz) || hz <= 0) return null;

  let db: number;
  if (valIdx >= 0) {
    db = parseFloat(cells[valIdx]);
  } else {
    const packed = -valIdx - 1;
    if (packed < 1000) {
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

function sortAndDedupeSweep(sweep: FRPoint[]): FRPoint[] {
  const sorted = [...sweep].sort((a, b) => a.hz - b.hz);
  const deduped: FRPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const pt = sorted[i];
    if (deduped.length === 0 || deduped[deduped.length - 1].hz !== pt.hz) {
      deduped.push(pt);
    }
  }
  return deduped;
}

function normalizeCurve(points: FRPoint[]): NormalizedCurve {
  const grid = STATIC_LOG_GRID;
  const srcHz = new Array<number>(points.length);
  const srcDb = new Array<number>(points.length);
  for (let i = 0; i < points.length; i++) {
    srcHz[i] = points[i].hz;
    srcDb[i] = points[i].db;
  }
  const db = grid.map((hz) => interpolateLogHz(srcHz, srcDb, hz));
  return { hz: grid, db };
}

/**
 * Single-pass measurement text parser supporting both mono/averaged and multi-channel extraction.
 */
export function parseMeasurementTextMultiChannel(
  raw: string,
  options?: { channelMode?: "separate" | "avg" }
): MultiChannelParseResult {
  if (raw.includes("\0")) {
    return {
      ok: false,
      code: "UNSUPPORTED_BINARY_CONTENT",
      message: PARSER_ERROR_MESSAGES.UNSUPPORTED_BINARY_CONTENT,
    };
  }
  if (looksLikeHtml(raw)) {
    return { ok: false, code: "HTML_RESPONSE", message: PARSER_ERROR_MESSAGES.HTML_RESPONSE };
  }
  const jsonCheck = looksLikeJsonError(raw);
  if (jsonCheck.isError) {
    return {
      ok: false,
      code: "HTML_RESPONSE",
      message: `The server returned an error response: "${jsonCheck.message}". The file may not exist or the URL is incorrect.`,
    };
  }

  const mode = options?.channelMode ?? "separate";

  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\uFEFF/, "");

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("*") && !l.startsWith("#") && !l.startsWith("//"));

  if (lines.length === 0) {
    return { ok: false, code: "NO_VALID_ROWS", message: PARSER_ERROR_MESSAGES.NO_VALID_ROWS };
  }

  const delim = detectDelimiter(lines);

  // Split all lines once and find the first line that looks like valid numeric data
  const tokenizedLines: string[][] = new Array(lines.length);
  let firstDataIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(delim).map((s) => s.trim());
    tokenizedLines[i] = cells;
    if (firstDataIdx === -1 && cells.length >= 2) {
      const v0 = parseFloat(cells[0]);
      const v1 = parseFloat(cells[1]);
      if (!isNaN(v0) && !isNaN(v1)) {
        firstDataIdx = i;
      }
    }
  }

  if (firstDataIdx === -1) {
    return { ok: false, code: "NO_VALID_ROWS", message: PARSER_ERROR_MESSAGES.NO_VALID_ROWS };
  }

  let colMap: ColMap = { freqIdx: 0, valIdx: 1 };
  if (firstDataIdx > 0) {
    const detected = detectColumns(tokenizedLines[firstDataIdx - 1]);
    if (detected) colMap = detected;
  }

  // Case 1: Explicit Stereo L/R Columns in Header
  if (colMap.valIdx < -1) {
    const packed = -colMap.valIdx - 1;
    if (packed >= 1000) {
      const leftIdx = Math.floor(packed / 1000);
      const rightIdx = packed % 1000;
      const maxIdx = Math.max(leftIdx, rightIdx, colMap.freqIdx);

      const pointsL: FRPoint[] = [];
      const pointsR: FRPoint[] = [];

      for (let i = firstDataIdx; i < tokenizedLines.length; i++) {
        const cells = tokenizedLines[i];
        if (cells.length <= maxIdx) continue;
        const hz = parseFloat(cells[colMap.freqIdx]);
        if (!isFinite(hz) || hz <= 0) continue;
        const l = parseFloat(cells[leftIdx]);
        const r = parseFloat(cells[rightIdx]);
        if (isFinite(l)) pointsL.push({ hz, db: l });
        if (isFinite(r)) pointsR.push({ hz, db: r });
      }

      if (pointsL.length >= MIN_POINTS && pointsR.length >= MIN_POINTS) {
        const dedupedL = sortAndDedupeSweep(pointsL);
        const dedupedR = sortAndDedupeSweep(pointsR);
        const normL = normalizeCurve(dedupedL);
        const normR = normalizeCurve(dedupedR);
        const rawChannels = { left: normL, right: normR };

        if (mode === "avg") {
          const grid = STATIC_LOG_GRID;
          const avgDb = grid.map((_, i) => (normL.db[i] + normR.db[i]) / 2);
          return {
            ok: true,
            curves: [
              {
                labelSuffix: "",
                channel: "avg",
                points: dedupedL,
                normalized: { hz: grid, db: avgDb },
                rawChannels,
              },
            ],
          };
        }

        return {
          ok: true,
          curves: [
            { labelSuffix: " (L)", channel: "L", points: dedupedL, normalized: normL, rawChannels },
            { labelSuffix: " (R)", channel: "R", points: dedupedR, normalized: normR, rawChannels },
          ],
        };
      }
    }
  }

  // Case 2: Standard Single-Column or Multi-Sweep Data
  const points: FRPoint[] = [];
  for (let i = firstDataIdx; i < tokenizedLines.length; i++) {
    const cells = tokenizedLines[i];
    if (cells.length < 2) continue;
    const pt = parseRow(cells, colMap);
    if (pt) points.push(pt);
  }

  if (points.length === 0) {
    return { ok: false, code: "NO_VALID_ROWS", message: PARSER_ERROR_MESSAGES.NO_VALID_ROWS };
  }
  if (points.length < MIN_POINTS) {
    return { ok: false, code: "TOO_FEW_POINTS", message: PARSER_ERROR_MESSAGES.TOO_FEW_POINTS };
  }

  // Split into sweeps whenever frequency drops or repeats
  const sweeps: FRPoint[][] = [];
  let currentSweep: FRPoint[] = [];
  let lastHz = -1;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.hz <= lastHz) {
      if (currentSweep.length > 0) sweeps.push(currentSweep);
      currentSweep = [];
    }
    currentSweep.push(pt);
    lastHz = pt.hz;
  }
  if (currentSweep.length > 0) sweeps.push(currentSweep);

  const validSweeps = sweeps.filter((s) => s.length >= MIN_POINTS);
  if (validSweeps.length === 0) {
    return { ok: false, code: "TOO_FEW_POINTS", message: PARSER_ERROR_MESSAGES.TOO_FEW_POINTS };
  }

  // If exactly 2 valid sweeps (Sweep 0 = Left, Sweep 1 = Right), preserve rawChannels for both modes
  if (validSweeps.length === 2) {
    const dedupedL = sortAndDedupeSweep(validSweeps[0]);
    const dedupedR = sortAndDedupeSweep(validSweeps[1]);
    const normL = normalizeCurve(dedupedL);
    const normR = normalizeCurve(dedupedR);
    const rawChannels = { left: normL, right: normR };

    if (mode !== "avg") {
      return {
        ok: true,
        curves: [
          { labelSuffix: " (L)", channel: "L", points: dedupedL, normalized: normL, rawChannels },
          { labelSuffix: " (R)", channel: "R", points: dedupedR, normalized: normR, rawChannels },
        ],
      };
    }

    const grid = STATIC_LOG_GRID;
    const avgDb = grid.map((_, i) => (normL.db[i] + normR.db[i]) / 2);
    return {
      ok: true,
      curves: [
        {
          labelSuffix: "",
          channel: "avg",
          points: dedupedL,
          normalized: { hz: grid, db: avgDb },
          rawChannels,
        },
      ],
    };
  }

  // Average all valid sweeps onto the shared log grid
  const grid = STATIC_LOG_GRID;
  const sumDb = new Array<number>(grid.length).fill(0);
  let firstDeduped: FRPoint[] = [];

  for (let s = 0; s < validSweeps.length; s++) {
    const deduped = sortAndDedupeSweep(validSweeps[s]);
    if (s === 0) firstDeduped = deduped;
    const norm = normalizeCurve(deduped);
    for (let i = 0; i < grid.length; i++) {
      sumDb[i] += norm.db[i];
    }
  }

  const avgDb = sumDb.map((val) => val / validSweeps.length);
  return {
    ok: true,
    curves: [
      {
        labelSuffix: "",
        channel: "avg",
        points: firstDeduped,
        normalized: { hz: grid, db: avgDb },
      },
    ],
  };
}

export function parseMeasurementText(raw: string): ParseResult {
  const res = parseMeasurementTextMultiChannel(raw, { channelMode: "avg" });
  if (!res.ok) return res;
  const first = res.curves[0];
  return {
    ok: true,
    points: first.points,
    normalized: first.normalized,
  };
}
