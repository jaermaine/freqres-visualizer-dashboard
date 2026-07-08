import type { ParserErrorCode } from "@/types/audio";

export const PARSER_ERROR_MESSAGES: Record<ParserErrorCode, string> = {
  HTML_RESPONSE: "The server returned an HTML page instead of a measurement file. The URL may point to a graph viewer, not a raw data file.",
  NO_VALID_ROWS: "No valid frequency/dB data rows were found in the file.",
  NO_FREQUENCY_COLUMN: "Could not find a frequency column in the file header.",
  NO_VALUE_COLUMN: "Could not find a dB/SPL value column in the file header.",
  TOO_FEW_POINTS: "Too few data points to plot a meaningful frequency response curve (minimum 10).",
  NON_NUMERIC_DATA: "The file contains non-numeric data where numbers were expected.",
  UNSUPPORTED_BINARY_CONTENT: "The file appears to be binary and cannot be parsed as a text measurement file.",
};

export const FETCH_ERROR_MESSAGE = "Failed to fetch the measurement file. Check that the URL is accessible and CORS-friendly.";
export const UNSUPPORTED_URL_MESSAGE = "This URL type is not supported. Paste a direct .txt/.csv/.tsv file URL, or a Squig.link/Hangout Audio graph URL.";
