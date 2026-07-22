"use client";

import { useState, useEffect } from "react";
import type { Trace } from "@/types/audio";
import { getReviewerName } from "@/lib/sourceUtils";

export interface ExportOptions {
  aspectRatio: "16:9" | "1:1" | "4:3";
  exportTheme: "dark" | "light";
  includeSourceCredit: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  traces: Trace[];
  currentTheme: "dark" | "light";
  onExport: (options: ExportOptions) => Promise<void>;
  generatePreview: (options: ExportOptions) => Promise<string | null>;
  isExporting: boolean;
}

export function ExportStudioModal({
  isOpen,
  onClose,
  traces,
  currentTheme,
  onExport,
  generatePreview,
  isExporting,
}: Props) {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");
  const [exportTheme, setExportTheme] = useState<"dark" | "light">(currentTheme);
  const [includeSourceCredit, setIncludeSourceCredit] = useState(true);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const visibleTraces = traces.filter((t) => t.visible);
  const reviewers = Array.from(new Set(visibleTraces.map(getReviewerName).filter(Boolean)));

  // Generate live preview whenever options change
  useEffect(() => {
    if (!isOpen || visibleTraces.length === 0) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsGeneratingPreview(true);
      try {
        const url = await generatePreview({
          aspectRatio,
          exportTheme,
          includeSourceCredit,
        });
        if (isMounted) setPreviewUrl(url);
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        if (isMounted) setIsGeneratingPreview(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, aspectRatio, exportTheme, includeSourceCredit, generatePreview, visibleTraces.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onExport({ aspectRatio, exportTheme, includeSourceCredit });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-xl border shadow-2xl p-6 transition-all max-h-[90vh] flex flex-col ${
          currentTheme === "light"
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-[#151923] border-slate-800 text-slate-100"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <div>
              <h2 className="text-base font-semibold">PNG Export Studio</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Live preview, aspect ratios, theme modes & reviewer credits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Body (2 Columns on MD+) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 overflow-y-auto pr-1">
          {/* Left Column: Live Preview Window */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Live Graphic Preview
            </label>
            <div
              className={`w-full rounded-lg border overflow-hidden flex items-center justify-center min-h-[220px] max-h-[300px] relative transition-colors ${
                exportTheme === "light"
                  ? "bg-white border-slate-300"
                  : "bg-[#0d0f14] border-slate-800"
              }`}
            >
              {isGeneratingPreview && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900/90 text-xs text-slate-200 shadow">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    Updating Preview...
                  </div>
                </div>
              )}

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Export Preview"
                  className="max-w-full max-h-full object-contain shadow-sm"
                />
              ) : (
                <div className="text-xs text-[var(--text-muted)] p-4 text-center">
                  {visibleTraces.length === 0
                    ? "No visible traces loaded"
                    : "Generating live preview..."}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] text-center">
              Rendered in <span className="font-semibold">{exportTheme === "dark" ? "Dark Mode" : "Light Mode"}</span> ({aspectRatio})
            </p>
          </div>

          {/* Right Column: Customization Controls */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Aspect Ratio Selector */}
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Aspect Ratio Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "16:9", label: "16:9", desc: "YouTube / Web" },
                  { id: "1:1", label: "1:1", desc: "Social Media" },
                  { id: "4:3", label: "4:3", desc: "Forum Embed" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAspectRatio(preset.id as any)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-colors ${
                      aspectRatio === preset.id
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold"
                        : currentTheme === "light"
                        ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        : "border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span className="text-sm font-bold">{preset.label}</span>
                    <span className="text-[10px] opacity-70 mt-0.5">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Style Toggle */}
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Export Theme Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dark", label: "🌙 Dark Mode" },
                  { id: "light", label: "☀️ Light Mode" },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setExportTheme(style.id as any)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      exportTheme === style.id
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold"
                        : currentTheme === "light"
                        ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        : "border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reviewer Credit Toggle */}
            {reviewers.length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <input
                  type="checkbox"
                  id="include-source-credit"
                  checked={includeSourceCredit}
                  onChange={(e) => setIncludeSourceCredit(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-indigo-500 rounded cursor-pointer"
                />
                <label htmlFor="include-source-credit" className="text-xs text-[var(--text-secondary)] cursor-pointer select-none leading-relaxed">
                  Include Reviewer Credit: <span className="font-semibold text-indigo-400 block">{reviewers.join(", ")}</span>
                </label>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExporting || visibleTraces.length === 0}
                className="btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <span>📸</span> Export PNG ({aspectRatio})
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
