"use client";

import { useState } from "react";
import Link from "next/link";
import { TutorialSidebar } from "./TutorialSidebar";
import { parseSourceUrl } from "@/lib/parseSourceUrl";
import type { ParsedSourceUrl } from "@/types/audio";

const URL_PATTERNS = {
  supported: [
    {
      title: "Squig.link Share URL",
      example: "https://precog.squig.link/?share=Precog_Target,TruthEars_Gate",
      note: "Standard Squig.link database share link. FreqRes automatically parses shared models and fetches raw measurement curves.",
    },
    {
      title: "AudioAmigo / Reviewer Subdomains",
      example: "https://audioamigo.squig.link/?share=Truthear_Gate",
      note: "Supports all reviewer subdomains hosted on *.squig.link.",
    },
    {
      title: "Path-Based Squig Share URLs",
      example: "https://squig.link/superreview/?share=Truthear_Gate",
      note: "Path-based reviewer databases on apex squig.link (e.g. Super*Review, Jaytiss).",
    },
    {
      title: "Joyce's Review & Nested Lab Databases",
      example: "https://squig.link/lab/joycesreview/?share=CVJ_NOZOMI",
      note: "Nested lab databases on squig.link (e.g. Joyce's Review) with automatic reviewer attribution.",
    },
  ],
  raw: [
    {
      title: "Direct .txt Measurement File",
      example: "https://raw.githubusercontent.com/orgs/crinacle/measurements/Truthear_Gate.txt",
      note: "Direct link to plain-text measurement file with frequency and dB columns.",
    },
    {
      title: "Direct .csv Measurement File",
      example: "https://example.com/measurements/headphone_fr.csv",
      note: "Comma-separated values with frequency and SPL columns.",
    },
    {
      title: "Direct .tsv Measurement File",
      example: "https://example.com/measurements/headphone_fr.tsv",
      note: "Tab-separated values file.",
    },
  ],
  unsupported: [
    {
      title: "Hangout Audio Graph URL",
      example: "https://graph.hangout.audio/iem/5128/?share=JM-1_Target,Rockies",
      note: "Does not expose public raw curve files on this endpoint.",
    },
    {
      title: "CSI-Zone / Malformed Data",
      example: "https://csi-zone.squig.link/?share=Tanchjim_Nora",
      note: "Contains unsorted frequencies or broken CSV headers causing parsing errors.",
    },
    {
      title: "Earphones Archive",
      example: "https://earphonesarchive.squig.link/?share=Tanchjim_Nora",
      note: "Irregular data structures that fail validation checks.",
    },
  ],
};

const PARSE_ERRORS = [
  { code: "HTML_RESPONSE", fix: "URL points to an HTML webpage instead of a raw data file. Find the direct file link." },
  { code: "NO_VALID_ROWS", fix: "No parseable frequency/dB data rows found. Check column headers or text encoding." },
  { code: "TOO_FEW_POINTS", fix: "Fewer than 10 valid data points found. Ensure sweep is complete." },
  { code: "UNSUPPORTED_BINARY_CONTENT", fix: "File is binary (e.g. REW .mdat). Export as .txt or .csv from REW first." },
  { code: "FETCH_ERROR", fix: "Network or CORS restriction. Ensure URL is publicly accessible." },
];

