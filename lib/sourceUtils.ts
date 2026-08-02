import type { Trace } from "@/types/audio";

const REVIEWER_MAP: Record<string, string> = {
  "precog": "Precogvision",
  "crinacle": "Crinacle",
  "superreview": "Super*Review",
  "super_review": "Super*Review",
  "jaytiss": "Jaytiss",
  "jaysaudio": "Jay's Audio",
  "jays_audio": "Jay's Audio",
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
  "joycesreview": "Joyce's Review",
  "joycereviews": "Joyce's Review",
  "joycereview": "Joyce's Review",
  "joyce": "Joyce's Review",
  "csi": "CSI-Zone",
};

export function getReviewerName(trace: Trace): string {
  if (!trace.source) return "";
  if (trace.source.kind === "squiglink-share-url") {
    let key = trace.source.host.replace(".squig.link", "").replace(".github.io", "").toLowerCase();
    
    // If apex domain squig.link or sub-folder structure (e.g. squig.link/lab/joycesreview/)
    if (key === "squig.link" || key === "github.io" || key === "squig" || key === "www" || !key) {
      try {
        const url = new URL(trace.source.baseUrl);
        const parts = url.pathname.split("/").filter((p) => p && !p.endsWith(".html"));
        if (parts.length > 0) {
          // Take the last path segment (e.g. /lab/joycesreview -> joycesreview)
          key = parts[parts.length - 1].toLowerCase();
        }
      } catch {}
    }

    if (REVIEWER_MAP[key]) return REVIEWER_MAP[key];
    if (key && key !== "squig.link" && key !== "github.io" && key !== "lab") {
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
