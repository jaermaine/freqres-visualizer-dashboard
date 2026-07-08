import type { NormalizedCurve, FRPoint } from "@/types/audio";
import { buildLogGrid } from "./parseMeasurementFile";

/**
 * Re-normalize an already-parsed set of FRPoints onto the shared log grid.
 * Used when we want a standalone normalization step.
 */
export function normalizeMeasurement(points: FRPoint[]): NormalizedCurve {
  const sorted = [...points].sort((a, b) => a.hz - b.hz);
  const grid = buildLogGrid();
  const srcHz = sorted.map((p) => p.hz);
  const srcDb = sorted.map((p) => p.db);
  const db = grid.map((hz) => lerp(srcHz, srcDb, hz));
  return { hz: grid, db };
}

function lerp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let lo = 0, hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid; else hi = mid;
  }
  return ys[lo] + ((x - xs[lo]) / (xs[hi] - xs[lo])) * (ys[hi] - ys[lo]);
}