export function GuideContent() {
  const [activeTab, setActiveTab] = useState<"supported" | "raw" | "unsupported">("supported");
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<ParsedSourceUrl | null>(null);

  const handleTestUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) return;
    const res = parseSourceUrl(testUrl.trim());
    setTestResult(res);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[var(--bg-base)]">
      <TutorialSidebar />

      <main className="flex-1 overflow-y-auto scroll-smooth px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-[var(--border-subtle)]">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Guide & Documentation
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Understanding graph features, URL compatibility, trace management, and troubleshooting.
          </p>
        </div>

        {/* Live URL Compatibility Checker */}
        <section id="url-checker" className="mb-10 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-sm font-semibold mb-1 text-[var(--text-primary)] uppercase tracking-wider">
            URL Compatibility Checker
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Paste any Squig.link or raw file URL to instantly test if FreqRes can parse it.
          </p>
          <form onSubmit={handleTestUrl} className="flex gap-2">
            <input
              type="text"
              placeholder="Paste graph URL or .txt link..."
              value={testUrl}
              onChange={(e) => {
                setTestUrl(e.target.value);
                setTestResult(null);
              }}
              className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500"
            />
            <button type="submit" className="btn-primary px-4 py-2 text-xs font-semibold shrink-0">
              Check URL
            </button>
          </form>

          {testResult && (
            <div className="mt-3 p-3 rounded-lg border text-xs bg-[var(--bg-base)] border-[var(--border-subtle)]">
              {testResult.kind === "squiglink-share-url" && (
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <span>[Supported]</span> Valid Squig.link share URL ({testResult.host})
                </div>
              )}
              {testResult.kind === "raw-measurement-file-url" && (
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <span>[Supported]</span> Direct raw measurement file ({testResult.ext.toUpperCase()})
                </div>
              )}
              {testResult.kind === "hangout-graph-url" && (
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <span>[Unsupported]</span> Hangout Audio URL (No direct curve files available)
                </div>
              )}
              {testResult.kind === "unsupported-url" && (
                <div className="flex items-center gap-2 text-rose-400 font-medium">
                  <span>[Unsupported]</span> {testResult.reason}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Feature Cards Grid */}
        <section id="features-overview" className="mb-10">
          <h2 className="text-base font-semibold mb-4 text-[var(--text-primary)]">
            Core Features & Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                Graph & Axis Engine
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Logarithmic 20Hz–20kHz frequency scale with 4-directional plot borders. Smooth desktop scroll-wheel zooming centered on your cursor with region focus presets (Bass, Mids, Treble).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                Tuning Targets & Compensation
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Overlay Harman IE 2019, IEF Neutral, Diffuse Field, or B&K 5128 targets. Toggle Compensation Mode to flatten the target line into a 0dB baseline and evaluate +/- dB deltas instantly.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                A/B Difference & Channel Imbalance
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Calculates decibel deltas between traces at key frequencies. Comparing Left (L) and Right (R) channel curves automatically activates Channel Imbalance Mode and measures max dB variance across the spectrum.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                Default Average & Per-Trace L/R Toggle
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Imports default to clean single Average curves. Each active trace features a 1-click "Avg to L/R" and "L/R to Avg" toggle to split into Left and Right channel traces or merge back on demand.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                PNG Export Studio
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Generate high-resolution PNG graph screenshots with live preview windows, aspect ratios (16:9, 1:1, 4:3), theme styles (Dark/Light mode), and reviewer attribution credits.
              </p>
            </div>
          </div>
        </section>

        {/* URL Compatibility Explorer (Segmented Tabs) */}
        <section id="url-patterns" className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              URL Patterns & Data Ingestion
            </h2>
            <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)]">
              {[
                { id: "supported", label: "Supported Graphs" },
                { id: "raw", label: "Raw Files" },
                { id: "unsupported", label: "Unsupported" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {URL_PATTERNS[activeTab].map((item) => (
              <div key={item.title} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{item.title}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                      activeTab === "supported"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : activeTab === "raw"
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {activeTab === "supported" ? "Supported" : activeTab === "raw" ? "Raw File" : "Unsupported"}
                  </span>
                </div>
                <code className="block text-[11px] px-3 py-1.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-slate-300 font-mono break-all mb-2">
                  {item.example}
                </code>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trace Controls & Shortcuts */}
        <section id="managing-traces" className="mb-10 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-base font-semibold mb-3 text-[var(--text-primary)]">
            Trace Controls & Shortcuts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span>Per-Trace Channel Toggle</span>
              <kbd className="px-2 py-0.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">Avg ⇄ L/R</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span>Toggle Trace Visibility</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">1 - 9</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span>Undo Removal / Change</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + Z</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span>Redo Change</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + Y</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span>Share Workspace Link</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">Ctrl + S</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <span>Attach Notes to Trace</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px]">✎ Icon</kbd>
            </div>
          </div>
        </section>

        {/* Troubleshooting & Parse Failures */}
        <section id="parse-failures" className="mb-10">
          <h2 className="text-base font-semibold mb-3 text-[var(--text-primary)]">
            Troubleshooting & Parse Errors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PARSE_ERRORS.map((e) => (
              <div key={e.code} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-block mb-1.5">
                  {e.code}
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {e.fix}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback Section */}
        <section id="feedback" className="mb-8 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Feedback & Issue Tracking</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Report parsing bugs, request new tuning targets, or suggest features on GitHub.
            </p>
          </div>
          <a
            href="https://github.com/jaermaine/freqres-visualizer-dashboard/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs font-semibold px-4 py-2 shrink-0"
          >
            Open GitHub Issue
          </a>
        </section>

        <div className="pb-8">
          <Link href="/" className="btn-primary inline-block text-xs font-semibold px-4 py-2">
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
