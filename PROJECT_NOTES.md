# FreqRes – Architecture Notes

## Stack
- Next.js 14 App Router · TypeScript (ES2022) · Tailwind CSS 3
- `react-plotly.js/factory` with `plotly.js-basic-dist-min` (dynamic import, SSR disabled)
- Browser `localStorage` for active traces/workspaces + Upstash Redis (3-day TTL) for `/s/[id]` shared workspaces and OpenGraph previews

## Source-type Classification Rules

| URL pattern                        | Classification             | Plotable |
|------------------------------------|----------------------------|----------|
| `*.squig.link`, `*.github.io` (no raw ext) | `squiglink-share-url`      | Yes (via `resolveSquigUrl`) |
| `graph.hangout.audio` (no raw ext) | `hangout-graph-url`        | No       |
| Path ends in `.txt/.csv/.tsv`      | `raw-measurement-file-url` | Yes      |
| Anything else                      | `unsupported-url`          | No       |

## Parser & Math Engine (`lib/parseMeasurementFile.ts`, `lib/targets.ts`)
- Single-pass multi-channel parser (`parseMeasurementTextMultiChannel`) extracts Average, Left (`L`), and Right (`R`) curves simultaneously
- Detects delimiter in first 5 lines: tab > comma > semicolon > whitespace
- Comment prefixes skipped: `*` `#` `//`
- HTML response detected by `<!doctype` or `<html` prefix
- Minimum 10 valid points required
- Output normalized onto a static 201-point logarithmic grid (20–20,000 Hz) using $O(\log N)$ binary search in $\log_{10}(\text{Hz})$ space (`interpolateLogHz`)
- Zero-allocation reference mean helper (`computeRefMean`) normalizes curves at 800–1,200 Hz
- Tuning targets (`lib/targets.ts`) share deduplicated `HZ_150` / `HZ_682` frequency grids and lazily cache 201-point target projections (`getTargetGridDb`)

## Parameter Bands (`lib/parameterBands.ts`)
Edit `PARAMETER_BANDS` array to add/remove/modify bands. Each band needs:
- `id`, `label`, `freqLow`, `freqHigh`, `category` (`bass`|`mids`|`treble`|`quality`), `color` (RGBA string)

## Key Files
```
app/
  page.tsx               → main dashboard (renders AppShell)
  s/[id]/page.tsx        → shortlink workspace loader + dynamic OpenGraph metadata
  tutorial/page.tsx      → help/guide page
  legal/page.tsx         → terms & privacy policy
  api/import/route.ts    → POST endpoint for URL & Squig.link import (SSRF + LRU rate-limited)
  api/search/route.ts    → GET endpoint for indexed multi-database IEM search
  api/share/route.ts     → POST endpoint for shortlink creation (hybrid Redis rate-limited)
  api/workspace/route.ts → GET endpoint for shortlink workspace JSON
  api/og-image/route.ts  → GET endpoint for shortlink OpenGraph PNG

components/
  AppShell.tsx           → state owner: traces, undo/redo history, bands, export studio
  Sidebar.tsx            → URL input, autocomplete search, trace list, band toggles
  FRChart.tsx            → memoized Plotly chart (plotly.js-basic-dist-min)
  DifferenceTable.tsx    → memoized A/B delta & channel imbalance table
  TraceList.tsx          → memoized per-trace controls with debounced label/note inputs
  BandToggleGroup.tsx    → checkboxes grouped by category
  HelpPanel.tsx          → ImportStatus panel
  GuideContent.tsx       → interactive guide & URL pattern explorer
  UrlPatternCard.tsx     → URL example card

lib/
  parseSourceUrl.ts       → URL → discriminated union
  parseMeasurementFile.ts → raw text → NormalizedCurve + interpolateLogHz + computeRefMean
  resolveSquigUrl.ts      → bounded TTL/LRU phone_book.json resolver for Squig.link
  security.ts             → SSRF DNS/IP validation + bounded in-memory rate limiter
  redis.ts                → shared Upstash Redis singleton
  targets.ts              → tuning target curves + cached 201-point grid projections
  parameterBands.ts       → PARAMETER_BANDS + BAND_CATEGORIES
  errorMessages.ts        → ParserErrorCode → human message
```

