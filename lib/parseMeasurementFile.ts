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
  let valIdx = lower.findIndex((h, i) => i !== freqIdx && (h.includes("db") || h.includes("spl") || h.includes("raw") || h.includes("ampl") || h.includes("level") || h.includes("mag")));

  if (valIdx !== -1) return { freqIdx, valIdx };

  const leftIdx = lower.findIndex((h) => h === "left" || h === "l");
  const rightIdx = lower.findIndex((h) => h === "right" || h === "r");
  if (leftIdx !== -1 && rightIdx !== -1 && leftIdx !== freqIdx && rightIdx !== freqIdx) {
    // encode stereo pair
    return { freqIdx, valIdx: -(leftIdx * 1000 + rightIdx) - 1 };
  }
  
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

  // Find the first line that looks like valid numeric data
  let firstDataIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(s => s.trim());
    if (cells.length >= 2) {
      const v0 = parseFloat(cells[0]);
      const v1 = parseFloat(cells[1]);
      if (!isNaN(v0) && !isNaN(v1)) {
        firstDataIdx = i;
        break;
      }
    }
  }

  if (firstDataIdx === -1) {
    return makeError("NO_VALID_ROWS", "No numeric frequency/dB rows could be parsed.");
  }

  let colMap: ColMap = { freqIdx: 0, valIdx: 1 };
  
  if (firstDataIdx > 0) {
    // Check if the line immediately preceding the data is a header
    const headerCells = lines[firstDataIdx - 1].split(delim).map(s => s.trim());
    const detected = detectColumns(headerCells);
    if (detected) {
      colMap = detected;
    }
  }

  const dataLines = lines.slice(firstDataIdx);
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

  // Split into sweeps to handle files with appended Left/Right channels (prevents jagged lines)
  // A new sweep starts whenever frequency drops or encounters a duplicate X value.
  const sweeps: FRPoint[][] = [];
  let currentSweep: FRPoint[] = [];
  let lastHz = -1;

  for (const pt of points) {
    if (pt.hz <= lastHz) {
      if (currentSweep.length > 0) {
        sweeps.push(currentSweep);
      }
      currentSweep = [];
    }
    currentSweep.push(pt);
    lastHz = pt.hz;
  }
  if (currentSweep.length > 0) sweeps.push(currentSweep);

  // Filter out glitched sweeps (e.g., single duplicate points causing vertical lines)
  const validSweeps = sweeps.filter((s) => s.length >= MIN_POINTS);

  if (validSweeps.length === 0) {
    return makeError("TOO_FEW_POINTS", `No valid sweep found with at least ${MIN_POINTS} points.`);
  }

  // Normalize each valid sweep and average them
  const grid = buildLogGrid();
  const sumDb = new Array(grid.length).fill(0);

  for (const sweep of validSweeps) {
    sweep.sort((a, b) => a.hz - b.hz);
    const deduped: FRPoint[] = [];
    for (const pt of sweep) {
      if (deduped.length === 0 || deduped[deduped.length - 1].hz !== pt.hz) {
        deduped.push(pt);
      }
    }
    const norm = normalizeCurve(deduped);
    for (let i = 0; i < grid.length; i++) {
      sumDb[i] += norm.db[i];
    }
  }

  const avgDb = sumDb.map((val) => val / validSweeps.length);
  const normalized: NormalizedCurve = { hz: grid, db: avgDb };

  // For raw points, return the first sweep's deduped points
  const firstSweep = validSweeps[0];
  firstSweep.sort((a, b) => a.hz - b.hz);
  const finalPoints: FRPoint[] = [];
  for (const pt of firstSweep) {
    if (finalPoints.length === 0 || finalPoints[finalPoints.length - 1].hz !== pt.hz) {
      finalPoints.push(pt);
    }
  }

  return { ok: true, points: finalPoints, normalized };
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

export type ParsedChannelCurve = {
  labelSuffix: string;
  channel: "L" | "R" | "avg";
  points: FRPoint[];
  normalized: NormalizedCurve;
};

export type MultiChannelParseSuccess = {
  ok: true;
  curves: ParsedChannelCurve[];
};

export type MultiChannelParseResult = MultiChannelParseSuccess | ParserError;

