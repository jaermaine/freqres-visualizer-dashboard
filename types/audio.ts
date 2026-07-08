// ─── URL Classification ────────────────────────────────────────────────────

export type SquiglinkShareUrl = {
  kind: "squiglink-share-url";
  host: string;
  baseUrl: string;
  models: ModelToken[];
};

export type HangoutGraphUrl = {
  kind: "hangout-graph-url";
  category: string;
  rigId: string;
  baseUrl: string;
  models: ModelToken[];
  adjustments: HangoutAdjustments;
};

export type RawMeasurementFileUrl = {
  kind: "raw-measurement-file-url";
  ext: "txt" | "csv" | "tsv";
  url: string;
};

export type UnsupportedUrl = {
  kind: "unsupported-url";
  reason: string;
};

export type ParsedSourceUrl =
  | SquiglinkShareUrl
  | HangoutGraphUrl
  | RawMeasurementFileUrl
  | UnsupportedUrl;

export type ModelToken = {
  raw: string;
  label: string;
};

export type HangoutAdjustments = {
  bass?: number;
  tilt?: number;
  treble?: number;
  ear?: number;
};

// ─── FR Data ───────────────────────────────────────────────────────────────

export type FRPoint = {
  hz: number;
  db: number;
};

export type NormalizedCurve = {
  hz: number[];
  db: number[];
};

// ─── Parser Errors ─────────────────────────────────────────────────────────

export type ParserErrorCode =
  | "HTML_RESPONSE"
  | "NO_VALID_ROWS"
  | "NO_FREQUENCY_COLUMN"
  | "NO_VALUE_COLUMN"
  | "TOO_FEW_POINTS"
  | "NON_NUMERIC_DATA"
  | "UNSUPPORTED_BINARY_CONTENT";

export type ParserError = {
  ok: false;
  code: ParserErrorCode;
  message: string;
};

export type ParserSuccess = {
  ok: true;
  points: FRPoint[];
  normalized: NormalizedCurve;
};

export type ParseResult = ParserSuccess | ParserError;

// ─── Import Results ────────────────────────────────────────────────────────

export type CurveData = {
  label: string;
  points: FRPoint[];
  normalized: NormalizedCurve;
};

export type MetadataOnlyResult = {
  ok: true;
  mode: "metadata-only";
  source: ParsedSourceUrl;
  curves: [];
  label: string;
  message: string;
};

export type FRDataResult = {
  ok: true;
  mode: "fr-data";
  source: ParsedSourceUrl;
  curves: CurveData[];
};

export type ImportError = {
  ok: false;
  code: ParserErrorCode | "FETCH_ERROR" | "UNSUPPORTED_URL" | "RATE_LIMITED" | "INVALID_URL" | "SECURITY_BLOCK" | "HTML_RESPONSE";
  message: string;
};

export type ImportResult = MetadataOnlyResult | FRDataResult | ImportError;

// ─── Trace (dashboard state) ───────────────────────────────────────────────

export type Trace = {
  id: string;
  label: string;
  color: string;
  normalized: NormalizedCurve;
  source: ParsedSourceUrl;
  visible: boolean;
};

// ─── Parameter Bands ───────────────────────────────────────────────────────

export type BandCategory = "bass" | "mids" | "treble" | "quality";

export type ParameterBand = {
  id: string;
  label: string;
  freqLow: number;
  freqHigh: number;
  category: BandCategory;
  color: string;
};
