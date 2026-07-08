# FreqRes – Architecture Notes

## Stack
- Next.js 14 App Router · TypeScript · Tailwind CSS 3
- react-plotly.js (dynamic import, SSR disabled)
- No database · No auth · React state only

## Source-type Classification Rules

| URL pattern                        | Classification             | Plotable |
|------------------------------------|----------------------------|----------|
| `*.squig.link` (no raw ext)        | `squiglink-share-url`      | No       |
| `graph.hangout.audio` (no raw ext) | `hangout-graph-url`        | No       |
| Path ends in `.txt/.csv/.tsv`      | `raw-measurement-file-url` | Yes      |
| Anything else                      | `unsupported-url`          | No       |

- Graph/share URLs → metadata-only success (never a hard error)
- Raw file URLs → fetch → parse → normalize → plot

## Parser Assumptions (`lib/parseMeasurementFile.ts`)
- Detects delimiter in first 5 lines: tab > comma > semicolon > whitespace
- Header detection: first cell non-numeric → treat row as header
- Column priority: `frequency` col required; `raw` preferred, then stereo l+r average
- Headerless files: col[0]=hz, col[1]=dB
- Comment prefixes skipped: `*` `#` `//`
- HTML response detected by `<!doctype` or `<html` prefix
- Minimum 10 valid points required
- Output normalized to 201-point log grid 20–20000 Hz (linear interp in log-freq space)

## Parameter Bands (`lib/parameterBands.ts`)
Edit `PARAMETER_BANDS` array to add/remove/modify bands. Each band needs:
- `id`, `label`, `freqLow`, `freqHigh`, `category` (bass|mids|treble|quality), `color` (RGBA string)

## Data Flow
```
User pastes URL
  → POST /api/import
    → parseSourceUrl() → classify
    → if graph URL → return metadata-only result
    → if raw file → fetch text → parseMeasurementText()
      → detect delimiter, header, columns
      → extract points, sort, deduplicate
      → normalize onto log grid
    → return ImportResult
  → AppShell receives result
  → if fr-data → create Trace, push to state
  → FRChart renders Plotly with traces + band shapes
```

## Key Files
```
app/
  page.tsx             → main dashboard (renders AppShell)
  tutorial/page.tsx    → help page (server component)
  api/import/route.ts  → POST endpoint for URL import
  globals.css          → design tokens + utilities
  layout.tsx           → root layout + metadata

components/
  AppShell.tsx         → state owner: traces, bands
  Sidebar.tsx          → URL input, trace list, band toggles
  FRChart.tsx          → Plotly chart (dynamic, no SSR)
  TraceList.tsx        → per-trace visibility/color/label/remove
  BandToggleGroup.tsx  → checkboxes grouped by category
  HelpPanel.tsx        → ImportStatus panel
  TutorialSidebar.tsx  → tutorial nav sidebar
  UrlPatternCard.tsx   → URL example card

lib/
  parseSourceUrl.ts       → URL → discriminated union
  parseMeasurementFile.ts → raw text → FRPoint[] + NormalizedCurve
  normalizeMeasurement.ts → standalone normalization helper
  parameterBands.ts       → PARAMETER_BANDS + BAND_CATEGORIES
  errorMessages.ts        → ParserErrorCode → human message

types/
  audio.ts             → all shared TypeScript types
```

## TODO
- [ ] CORS issues: some sources block cross-origin fetch from Next.js route handlers
- [ ] Squig.link raw file resolution: model token → raw file URL mapping not implemented
- [ ] Hangout Audio raw curve download: requires API research
- [ ] URL query string sync for shareable sessions
- [ ] Unit tests for parseMeasurementFile
