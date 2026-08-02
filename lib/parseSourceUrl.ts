import type { ParsedSourceUrl, ModelToken, HangoutAdjustments } from "@/types/audio";

const RAW_EXTS = new Set(["txt", "csv", "tsv"]);

function ext(pathname: string): string {
  const last = pathname.split("/").pop() ?? "";
  return last.split(".").pop()?.toLowerCase() ?? "";
}

function toLabel(raw: string): string {
  return raw.replace(/_/g, " ").trim();
}

function parseModels(share: string | null): ModelToken[] {
  if (!share) return [];
  return share
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, label: toLabel(raw) }));
}

export function parseSourceUrl(input: string): ParsedSourceUrl {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { kind: "unsupported-url", reason: "Invalid URL format" };
  }

  const { hostname, pathname, searchParams } = url;

  // Squig.link & GitHub Pages CrinGraph databases (*.squig.link, *.github.io)
  if (
    hostname === "squig.link" ||
    hostname.endsWith(".squig.link") ||
    hostname === "github.io" ||
    hostname.endsWith(".github.io")
  ) {
    const e = ext(pathname);
    if (RAW_EXTS.has(e)) {
      return { kind: "raw-measurement-file-url", ext: e as "txt" | "csv" | "tsv", url: input.trim() };
    }
    // Extract baseUrl by removing any trailing filename (like index.html) from pathname
    let baseDir = pathname;
    if (baseDir.endsWith(".html")) {
      baseDir = baseDir.substring(0, baseDir.lastIndexOf("/") + 1);
    }
    if (!baseDir.endsWith("/")) baseDir += "/";
    
    return {
      kind: "squiglink-share-url",
      host: hostname,
      baseUrl: `https://${hostname}${baseDir}`,
      models: parseModels(searchParams.get("share")),
    };
  }

  // Hangout Audio
  if (hostname === "graph.hangout.audio") {
    const e = ext(pathname);
    if (RAW_EXTS.has(e)) {
      return { kind: "raw-measurement-file-url", ext: e as "txt" | "csv" | "tsv", url: input.trim() };
    }
    const parts = pathname.split("/").filter(Boolean);
    const category = parts[0] ?? "";
    const rigId = parts[1] ?? "";
    const adj: HangoutAdjustments = {};
    const bass = searchParams.get("bass");
    const tilt = searchParams.get("tilt");
    const treble = searchParams.get("treble");
    const ear = searchParams.get("ear");
    if (bass !== null) adj.bass = parseFloat(bass);
    if (tilt !== null) adj.tilt = parseFloat(tilt);
    if (treble !== null) adj.treble = parseFloat(treble);
    if (ear !== null) adj.ear = parseFloat(ear);
    return {
      kind: "hangout-graph-url",
      category,
      rigId,
      baseUrl: `https://graph.hangout.audio/${category}/${rigId}/`, // the base path for config.js and data/
      models: parseModels(searchParams.get("share")),
      adjustments: adj,
    };
  }

  // Raw file by extension
  const e = ext(pathname);
  if (RAW_EXTS.has(e)) {
    return { kind: "raw-measurement-file-url", ext: e as "txt" | "csv" | "tsv", url: input.trim() };
  }

  return {
    kind: "unsupported-url",
    reason: `Unrecognized host "${hostname}". Supported: *.squig.link, *.github.io, graph.hangout.audio, or direct .txt/.csv/.tsv URLs.`,
  };
}

export function sourceLabel(src: ParsedSourceUrl): string {
  switch (src.kind) {
    case "squiglink-share-url":
      return src.models.map((m) => m.label).join(", ") || src.host;
    case "hangout-graph-url":
      return src.models.map((m) => m.label).join(", ") || `${src.category}/${src.rigId}`;
    case "raw-measurement-file-url":
      return src.url.split("/").pop() ?? src.url;
    case "unsupported-url":
      return "Unsupported URL";
  }
}
