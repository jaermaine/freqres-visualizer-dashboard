import type { Trace } from "@/types/audio";

const REVIEWER_MAP: Record<string, string> = {
  "precog": "Precogvision",
  "crinacle": "Crinacle",
  "superreview": "Super*Review",
  "super_review": "Super*Review",
  "jaytiss": "Jaytiss",
  "hbb": "HawaiiBadBoy (HBB)",
  "hawaiibadboy": "HawaiiBadBoy (HBB)",
  "gizmosaudio": "GizAudio",
  "vsg": "VSG (TechPowerUp)",
  "hangout": "Hangout Audio",
  "audioamigo": "AudioAmigo",
  "banbeu": "Banbeu",
  "krn": "KRN Reviews",
  "tgx": "TGX",
  "venerable": "Venerable",
  "mmagical": "MMagical",
};

export function getReviewerName(trace: Trace): string {
  if (!trace.source) return "";
  if (trace.source.kind === "squiglink-share-url") {
    let key = trace.source.host.replace(".squig.link", "").toLowerCase();
    if (key === "squig.link" || key === "squig" || !key) {
      try {
        const url = new URL(trace.source.baseUrl);
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length > 0) {
          key = parts[0].toLowerCase();
        }
      } catch {}
    }
    if (REVIEWER_MAP[key]) return REVIEWER_MAP[key];
    if (key && key !== "squig.link") {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    return "Squig.link";
  }
  if (trace.source.kind === "hangout-graph-url") {
    return "Hangout Audio";
  }
  if (trace.source.kind === "raw-measurement-file-url") {
    try {
      const url = new URL(trace.source.url);
      if (url.hostname.includes("github")) return "GitHub Raw";
      return url.hostname;
    } catch {
      return "Raw File";
    }
  }
  return "";
}

export function getTraceSourceLabel(trace: Trace): string {
  return getReviewerName(trace);
}