export function parseMeasurementTextMultiChannel(
  raw: string,
  options?: { channelMode?: "separate" | "avg" }
): MultiChannelParseResult {
  const baseResult = parseMeasurementText(raw);
  if (!baseResult.ok) return baseResult;

  const mode = options?.channelMode ?? "separate";

  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\uFEFF/, "");

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("*") && !l.startsWith("#") && !l.startsWith("//"));

  const delim = detectDelimiter(lines);
  let firstDataIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(s => s.trim());
    if (cells.length >= 2) {
      const v0 = parseFloat(cells[0]);
      const v1 = parseFloat(cells[1]);
      if (!isNaN(v0) && !isNaN(v1)) {
        firstDataIdx = i;
        break;
      }
    }
  }

  if (firstDataIdx === -1) {
    return { ok: true, curves: [{ labelSuffix: "", channel: "avg", points: baseResult.points, normalized: baseResult.normalized }] };
  }

  let colMap: ColMap = { freqIdx: 0, valIdx: 1 };
  if (firstDataIdx > 0) {
    const headerCells = lines[firstDataIdx - 1].split(delim).map(s => s.trim());
    const detected = detectColumns(headerCells);
    if (detected) colMap = detected;
  }

  // Check if header had stereo columns
  if (colMap.valIdx < -1) {
    const packed = -colMap.valIdx - 1;
    if (packed >= 1000) {
      const leftIdx = Math.floor(packed / 1000);
      const rightIdx = packed % 1000;

      const dataLines = lines.slice(firstDataIdx);
      const pointsL: FRPoint[] = [];
      const pointsR: FRPoint[] = [];

      for (const line of dataLines) {
        const cells = line.split(delim).map(s => s.trim());
        if (cells.length <= Math.max(leftIdx, rightIdx)) continue;
        const hz = parseFloat(cells[colMap.freqIdx]);
        const l = parseFloat(cells[leftIdx]);
        const r = parseFloat(cells[rightIdx]);
        if (isFinite(hz) && hz > 0) {
          if (isFinite(l)) pointsL.push({ hz, db: l });
          if (isFinite(r)) pointsR.push({ hz, db: r });
        }
      }

      if (pointsL.length >= MIN_POINTS && pointsR.length >= MIN_POINTS) {
        pointsL.sort((a, b) => a.hz - b.hz);
        pointsR.sort((a, b) => a.hz - b.hz);
        const normL = normalizeCurve(pointsL);
        const normR = normalizeCurve(pointsR);

        if (mode === "avg") {
          const grid = buildLogGrid();
          const avgDb = grid.map((_, i) => (normL.db[i] + normR.db[i]) / 2);
          return { ok: true, curves: [{ labelSuffix: "", channel: "avg", points: pointsL, normalized: { hz: grid, db: avgDb } }] };
        }

        return {
          ok: true,
          curves: [
            { labelSuffix: " (L)", channel: "L", points: pointsL, normalized: normL },
            { labelSuffix: " (R)", channel: "R", points: pointsR, normalized: normR },
          ],
        };
      }
    }
  }

  // Check for multi-sweep (Sweep 0 = L, Sweep 1 = R)
  const dataLines = lines.slice(firstDataIdx);
  const rawPoints: FRPoint[] = [];
  for (const line of dataLines) {
    const cells = line.split(delim).map((s) => s.trim());
    if (cells.length < 2) continue;
    const pt = parseRow(cells, colMap);
    if (pt) rawPoints.push(pt);
  }

  const sweeps: FRPoint[][] = [];
  let currentSweep: FRPoint[] = [];
  let lastHz = -1;
  for (const pt of rawPoints) {
    if (pt.hz <= lastHz) {
      if (currentSweep.length > 0) sweeps.push(currentSweep);
      currentSweep = [];
    }
    currentSweep.push(pt);
    lastHz = pt.hz;
  }
  if (currentSweep.length > 0) sweeps.push(currentSweep);

  const validSweeps = sweeps.filter(s => s.length >= MIN_POINTS);

  if (mode !== "avg" && validSweeps.length === 2) {
    const sweepL = validSweeps[0].sort((a, b) => a.hz - b.hz);
    const sweepR = validSweeps[1].sort((a, b) => a.hz - b.hz);
    const normL = normalizeCurve(sweepL);
    const normR = normalizeCurve(sweepR);

    return {
      ok: true,
      curves: [
        { labelSuffix: " (L)", channel: "L", points: sweepL, normalized: normL },
        { labelSuffix: " (R)", channel: "R", points: sweepR, normalized: normR },
      ],
    };
  }

  return {
    ok: true,
    curves: [{ labelSuffix: "", channel: "avg", points: baseResult.points, normalized: baseResult.normalized }],
  };
}
